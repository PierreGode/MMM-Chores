const Log        = require("logger");
const NodeHelper = require("node_helper");
const express    = require("express");
const bodyParser = require("body-parser");
const path       = require("path");
const fs         = require("fs");
const https      = require("https");
const { exec }   = require("child_process");

let LANGUAGES = {};
try {
  // Reuse the same translations as the admin UI when running in Node.
  LANGUAGES = require(path.join(__dirname, "public", "lang.js"));
} catch (err) {
  Log.warn("MMM-Chores: Failed to load translations for backend notifications", err);
  LANGUAGES = {};
}

// Use built-in fetch if available (Node 18+) otherwise fall back to node-fetch
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

let openaiLoaded = true;
let OpenAI;
try {
  OpenAI = require("openai").OpenAI;
} catch (err) {
  openaiLoaded = false;
}

const DATA_FILE     = path.join(__dirname, "data.json");
const DATA_FILE_BAK = `${DATA_FILE}.bak`;
const COINS_FILE    = path.join(__dirname, "rewards.json");
const COINS_FILE_BAK = `${COINS_FILE}.bak`;
const CERT_DIR      = path.join(__dirname, "certs");

let tasks = [];
let people = [];
let analyticsBoards = [];
let coinStore = {
  settings: {
    useCoinSystem: false,
    taskCoinRules: []
  },
  rewards: [],
  redemptions: [],
  peopleCoins: {}
};
let sessions = {};
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
let legacyCoinState = null;

const DEFAULT_TITLES = [
  "Junior",
  "Apprentice",
  "Journeyman",
  "Experienced",
  "Expert",
  "Veteran",
  "Master",
  "Grandmaster",
  "Legend",
  "Mythic"
];

function getLanguageStrings(langCode) {
  const fallback = LANGUAGES.en || {};
  if (!langCode || typeof langCode !== "string") return fallback;
  const normalized = langCode.split("-")[0];
  return LANGUAGES[normalized] || fallback;
}

function formatTemplate(template, values = {}) {
  if (typeof template !== "string") return "";
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

const DEFAULT_PUSHOVER_CONFIG_ERROR = "Please set pushoverApiKey and pushoverUser in config.js to use Pushover notifications.";

let settings = {};
let autoUpdateTimer = null;
let reminderTimer = null;
let lastGeneratedTaskId = 0;

function applyLoadedData(json, sourceLabel = "data.json") {
  legacyCoinState = legacyCoinState || { rewards: [], redemptions: [], settings: {}, peopleCoins: {} };
  const legacyPeopleCoins = legacyCoinState.peopleCoins || {};
  tasks = json.tasks || [];
  if (tasks.some(t => t.order !== undefined)) {
    tasks.sort((a, b) => {
      if (a.deleted && !b.deleted) return 1;
      if (!a.deleted && b.deleted) return -1;
      return (a.order || 0) - (b.order || 0);
    });
  }
  let order = 0;
  tasks.forEach(t => {
    if (t.deleted) {
      delete t.order;
    } else {
      t.order = order++;
    }
  });

  initializeSeriesMetadata();

  people = (json.people || []).map(person => {
    const clone = { ...person };
    if (clone.points !== undefined) {
      legacyPeopleCoins[clone.id] = clone.points;
      delete clone.points;
    }
    if (clone._savedPoints !== undefined) {
      if (legacyPeopleCoins[clone.id] === undefined) {
        legacyPeopleCoins[clone.id] = clone._savedPoints;
      }
      delete clone._savedPoints;
    }
    return clone;
  });
  legacyCoinState.peopleCoins = legacyPeopleCoins;
  analyticsBoards = json.analyticsBoards || [];
  if (Array.isArray(json.rewards) && json.rewards.length) {
    legacyCoinState.rewards = json.rewards;
  }
  if (Array.isArray(json.redemptions) && json.redemptions.length) {
    legacyCoinState.redemptions = json.redemptions;
  }

  settings = { ...(json.settings || {}) };
  if (settings.openaiApiKey !== undefined) delete settings.openaiApiKey;
  if (settings.pushoverApiKey !== undefined) delete settings.pushoverApiKey;
  if (settings.pushoverUser !== undefined) delete settings.pushoverUser;

  if (settings.usePointSystem !== undefined) {
    legacyCoinState.settings = legacyCoinState.settings || {};
    legacyCoinState.settings.useCoinSystem = settings.usePointSystem;
    delete settings.usePointSystem;
  }
  if (Array.isArray(settings.taskPointsRules)) {
    legacyCoinState.settings = legacyCoinState.settings || {};
    legacyCoinState.settings.taskCoinRules = settings.taskPointsRules;
    delete settings.taskPointsRules;
  }
  if (settings.taskCoinRules) {
    delete settings.taskCoinRules;
  }

  updatePeopleLevels({});

  Log.log(
    `MMM-Chores: Loaded ${tasks.length} tasks, ${people.length} people, ${analyticsBoards.length} analytics boards from ${sourceLabel}`
  );
}

function writeDataFileAtomic(filePath, contents) {
  const dir = path.dirname(filePath);
  const tmpName = `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tmpPath = path.join(dir, tmpName);
  const fd = fs.openSync(tmpPath, "w");
  try {
    fs.writeFileSync(fd, contents, { encoding: "utf8" });
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch (cleanupErr) {
      Log.error("MMM-Chores: Failed to remove temporary data file", cleanupErr);
    }
    throw err;
  }
}

function getLocalISO(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, -1);
}

function normalizeBooleanInput(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return Boolean(value);
}

function getSeriesId(task) {
  if (!task) return null;
  return task.seriesId || task.id;
}

function getNextSeriesAnchorValue() {
  let maxAnchor = -1;
  tasks.forEach(task => {
    if (!task || task.deleted) return;
    const anchor = typeof task.seriesAnchor === 'number' ? task.seriesAnchor : task.order;
    if (typeof anchor === 'number' && anchor > maxAnchor) {
      maxAnchor = anchor;
    }
  });
  return maxAnchor + 1;
}

function setSeriesAnchorForSeries(seriesId, anchor) {
  tasks.forEach(task => {
    if (getSeriesId(task) === seriesId) {
      task.seriesAnchor = anchor;
    }
  });
}

function ensureTaskSeriesMetadata(task, fallbackAnchor) {
  if (!task) return;
  if (!task.seriesId) {
    task.seriesId = task.id;
  }
  if (typeof task.seriesAnchor !== 'number') {
    const anchor = typeof fallbackAnchor === 'number' ? fallbackAnchor : getNextSeriesAnchorValue();
    task.seriesAnchor = anchor;
  }
}

function initializeSeriesMetadata() {
  const anchorBySeries = new Map();
  let nextAnchor = 0;

  tasks.forEach(task => {
    if (!task) return;
    if (!task.seriesId) {
      task.seriesId = task.id;
    }
    if (task.deleted) return;
    const seriesId = getSeriesId(task);
    if (!anchorBySeries.has(seriesId)) {
      if (typeof task.seriesAnchor === 'number') {
        anchorBySeries.set(seriesId, task.seriesAnchor);
        nextAnchor = Math.max(nextAnchor, task.seriesAnchor + 1);
      } else {
        anchorBySeries.set(seriesId, nextAnchor++);
      }
    }
  });

  tasks.forEach(task => {
    if (!task) return;
    if (!task.seriesId) task.seriesId = task.id;
    const seriesId = getSeriesId(task);
    if (anchorBySeries.has(seriesId)) {
      task.seriesAnchor = anchorBySeries.get(seriesId);
    }
  });

  lastGeneratedTaskId = tasks.reduce((max, task) => {
    const numericId = Number(task?.id);
    if (!Number.isFinite(numericId)) return max;
    return Math.max(max, numericId);
  }, lastGeneratedTaskId || 0);
}

function generateTaskId() {
  const now = Date.now();
  if (now <= lastGeneratedTaskId) {
    lastGeneratedTaskId += 1;
    return lastGeneratedTaskId;
  }
  lastGeneratedTaskId = now;
  return now;
}

function getSortableDateKey(value) {
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10);
  }
  return '9999-12-31';
}

function compareTasksForOrdering(a, b) {
  if (a.deleted && !b.deleted) return 1;
  if (!a.deleted && b.deleted) return -1;

  const anchorA = typeof a.seriesAnchor === 'number' ? a.seriesAnchor : (a.order || 0);
  const anchorB = typeof b.seriesAnchor === 'number' ? b.seriesAnchor : (b.order || 0);
  if (anchorA !== anchorB) return anchorA - anchorB;

  const doneA = Boolean(a.done);
  const doneB = Boolean(b.done);
  if (doneA !== doneB) {
    return doneA ? 1 : -1;
  }

  const dateA = getSortableDateKey(a.date);
  const dateB = getSortableDateKey(b.date);
  if (dateA !== dateB) return dateA.localeCompare(dateB);

  const createdA = a.created || '';
  const createdB = b.created || '';
  if (createdA !== createdB) return createdA.localeCompare(createdB);

  const idA = Number(a.id) || 0;
  const idB = Number(b.id) || 0;
  return idA - idB;
}

function scheduleAutoUpdate() {
  if (!settings.autoUpdate) return;
  if (autoUpdateTimer) clearTimeout(autoUpdateTimer);
  const now = new Date();
  const next = new Date(now);
  next.setHours(4, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  const delay = next - now;
  Log.log(`Auto update scheduled for ${next.toString()}`);
  autoUpdateTimer = setTimeout(() => {
    autoUpdateTimer = null;
    runAutoUpdate();
  }, delay);
}

function scheduleReminder(self) {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
  if (!settings.reminderTime || !settings.pushoverEnabled) return;
  const t = getLanguageStrings(settings.language);
  const configError = t.pushoverConfigError || DEFAULT_PUSHOVER_CONFIG_ERROR;
  if (!self.config || !self.config.pushoverApiKey || !self.config.pushoverUser) {
    Log.error("MMM-Chores: pushoverApiKey and pushoverUser must be set in config.js when Pushover is enabled");
    self.sendSocketNotification("PUSHOVER_CONFIG_ERROR", configError);
    return;
  }
  const [h, m] = settings.reminderTime.split(":").map(n => parseInt(n, 10));
  if (isNaN(h) || isNaN(m)) return;
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  const delay = next - now;
  Log.log(`Pushover reminder scheduled for ${next.toString()}`);
  reminderTimer = setTimeout(() => {
    reminderTimer = null;
    const todayStr = getLocalISO(new Date()).slice(0, 10);
    const unfinished = tasks.filter(
      t => !t.done && !t.deleted && t.date && t.date <= todayStr
    );
    if (unfinished.length) {
      const list = unfinished.map(t => `• ${t.name}`).join("\n");
      const header = t.pushoverUnfinishedTitle || "Uncompleted tasks:";
      sendPushover(self, settings, `${header}\n${list}`);
    }
    scheduleReminder(self);
  }, delay);
}

function sendPushover(self, settings, message) {
  const config = self.config || {};
  if (!settings.pushoverEnabled) return;
  const t = getLanguageStrings(settings.language);
  const configError = t.pushoverConfigError || DEFAULT_PUSHOVER_CONFIG_ERROR;
  if (!config.pushoverApiKey || !config.pushoverUser) {
    Log.error("MMM-Chores: pushoverApiKey and pushoverUser must be set in config.js when Pushover is enabled");
    self.sendSocketNotification("PUSHOVER_CONFIG_ERROR", configError);
    return;
  }
  const params = new URLSearchParams({
    token: config.pushoverApiKey,
    user: config.pushoverUser,
    message
  });
  fetchFn("https://api.pushover.net/1/messages.json", {
    method: "POST",
    body: params
  }).catch(err => Log.error("MMM-Chores: Failed to send Pushover notification", err));
}

function loadData() {
  let generalLoaded = false;
  if (fs.existsSync(DATA_FILE)) {
    Log.log("loadData: reading", DATA_FILE);
    try {
      const j = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      applyLoadedData(j);
      generalLoaded = true;
    } catch (e) {
      Log.error("MMM-Chores: Error reading data.json:", e);
    }
  }

  if (!generalLoaded && fs.existsSync(DATA_FILE_BAK)) {
    try {
      const backup = JSON.parse(fs.readFileSync(DATA_FILE_BAK, "utf8"));
      applyLoadedData(backup, "data.json.bak");
      generalLoaded = true;
    } catch (backupErr) {
      Log.error("MMM-Chores: Failed to load backup data file:", backupErr);
    }
  }

  if (!generalLoaded) {
    applyLoadedData({}, "defaults");
  }

  loadCoinData();
}

function applyCoinStoreData(data, sourceLabel = "rewards.json") {
  const coinSettings = data?.settings || {};
  coinStore = {
    settings: {
      useCoinSystem: coinSettings.useCoinSystem ?? false,
      taskCoinRules: Array.isArray(coinSettings.taskCoinRules) ? coinSettings.taskCoinRules : []
    },
    rewards: Array.isArray(data?.rewards) ? data.rewards : [],
    redemptions: Array.isArray(data?.redemptions) ? data.redemptions : [],
    peopleCoins: data?.peopleCoins || {}
  };

  settings.useCoinSystem = coinStore.settings.useCoinSystem ?? false;
  settings.usePointSystem = settings.useCoinSystem;
  settings.taskCoinRules = coinStore.settings.taskCoinRules;
  settings.taskPointsRules = settings.taskCoinRules; // backwards compatibility for older clients

  syncPeopleCoinsFromStore();

  Log.log(
    `MMM-Chores: Loaded coin data (${coinStore.rewards.length} rewards, ${coinStore.redemptions.length} redemptions) from ${sourceLabel}`
  );
}

function syncPeopleCoinsFromStore() {
  const coins = coinStore.peopleCoins || {};
  people.forEach(person => {
    const value = coins[person.id];
    const normalized = Number.isFinite(value) ? value : parseInt(value, 10);
    const safe = Number.isFinite(normalized) ? normalized : 0;
    person.points = safe;
    coins[person.id] = safe;
  });
  coinStore.peopleCoins = coins;
}

function updateCoinStoreFromPeople() {
  const coins = {};
  people.forEach(person => {
    const normalized = Number(person.points);
    coins[person.id] = Number.isFinite(normalized) ? normalized : 0;
  });
  coinStore.peopleCoins = coins;
}

function buildCoinStoreFromLegacy() {
  const legacySettings = legacyCoinState?.settings || {};
  const peopleCoins = { ...(legacyCoinState?.peopleCoins || {}) };
  people.forEach(person => {
    if (peopleCoins[person.id] === undefined) {
      peopleCoins[person.id] = calculatePersonPoints(person.id);
    }
  });
  return {
    settings: {
      useCoinSystem: legacySettings.useCoinSystem ?? false,
      taskCoinRules: Array.isArray(legacySettings.taskCoinRules) ? legacySettings.taskCoinRules : []
    },
    rewards: legacyCoinState?.rewards || [],
    redemptions: legacyCoinState?.redemptions || [],
    peopleCoins
  };
}

function loadCoinData() {
  let loaded = false;
  if (fs.existsSync(COINS_FILE)) {
    try {
      const j = JSON.parse(fs.readFileSync(COINS_FILE, "utf8"));
      applyCoinStoreData(j);
      loaded = true;
    } catch (err) {
      Log.error("MMM-Chores: Error reading rewards.json:", err);
    }
  }

  if (!loaded && fs.existsSync(COINS_FILE_BAK)) {
    try {
      const backup = JSON.parse(fs.readFileSync(COINS_FILE_BAK, "utf8"));
      applyCoinStoreData(backup, "rewards.json.bak");
      loaded = true;
    } catch (err) {
      Log.error("MMM-Chores: Failed to load rewards backup:", err);
    }
  }

  if (!loaded) {
    const legacyCoinStore = buildCoinStoreFromLegacy();
    applyCoinStoreData(legacyCoinStore, "legacy data");
    persistCoinData();
  }
}

function sanitizeGeneralSettingsForSave() {
  const snapshot = { ...settings };
  delete snapshot.useCoinSystem;
  delete snapshot.usePointSystem;
  delete snapshot.taskCoinRules;
  delete snapshot.taskPointsRules;
  return snapshot;
}

function buildGeneralDataSnapshot() {
  return {
    tasks,
    people: people.map(({ points, ...rest }) => ({ ...rest })),
    analyticsBoards,
    settings: sanitizeGeneralSettingsForSave()
  };
}

function persistCoinData() {
  updateCoinStoreFromPeople();
  coinStore.settings.useCoinSystem = settings.useCoinSystem ?? coinStore.settings.useCoinSystem ?? false;
  coinStore.settings.taskCoinRules = settings.taskCoinRules || coinStore.settings.taskCoinRules || [];
  const coinPayload = JSON.stringify(coinStore, null, 2);
  if (fs.existsSync(COINS_FILE)) {
    try {
      fs.copyFileSync(COINS_FILE, COINS_FILE_BAK);
    } catch (err) {
      Log.error("MMM-Chores: Failed to create rewards backup:", err);
    }
  }
  writeDataFileAtomic(COINS_FILE, coinPayload);
}

function saveData() {
  try {
    Log.log("saveData: writing", DATA_FILE);
    const payload = JSON.stringify(buildGeneralDataSnapshot(), null, 2);
    if (fs.existsSync(DATA_FILE)) {
      try {
        fs.copyFileSync(DATA_FILE, DATA_FILE_BAK);
      } catch (backupErr) {
        Log.error("MMM-Chores: Failed to create backup data file:", backupErr);
      }
    }
    writeDataFileAtomic(DATA_FILE, payload);
    persistCoinData();
    Log.log(
      `MMM-Chores: Saved ${tasks.length} tasks, ${people.length} people, ${analyticsBoards.length} analytics boards, ${coinStore.rewards.length} coin rewards, ${coinStore.redemptions.length} redemptions, language: ${settings.language}`
    );
    return true;
  } catch (e) {
    Log.error("MMM-Chores: Error writing data.json:", e);
    return false;
  }
}

function runAutoUpdate() {
  Log.log("Auto update: running git pull");
  exec("git pull", { cwd: __dirname }, (err, stdout) => {
    if (err) {
      Log.error("Auto update failed:", err);
    } else {
      Log.log("Auto update output: " + stdout.trim());
      if (!stdout.includes("Already up to date")) {
        Log.log("Auto update applied, reloading module...");
        process.exit(0);
        return;
      } else {
        Log.log("Auto update: already up to date");
      }
    }
    if (settings.autoUpdate) {
      scheduleAutoUpdate();
    }
  });
}

function computeLevel(config, personId = null) {
  const lvlConf = config.leveling || {};
  if (lvlConf.enabled === false) return 1;
  const mode = lvlConf.mode || 'years';
  const max = 100;
  const done = tasks.filter(t => t.done && (!personId || t.assignedTo === personId)).length;
  let totalNeeded;
  if (mode === 'chores') {
    totalNeeded = parseFloat(lvlConf.choresToMaxLevel) || 1;
  } else {
    const years = parseFloat(lvlConf.yearsToMaxLevel) || 1;
    const perW = parseFloat(lvlConf.choresPerWeekEstimate) || 1;
    totalNeeded = years * 52 * perW;
  }
  const tasksPerLvl = totalNeeded / max;
  let lvl = Math.floor(done / tasksPerLvl) + 1;
  if (lvl < 1) lvl = 1;
  if (lvl > max) lvl = max;
  return lvl;
}

function getTitle(config, level, person = null) {
  let arr;
  if (
    person &&
    config.customLevelTitles &&
    Array.isArray(config.customLevelTitles[person.name]) &&
    config.customLevelTitles[person.name].length === 10
  ) {
    arr = config.customLevelTitles[person.name];
  } else if (
    Array.isArray(config.levelTitles) &&
    config.levelTitles.length === 10
  ) {
    arr = config.levelTitles;
  } else {
    arr = DEFAULT_TITLES;
  }
  const idx = Math.floor((level - 1) / 10);
  return arr[idx] || arr[arr.length - 1];
}

function getLevelInfo(config, person = null) {
  const personId = person ? person.id : null;
  const level = computeLevel(config, personId);
  const title = getTitle(config, level, person);
  return { level, title };
}

function updatePeopleLevels(config) {
  people = people.map(p => {
    const info = getLevelInfo(config, p);
    return { ...p, level: info.level, title: info.title };
  });
}

function applyTaskOrder() {
  Log.log(`applyTaskOrder: before ${tasks.length} tasks`);
  tasks.sort(compareTasksForOrdering);
  let idx = 0;
  tasks.forEach(t => {
    if (t.deleted) {
      delete t.order;
    } else {
      t.order = idx++;
    }
  });
  Log.log(`applyTaskOrder: after ${tasks.length} tasks`);
}

function broadcastTasks(helper) {
  // Match the admin portal's analytics logic by excluding tasks that are both
  // deleted and unfinished. Completed tasks remain even if deleted so that
  // historical analytics are consistent across the mirror and the admin page.
  Log.log(`broadcastTasks: start ${tasks.length} tasks`);
  const autoGenerated = ensureRecurringInstancesUpToToday();
  if (autoGenerated) {
    Log.log(`broadcastTasks: generated ${autoGenerated} recurring task instance(s)`);
  }
  applyTaskOrder();
  tasks.sort((a, b) => {
    if (a.deleted && !b.deleted) return 1;
    if (!a.deleted && b.deleted) return -1;
    return (a.order || 0) - (b.order || 0);
  });
  Log.log(`broadcastTasks: after sort ${tasks.length} tasks`);
  const analyticsData = tasks.filter(t => !(t.deleted && !t.done));

  updatePeopleLevels(helper.config || {});
  helper.sendSocketNotification("TASKS_UPDATE", tasks);
  helper.sendSocketNotification("CHORES_DATA", analyticsData);
  helper.sendSocketNotification("LEVEL_INFO", getLevelInfo(helper.config || {}));
  helper.sendSocketNotification("PEOPLE_UPDATE", people);
  helper.sendSocketNotification("REDEMPTIONS_UPDATE", coinStore.redemptions || []);
  const ok = saveData();
  Log.log(`broadcastTasks: saveData returned ${ok}`);
  return ok;
}

function normalizeRecurringStartDate(dateStr, recurring) {
  if (!dateStr || !recurring || recurring === "none") return dateStr;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  const isWeekend = day => day === 0 || day === 6;

  if (recurring === "weekdays") {
    while (isWeekend(d.getDay())) {
      d.setDate(d.getDate() + 1);
    }
  } else if (recurring === "weekends") {
    while (!isWeekend(d.getDay())) {
      d.setDate(d.getDate() + 1);
    }
  }

  return d.toISOString().slice(0, 10);
}

function getNextDate(dateStr, recurring) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const addDays = days => d.setDate(d.getDate() + days);
  const isWeekend = day => day === 0 || day === 6;

  if (recurring === "daily") {
    addDays(1);
  } else if (recurring === "weekly") {
    addDays(7);
  } else if (recurring === "weekdays") {
    // Advance to next weekday
    do {
      addDays(1);
    } while (isWeekend(d.getDay()));
  } else if (recurring === "weekends") {
    // Advance to next weekend day
    do {
      addDays(1);
    } while (!isWeekend(d.getDay()));
  } else if (recurring === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (recurring === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else if (recurring && recurring.startsWith("every_")) {
    // Custom recurring patterns: every_X_days, every_X_weeks, first_monday_month
    const parts = recurring.split("_");
    if (parts[1] === "X" && parts[2] === "days") {
      const days = parseInt(parts[3]) || 2;
      addDays(days);
    } else if (parts[1] === "X" && parts[2] === "weeks") {
      const weeks = parseInt(parts[3]) || 2;
      addDays(weeks * 7);
    } else if (recurring === "first_monday_month") {
      // First Monday of next month
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
      // Find first Monday
      while (d.getDay() !== 1) {
        addDays(1);
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

function createRecurringInstanceFromTask(templateTask, date) {
  if (!templateTask || !date) return null;
  ensureTaskSeriesMetadata(templateTask);

  const newTask = {
    id: generateTaskId(),
    name: templateTask.name,
    date,
    assignedTo: templateTask.assignedTo || null,
    recurring: templateTask.recurring,
    done: false,
    created: getLocalISO(new Date()),
    seriesId: getSeriesId(templateTask),
    seriesAnchor: templateTask.seriesAnchor
  };

  if (templateTask.points !== undefined) {
    newTask.points = templateTask.points;
  }
  if (templateTask.autoPointsRule) {
    newTask.autoPointsRule = templateTask.autoPointsRule;
  }
  if (newTask.points === undefined) {
    autoAssignTaskPoints(newTask);
  }

  tasks.push(newTask);
  return newTask;
}

function ensureRecurringInstancesUpToToday() {
  const today = getLocalISO(new Date()).slice(0, 10);
  const seriesMap = new Map();

  tasks.forEach(task => {
    if (!task || task.deleted) return;
    if (!task.recurring || task.recurring === "none") return;
    if (!task.date) return;
    const seriesId = getSeriesId(task);
    if (!seriesMap.has(seriesId)) {
      seriesMap.set(seriesId, { recurrence: task.recurring, tasks: [] });
    }
    seriesMap.get(seriesId).tasks.push(task);
  });

  let createdCount = 0;

  seriesMap.forEach(entry => {
    const seriesTasks = entry.tasks
      .filter(task => task && !task.deleted && task.date)
      .sort((a, b) => getSortableDateKey(a.date).localeCompare(getSortableDateKey(b.date)));
    if (!seriesTasks.length) return;

    const dateSet = new Set(seriesTasks.map(t => t.date));
    const lastTask = seriesTasks[seriesTasks.length - 1];
    if (!lastTask || !lastTask.date) return;
    if (lastTask.date >= today) return;

    let candidateDate = lastTask.date;
    let safety = 0;
    while (candidateDate < today && safety < 730) {
      const nextDate = getNextDate(candidateDate, entry.recurrence);
      if (!nextDate || nextDate === candidateDate) break;
      candidateDate = nextDate;
      safety += 1;
    }

    if (candidateDate <= lastTask.date) return;
    if (dateSet.has(candidateDate)) return;

    const newTask = createRecurringInstanceFromTask(lastTask, candidateDate);
    if (newTask) {
      createdCount += 1;
    }
  });

  return createdCount;
}

function performTemporaryDataFix() {
  const today = getLocalISO(new Date()).slice(0, 10);
  let duplicatesRemoved = 0;
  let archivedPast = 0;
  let globalDuplicatesRemoved = 0;
  let seriesTouched = 0;
  let completedPurged = 0;

  const recurringSeries = new Map();
  tasks.forEach(task => {
    if (!task || task.deleted) return;
    if (!task.recurring || task.recurring === "none") return;
    ensureTaskSeriesMetadata(task);
    const seriesId = getSeriesId(task);
    if (!recurringSeries.has(seriesId)) {
      recurringSeries.set(seriesId, []);
    }
    recurringSeries.get(seriesId).push(task);
  });

  recurringSeries.forEach(seriesTasks => {
    if (!Array.isArray(seriesTasks) || seriesTasks.length === 0) return;
    seriesTouched += 1;
    seriesTasks.sort((a, b) => getSortableDateKey(a.date).localeCompare(getSortableDateKey(b.date)));
    const seenDates = new Set();
    seriesTasks.forEach(task => {
      if (task.deleted || !task.date) return;
      const key = `${getSeriesId(task)}|${task.date}`;
      if (seenDates.has(key)) {
        task.deleted = true;
        duplicatesRemoved += 1;
      } else {
        seenDates.add(key);
      }
    });

    const hasUpcoming = seriesTasks.some(task => !task.deleted && task.date && task.date >= today);
    if (!hasUpcoming) {
      return;
    }

    seriesTasks.forEach(task => {
      if (task.deleted || task.done) return;
      if (!task.date || task.date >= today) return;
      task.deleted = true;
      archivedPast += 1;
    });
  });

  const globalKeyMap = new Map();
  tasks.forEach(task => {
    if (!task || task.deleted || task.done) return;
    if (!task.date) return;
    const key = [
      (task.name || "").trim().toLowerCase(),
      task.date,
      task.assignedTo || "__none__"
    ].join("|");
    if (!globalKeyMap.has(key)) {
      globalKeyMap.set(key, task);
      return;
    }
    const kept = globalKeyMap.get(key);
    const candidateCreated = task.created || "";
    const keptCreated = kept.created || "";
    const shouldReplace = candidateCreated < keptCreated;
    if (shouldReplace) {
      kept.deleted = true;
      globalDuplicatesRemoved += 1;
      globalKeyMap.set(key, task);
    } else {
      task.deleted = true;
      globalDuplicatesRemoved += 1;
    }
  });

  tasks.forEach(task => {
    if (!task || task.deleted) return;
    if (!task.done) return;
    if (!task.date) return;
    if (task.date >= today) return;
    task.deleted = true;
    completedPurged += 1;
  });

  return {
    duplicatesRemoved: duplicatesRemoved + globalDuplicatesRemoved,
    recurringDuplicatesRemoved: duplicatesRemoved,
    globalDuplicatesRemoved,
    archivedPast,
    seriesTouched,
    completedPurged,
    changed: duplicatesRemoved + archivedPast + globalDuplicatesRemoved + completedPurged
  };
}

function getMatchingTaskRule(taskName) {
  if (!taskName || !Array.isArray(settings.taskPointsRules)) return null;

  const normalized = `${taskName}`.toLowerCase();
  for (const rule of settings.taskPointsRules) {
    if (!rule || !rule.pattern) continue;
    const pattern = `${rule.pattern}`.toLowerCase();
    if (!pattern || !normalized.includes(pattern)) continue;

    const points = Number(rule.points);
    if (Number.isFinite(points) && points > 0) {
      return { pattern: rule.pattern, points };
    }
  }
  return null;
}

function autoAssignTaskPoints(task, options = {}) {
  if (!task || !task.name) return false;
  const { force = false } = options;
  const match = getMatchingTaskRule(task.name);

  if (!match) {
    if (force && task.autoPointsRule) {
      delete task.autoPointsRule;
    }
    return false;
  }

  const hasManualPoints = task.points !== undefined && !task.autoPointsRule;
  if (hasManualPoints && !force) return false;

  const changed = task.points !== match.points || task.autoPointsRule !== match.pattern;
  task.points = match.points;
  task.autoPointsRule = match.pattern;
  return changed;
}

function calculatePersonPoints(personId) {
  return tasks
    .filter(t => t.done && t.assignedTo === personId)
    .reduce((total, task) => {
      const value = Number(task.awardedPoints ?? task.points ?? 1) || 0;
      return total + value;
    }, 0);
}

function awardPointsForTask(task) {
  if (!task.done || !task.assignedTo) return;
  if (task.awardedPoints !== undefined) return;
  
  const person = people.find(p => p.id === task.assignedTo);
  if (!person) return;
  
  if (task.points === undefined) {
    autoAssignTaskPoints(task);
  }

  const points = Number(task.points) || 1;
  person.points = (person.points || 0) + points;
  task.awardedPoints = points;
  
  Log.log(`MMM-Chores: Awarded ${points} coins to ${person.name} for completing "${task.name}"`);
}

function revokePointsForTask(task) {
  if (!task.assignedTo) return;
  
  const person = people.find(p => p.id === task.assignedTo);
  if (!person) return;
  
  const points = Number(task.awardedPoints ?? task.points ?? 1) || 0;
  if (!points) return;
  person.points = Math.max(0, (person.points || 0) - points);
  delete task.awardedPoints;
  
  Log.log(`MMM-Chores: Removed ${points} coins from ${person.name} after undoing "${task.name}"`);
}

function migrateToPointSystem() {
  Log.log('MMM-Chores: Preparing coin system state...');
  syncPeopleCoinsFromStore();
  persistCoinData();
  Log.log('MMM-Chores: Coin system ready');
}

function migrateToLevelSystem() {
  Log.log('MMM-Chores: Switching to level display only (coins preserved)');
  persistCoinData();
  Log.log('MMM-Chores: Level system active with coins still accruing');
}

function sendRedemptionEmail(person, reward, redemption) {
  // Email functionality would need to be implemented based on available email service
  // For now, just log the email that would be sent
  Log.log(`MMM-Chores: Would send redemption email to ${person.name} for reward "${reward.name}"`);
  
  // TODO: Implement actual email sending based on configured email service
  // This could use nodemailer, sendgrid, or other email services
  
  redemption.emailSent = true;
}

module.exports = NodeHelper.create({
  start() {
    Log.log("MMM-Chores helper started...");
    loadData();
    if (settings.autoUpdate) {
      scheduleAutoUpdate();
    }
    scheduleReminder(this);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "INIT_SERVER") {
      this.config = payload;

      const previousSettings = (settings && typeof settings === "object") ? settings : {};
      const resolvedCoinToggle =
        previousSettings.useCoinSystem ??
        previousSettings.usePointSystem ??
        payload.useCoinSystem ??
        payload.usePointSystem ??
        false;

      settings = {
        ...previousSettings,
        language: previousSettings.language ?? payload.language,
        dateFormatting: previousSettings.dateFormatting ?? payload.dateFormatting,
        textMirrorSize: previousSettings.textMirrorSize ?? payload.textMirrorSize,
        showPast: previousSettings.showPast ?? payload.showPast,
        showAnalyticsOnMirror: previousSettings.showAnalyticsOnMirror ?? payload.showAnalyticsOnMirror,
        useAI: previousSettings.useAI ?? payload.useAI,
        chatbotEnabled: previousSettings.chatbotEnabled ?? payload.chatbotEnabled ?? false,
        chatbotVoice: previousSettings.chatbotVoice ?? payload.chatbotVoice ?? "nova",
        autoUpdate: previousSettings.autoUpdate ?? payload.autoUpdate,
        pushoverEnabled: previousSettings.pushoverEnabled ?? payload.pushoverEnabled,
        reminderTime: previousSettings.reminderTime ?? payload.reminderTime,
        background: previousSettings.background ?? payload.background ?? 'forest.png',
        levelingEnabled: previousSettings.levelingEnabled ?? (payload.leveling?.enabled !== false),
        useCoinSystem: resolvedCoinToggle,
        usePointSystem: resolvedCoinToggle,
        emailEnabled: previousSettings.emailEnabled ?? payload.emailEnabled ?? false,
        leveling: {
          mode: previousSettings.leveling?.mode ?? payload.leveling?.mode ?? 'years',
          choresToMaxLevel: previousSettings.leveling?.choresToMaxLevel ?? payload.leveling?.choresToMaxLevel,
          yearsToMaxLevel: previousSettings.leveling?.yearsToMaxLevel ?? payload.leveling?.yearsToMaxLevel,
          choresPerWeekEstimate: previousSettings.leveling?.choresPerWeekEstimate ?? payload.leveling?.choresPerWeekEstimate
        },
        levelTitles: previousSettings.levelTitles ?? payload.levelTitles,
        customLevelTitles: previousSettings.customLevelTitles ?? payload.customLevelTitles
      };

      if (!Array.isArray(settings.taskPointsRules)) {
        settings.taskPointsRules = Array.isArray(previousSettings.taskPointsRules)
          ? previousSettings.taskPointsRules
          : [];
      }

      Object.assign(this.config, settings, {
        leveling: { ...payload.leveling, ...settings.leveling, enabled: settings.levelingEnabled }
      });
      saveData();
      scheduleReminder(this);
      if (!this.server) {
        this.initServer(payload.adminPort);
      } else {
        // When the mirror reloads, resend the current data so tasks and
        // settings are restored immediately without needing a task change.
        broadcastTasks(this);
        this.sendSocketNotification("ANALYTICS_UPDATE", analyticsBoards);
        this.sendSocketNotification("SETTINGS_UPDATE", settings);
      }
    }
    if (notification === "USER_TOGGLE_CHORE") {
      this.handleUserToggle(payload);
    }
    if (notification === "VOICE_COMMAND") {
      this.handleVoiceCommand(payload);
    }
  },

  async handleVoiceCommand(payload) {
    const { transcript, people: currentPeople, tasks: currentTasks } = payload;
    
    if (!this.config || !this.config.openaiApiKey) {
      Log.warn("MMM-Chores: Voice commands require OpenAI API key");
      return;
    }

    if (!openaiLoaded) {
      Log.warn("MMM-Chores: OpenAI package not installed. Run: npm install openai");
      return;
    }

    try {
      const client = new OpenAI({ apiKey: this.config.openaiApiKey });
      
      // Build context about current state
      const context = {
        people: people.map(p => ({
          id: p.id,
          name: p.name,
          points: coinStore.peopleCoins?.[p.id] || 0
        })),
        tasks: tasks.filter(t => !t.deleted).map(t => ({
          id: t.id,
          name: t.name,
          assignedTo: t.assignedTo,
          done: t.done,
          date: t.date
        }))
      };

      // Ask GPT to parse the intent
      const langCode = (settings.language || "en").toLowerCase();
      const systemPrompt = `You are a voice assistant for a chore management system. Parse user commands and return JSON with the intent. Always respond in ${langCode}.

Available actions:
- list_tasks: Show tasks (filters: today, week, person_name, all)
- mark_done: Mark task as complete (needs task name or id)
- mark_undone: Mark task as incomplete
- add_task: Create new task (needs task name, optional: assignee, date)
- check_stats: Show statistics (person's points, level, completed tasks)
- redeem_reward: Redeem a reward (needs reward name)
- check_reward: Check reward details (needs reward name)
- halp user caulculare remaining coins to get reward (needs reward name)
- do not return full dates only day for upcomming tasks 


Current people: ${context.people.map(p => p.name).join(", ")}
Current tasks: ${context.tasks.slice(0, 10).map(t => `"${t.name}"`).join(", ")}

Return JSON only: {"action": "ACTION_NAME", "params": {...}, "response": "natural language response"}`;

      const completion = await client.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      // Execute the action
      const actionResult = await this.executeVoiceAction(result, context);
      
      // Send response back to frontend
      this.sendSocketNotification("VOICE_RESPONSE", {
        text: actionResult.response || result.response,
        action: actionResult.action
      });

    } catch (error) {
      Log.error("MMM-Chores: Voice command error", error);
      this.sendSocketNotification("VOICE_RESPONSE", {
        text: "Sorry, I couldn't process that command.",
        action: null
      });
    }
  },

  async executeVoiceAction(intent, context) {
    const { action, params, response } = intent;
    let actionPayload = null;

    switch (action) {
      case "list_tasks": {
        const filter = params.filter || "today";
        const today = new Date().toISOString().split("T")[0];
        let filtered = context.tasks;

        if (filter === "today") {
          filtered = filtered.filter(t => t.date === today && !t.done);
        } else if (filter === "week") {
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          filtered = filtered.filter(t => !t.done && new Date(t.date) <= weekFromNow);
        } else if (filter !== "all") {
          // Filter by person name
          const person = context.people.find(p => p.name.toLowerCase() === filter.toLowerCase());
          if (person) {
            filtered = filtered.filter(t => t.assignedTo === person.id && !t.done);
          }
        }

        const taskList = filtered.map(t => {
          const assignee = context.people.find(p => p.id === t.assignedTo);
          return `${t.name}${assignee ? ` for ${assignee.name}` : ""}`;
        }).join(", ");

        return {
          response: filtered.length > 0 
            ? `You have ${filtered.length} task${filtered.length > 1 ? "s" : ""}: ${taskList}`
            : "No tasks found.",
          action: null
        };
      }

      case "mark_done":
      case "mark_undone": {
        const taskName = params.task_name?.toLowerCase();
        const task = context.tasks.find(t => 
          t.name.toLowerCase().includes(taskName) || t.id === params.task_id
        );

        if (task) {
          const isDone = action === "mark_done";
          this.handleUserToggle({ id: task.id, done: isDone });
          
          return {
            response: `Marked "${task.name}" as ${isDone ? "complete" : "incomplete"}.`,
            action: { type: "TOGGLE_TASK", taskId: task.id, done: isDone }
          };
        }
        return { response: "I couldn't find that task.", action: null };
      }

      case "check_stats": {
        const personName = params.person_name;
        const person = context.people.find(p => 
          p.name.toLowerCase() === personName?.toLowerCase()
        );

        if (person) {
          const completedCount = context.tasks.filter(t => 
            t.assignedTo === person.id && t.done
          ).length;
          
          return {
            response: `${person.name} has ${person.points} coins and has completed ${completedCount} tasks.`,
            action: null
          };
        }
        return { response: "I couldn't find that person.", action: null };
      }

      default:
        return { response: response || "I'm not sure how to help with that.", action: null };
    }
  },

  async aiGenerateTasks(req, res) {
    if (!this.config || this.config.useAI === false) {
      return res.status(400).json({
        success: false,
        error: "AI is disabled. Please install the 'openai' npm package and set useAI: true in your config."
      });
    }
    if (!openaiLoaded) {
      return res.status(400).json({
        success: false,
        error: "The 'openai' npm package is not installed. Run 'npm install openai' in the module folder."
      });
    }
    if (!this.config.openaiApiKey) {
      return res.status(400).json({ success: false, error: "OpenAI token missing in config." });
    }

    const completedCount = tasks.filter(t => t.done === true).length;
    const requiredCount = 30;
    if (completedCount < requiredCount) {
      const amountLeft = requiredCount - completedCount;
      return res.status(400).json({
        success: false,
        error: `Too little data. Please complete ${amountLeft} more task${amountLeft > 1 ? "s" : ""} to unlock AI generation.`
      });
    }

    try {
      const openai = new OpenAI({ apiKey: this.config.openaiApiKey });
      const prompt = this.buildPromptFromTasks();

      Log.log("MMM-Chores: Sending prompt to OpenAI...");

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content:
              // ── ROLE ────────────────────────────────────────────────────────────
              "You are an assistant that, given historical household-task data, " +
              "creates a schedule for the **next 7 days**.\n\n" +
        
              // ── OUTPUT FORMAT ───────────────────────────────────────────────────
              "Return **only** a raw JSON array (no surrounding text). Each item " +
              "must include:\n" +
              "  • name         – string\n" +
              "  • date         – string in YYYY-MM-DD format\n" +
              "  • assignedTo   – person-ID (omit or null if unassigned)\n\n" +
        
              // ── SCHEDULING RULES ────────────────────────────────────────────────
              "1. Skip tasks marked as *done* unless they are recurring.\n" +
              "2. Don’t duplicate an unfinished or very recently completed task on " +
              "   the same day.\n" +
              "3. Never assign more than **one** *big* task per person per week; " +
              "   *small* tasks can appear more often.\n" +
              "4. It’s okay if some days end up without new tasks – keeping " +
              "   routines is more important than filling every date.\n" +
              "5. Try to keep weekly tasks on the same weekday they historically " +
              "   occur.\n" +
              "6. Only generate dates within the next 7 days.\n" +
              "7. Do not invent new people or tasks that aren’t present in the " +
              "   input data.\n" +
              "8. Do not add unnecessary data.\n\n" +
        
              // ── EXAMPLES TO DISTINGUISH SMALL VS BIG TASKS ──────────────────────
              "Examples of **small chores** include:\n" +
              "Wash dishes, Water plants, Take out trash, Sweep floor, Dust shelves, " +
              "Wipe counters, Fold laundry, Clean mirrors, Make bed, Replace hand towels. create the tasks in the same language as the data \n\n" +
        
              "Examples of **big chores** include:\n" +
              "Vacuum entire house, Mow lawn, Deep clean bathroom, Organize garage, " +
              "Paint room, Shampoo carpets, Clean gutters, Declutter closets, Wash windows (outside), Repair door hinges. but remember create the tasks in the same language as the data\n" +
        
              // ── REASONABLENESS GUIDELINES ───────────────────────────────────────
              "9. Be reasonable with scheduling: avoid assigning overly exhausting tasks " +
              "   like cleaning the entire house or doing all big chores in one day. " +
              "   Balance workload fairly over the week per person.\n" +
              "10. Prioritize routines and habits over forcing new tasks every day.\n" +
              "11. If a task is big or time-consuming, spread it out or assign it only once " +
              "    per week per person.\n" +
              "12. Consider recent completions and do not repeat tasks too soon."
          },
          { role: "user", content: prompt }
        ],

        max_completion_tokens: 5000,
        temperature: 0.1
      });

      let text = completion.choices[0].message.content;

      Log.log("MMM-Chores: OpenAI RAW response:", text);

      text = text.trim();
      if (text.startsWith("```")) {
        text = text.replace(/```[a-z]*\s*([\s\S]*?)\s*```/, "$1").trim();
      }

      const firstBracket = text.indexOf('[');
      const lastBracket  = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        text = text.substring(firstBracket, lastBracket + 1);
      }

      let newTasks = [];
      try {
        newTasks = JSON.parse(text);
      } catch (e) {
        Log.error("Failed parsing AI response:", e);
        Log.error("OpenAI returned:", text);
        return res.status(500).json({ success: false, error: "Invalid AI response format.", raw: text });
      }

      const now = new Date();
      let createdCount = 0;

      newTasks.forEach(task => {
        const alreadyExists = tasks.some(t => t.name === task.name && t.date === task.date && !t.deleted);
        if (!alreadyExists) {
          task.id      = Date.now() + Math.floor(Math.random() * 10000);
          task.created = getLocalISO(now);
          task.done    = false;
          if (!task.assignedTo) task.assignedTo = null;
          tasks.push(task);
          createdCount++;
        }
      });

      saveData();
      broadcastTasks(this);
      res.json({ success: true, createdTasks: newTasks, count: createdCount });

    } catch (err) {
      Log.error("AI Generate error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  buildPromptFromTasks() {
    // Include all completed tasks, even if they were later deleted
    const relevantTasks = tasks.filter(t => t.done === true).map(t => ({
      name:        t.name,
      assignedTo:  t.assignedTo,
      date:        t.date,
      done:        t.done,
      deleted:     t.deleted || false,
      created:     t.created
    }));

    const todayString = new Date().toLocaleDateString("sv-SE", {
      weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric'
    });

      return JSON.stringify({
        instruction:
          `Today is ${todayString}. ` +
          "Analyze historical data to determine which day of the week different people usually perform specific chores. " +
          "Based on this, generate new tasks for the next 7 days with the correct assignment of the right person on the right day in the same language as the tasks. " +
          "Return ONLY a JSON array of objects containing: name, date (yyyy-mm-dd), assignedTo (person id).",

        today: getLocalISO(new Date()).slice(0, 10),
        tasks: relevantTasks,
        people: people
      });
  },

  async handleUserToggle({ id, done }) {
    try {
      const now = new Date();
      const iso = now.toISOString();
      const pad = n => n.toString().padStart(2, "0");
      const stamp = prefix =>
        prefix + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes());

      const body = { done };
      if (done) {
        body.finished = iso;
        body.finishedShort = stamp("F");
      } else {
        body.finished = null;
        body.finishedShort = null;
      }

      const port = this.config.adminPort;
      const headers = { "Content-Type": "application/json" };
      if (this.config.login && this.internalToken) {
        headers["x-auth-token"] = this.internalToken;
      }
      await fetchFn(`http://localhost:${port}/api/tasks/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });

      const getHeaders = {};
      if (this.config.login && this.internalToken) {
        getHeaders["x-auth-token"] = this.internalToken;
      }
      const res = await fetchFn(`http://localhost:${port}/api/tasks`, { headers: getHeaders });
      const latest = await res.json();

      // Keep historical data for analytics by excluding only deleted and
      // unfinished tasks, mirroring the admin portal's behaviour.
      const filtered = latest.filter(t => !(t.deleted && !t.done));
      this.sendSocketNotification("CHORES_DATA", filtered);
    } catch (e) {
      Log.error("MMM-Chores: failed updating task", e);
    }
  },

  initServer(port) {
    if (this.server) {
      // Server already running; nothing to do.
      return;
    }
    const self = this;
    const app  = express();

    app.use(bodyParser.json());
    app.use(express.static(path.join(__dirname, "public")));
    app.use("/img", express.static(path.join(__dirname, "img")));
    app.use("/MMM-Chores/img", express.static(path.join(__dirname, "img")));

    const users = Array.isArray(self.config.users) ? self.config.users : [];
    if (self.config.login) {
      const token = Math.random().toString(36).slice(2);
      sessions[token] = {
        username: "__internal__",
        permission: "write",
        expires: Infinity
      };
      self.internalToken = token;
    }

    app.post("/api/login", (req, res) => {
      if (!self.config.login) return res.json({ loginRequired: false });
      const { username, password } = req.body;
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const token = Math.random().toString(36).slice(2);
      sessions[token] = {
        ...user,
        expires: Date.now() + SESSION_DURATION_MS
      };
      res.json({ token, permission: user.permission });
    });

      app.get("/api/login", (req, res) => {
        if (!self.config.login) return res.json({ loginRequired: false });
        const token = req.headers["x-auth-token"];
        const user = sessions[token];
        if (user && user.expires > Date.now()) {
          user.expires = Date.now() + SESSION_DURATION_MS;
          return res.json({ loginRequired: true, loggedIn: true, permission: user.permission });
        }
        if (token && sessions[token]) delete sessions[token];
        res.json({ loginRequired: true, loggedIn: false });
      });

      app.post("/api/logout", (req, res) => {
        if (!self.config.login) return res.json({ success: true });
        const token = req.headers["x-auth-token"];
        if (token && sessions[token]) delete sessions[token];
        res.json({ success: true });
      });

    app.use((req, res, next) => {
      if (!self.config.login) return next();
      // Allow the login API and root admin page without authentication so the
      // login overlay can be displayed in the browser.
      if (req.path === "/api/login" || req.path === "/") return next();
      const token = req.headers["x-auth-token"];
      const user = sessions[token];
      if (!user || user.expires <= Date.now()) {
        if (token && sessions[token]) delete sessions[token];
        return res.status(401).json({ error: "Unauthorized" });
      }
      user.expires = Date.now() + SESSION_DURATION_MS;
      req.user = user;
      next();
    });

    function requireWrite(req, res, next) {
      if (!self.config.login) return next();
      if (!req.user || req.user.permission !== "write") {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    }

    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "admin.html"));
    });

    app.get("/api/people", (req, res) => res.json(people));
    app.post("/api/people", requireWrite, (req, res) => {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });

      // Compute the level for the specific person being added. Using the
      // person's ID ensures the level is based on their own completed chores
      // (which will be zero for a new person) rather than the global stats.
      const id = Date.now();
      const newPersonBase = { id, name };
      const info = getLevelInfo(self.config || {}, newPersonBase);
      const startingCoins = coinStore.peopleCoins?.[id] ?? 0;
      const newPerson = { ...newPersonBase, level: info.level, title: info.title, points: startingCoins };
      coinStore.peopleCoins = { ...coinStore.peopleCoins, [id]: startingCoins };

      people.push(newPerson);
      saveData();
      self.sendSocketNotification("PEOPLE_UPDATE", people);
      res.status(201).json(newPerson);
    });
    app.delete("/api/people/:id", requireWrite, (req, res) => {
      const id = parseInt(req.params.id, 10);
      people = people.filter(p => p.id !== id);
      tasks  = tasks.map(t => t.assignedTo === id ? { ...t, assignedTo: null } : t);
      if (coinStore.peopleCoins && Object.prototype.hasOwnProperty.call(coinStore.peopleCoins, id)) {
        const clone = { ...coinStore.peopleCoins };
        delete clone[id];
        coinStore.peopleCoins = clone;
      }
      const success = saveData();
      self.sendSocketNotification("PEOPLE_UPDATE", people);
      broadcastTasks(self);
      res.json({ success });
    });

    // Return all tasks. Filtering of deleted items is handled client-side so
    // analytics can include completed tasks even after deletion.
    app.get("/api/tasks", (req, res) => {
      const created = ensureRecurringInstancesUpToToday();
      applyTaskOrder();
      if (created) {
        saveData();
      }
      res.json(tasks);
    });
    app.post("/api/tasks", requireWrite, (req, res) => {
      const now = new Date();
      const fallbackAnchor = getNextSeriesAnchorValue();
      const newTask = {
        id: generateTaskId(),
        ...req.body,
        created: getLocalISO(now),
        order: tasks.filter(t => !t.deleted).length,
        done: false,
        assignedTo: req.body.assignedTo ? parseInt(req.body.assignedTo, 10) : null,
        recurring: req.body.recurring || "none",
      };

      if (newTask.date) {
        newTask.date = normalizeRecurringStartDate(newTask.date, newTask.recurring);
      }

      if (newTask.points !== undefined) {
        const numericPoints = Number(newTask.points);
        if (Number.isFinite(numericPoints) && numericPoints > 0) {
          newTask.points = numericPoints;
        } else {
          delete newTask.points;
        }
      }

      ensureTaskSeriesMetadata(newTask, fallbackAnchor);

      if (newTask.points === undefined) {
        autoAssignTaskPoints(newTask);
      }
      Log.log("POST /api/tasks", newTask);
      tasks.push(newTask);
      const t = getLanguageStrings(settings.language);
      const newTaskMsg = formatTemplate(t.pushoverNewTask || "New task: {task}", { task: newTask.name });
      sendPushover(self, settings, newTaskMsg);
      const ok = broadcastTasks(self);
      res.status(ok ? 201 : 500).json(ok ? newTask : { error: "Failed to save data" });
    });

    // Reorder tasks
    app.put("/api/tasks/reorder", requireWrite, (req, res) => {
      const ids = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: "Expected an array of task ids" });
      }
      Log.log("PUT /api/tasks/reorder", ids);

      const map = new Map();
      tasks.forEach(t => map.set(t.id, t));
      const preOrders = ids.map(id => ({
        id,
        found: map.has(id),
        currentOrder: map.has(id) ? map.get(id).order : null
      }));
      Log.log("Reorder validation", preOrders);

      const idSet = new Set(ids);
      const reordered = ids.map(id => map.get(id)).filter(Boolean);
      tasks = reordered.concat(tasks.filter(t => !idSet.has(t.id)));

      const handledSeries = new Set();
      let nextAnchor = 0;
      const assignSeriesAnchor = (task) => {
        if (!task || task.deleted) return;
        ensureTaskSeriesMetadata(task);
        const seriesId = getSeriesId(task);
        if (handledSeries.has(seriesId)) return;
        setSeriesAnchorForSeries(seriesId, nextAnchor++);
        handledSeries.add(seriesId);
      };

      ids.forEach(id => assignSeriesAnchor(map.get(id)));
      tasks.forEach(task => assignSeriesAnchor(task));

      // Persist order numbers immediately before broadcasting
      let order = 0;
      tasks.forEach(t => {
        const prev = t.order;
        if (t.deleted) {
          delete t.order;
        } else {
          t.order = order++;
        }
        if (prev !== undefined && prev !== t.order) {
          Log.log(`Task ${t.id} order ${prev} -> ${t.order}`);
        }
      });

      Log.log("New task order", tasks.map(t => ({ id: t.id, order: t.order })));
      const ok = broadcastTasks(self);
      if (!ok) {
        return res.status(500).json({ error: "Failed to save data" });
      }
      res.json({ success: true });
    });
    app.put("/api/tasks/:id", requireWrite, (req, res) => {
      const id   = parseInt(req.params.id, 10);
      const task = tasks.find(t => t.id === id);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const prevDone = task.done;
      const updates = req.body || {};
      const hasPointsUpdate = Object.prototype.hasOwnProperty.call(updates, "points");
      const hasAutoRuleUpdate = Object.prototype.hasOwnProperty.call(updates, "autoPointsRule");
      const hasNameUpdate = Object.prototype.hasOwnProperty.call(updates, "name");

      Object.entries(updates).forEach(([key, val]) => {
        if (key === "points" || key === "autoPointsRule") return;
        if (val === undefined || val === null) {
          delete task[key];
        } else if (key === "assignedTo") {
          task[key] = val ? parseInt(val, 10) : null;
        } else {
          task[key] = val;
        }
      });

      if (hasPointsUpdate) {
        const numericPoints = Number(updates.points);
        if (Number.isFinite(numericPoints) && numericPoints > 0) {
          task.points = numericPoints;
        } else {
          delete task.points;
        }
        if (!hasAutoRuleUpdate) {
          delete task.autoPointsRule;
        }
      }

      if (hasAutoRuleUpdate) {
        if (updates.autoPointsRule) {
          task.autoPointsRule = updates.autoPointsRule;
        } else {
          delete task.autoPointsRule;
        }
      }

      if (!hasPointsUpdate) {
        const force = hasNameUpdate ? Boolean(task.autoPointsRule) : task.points === undefined;
        autoAssignTaskPoints(task, { force });
      }
      Log.log("PUT /api/tasks/" + id, req.body);

      // Adjust coins when completion status changes
      if (!prevDone && task.done) {
        awardPointsForTask(task);
      } else if (prevDone && !task.done) {
        revokePointsForTask(task);
      }

      if (!prevDone && task.done && task.recurring && task.recurring !== "none") {
        const nextDate = getNextDate(task.date, task.recurring);
        if (nextDate) {
          createRecurringInstanceFromTask(task, nextDate);
        }
      }

      const ok = broadcastTasks(self);
      if (!prevDone && task.done) {
        const assignee = task.assignedTo ? people.find(p => p.id === task.assignedTo) : null;
        const t = getLanguageStrings(settings.language);
        const byText = assignee ? formatTemplate(t.pushoverTaskBy || " by {name}", { name: assignee.name }) : "";
        const completedMsg = formatTemplate(t.pushoverTaskCompleted || "Task completed: {task}{by}", {
          task: task.name,
          by: byText
        });
        sendPushover(self, settings, completedMsg);
      }
      if (!ok) return res.status(500).json({ error: "Failed to save data" });
      res.json(task);
    });
    app.delete("/api/tasks/:id", requireWrite, (req, res) => {
      const id = parseInt(req.params.id, 10);
      const task = tasks.find(t => t.id === id);
      if (!task) return res.status(404).json({ error: "Task not found" });

      task.deleted = true;
      Log.log("DELETE /api/tasks/" + id);
      const ok = broadcastTasks(self);
      res.json({ success: ok });
    });

    app.get("/api/analyticsBoards", (req, res) => res.json(analyticsBoards));
    app.post("/api/analyticsBoards", requireWrite, (req, res) => {
      const newBoards = req.body;
      if (!Array.isArray(newBoards)) {
        return res.status(400).json({ error: "Expected an array of board types" });
      }
      analyticsBoards = newBoards;
      saveData();
      self.sendSocketNotification("ANALYTICS_UPDATE", analyticsBoards);
      res.json({ success: true, analyticsBoards });
    });

    app.get("/api/settings", (req, res) => {
      const safeSettings = { ...settings };
      delete safeSettings.openaiApiKey;
      delete safeSettings.pushoverApiKey;
      delete safeSettings.pushoverUser;
      res.json({ ...safeSettings, leveling: safeSettings.leveling, settings: self.config.settings });
    });
    app.post("/api/datafix", requireWrite, (req, res) => {
      const result = performTemporaryDataFix();
      if (!result.changed) {
        return res.json({ success: true, ...result, message: "No fixes were necessary." });
      }
      const ok = broadcastTasks(self);
      const parts = [];
      if (result.recurringDuplicatesRemoved) {
        parts.push(`cleaned ${result.recurringDuplicatesRemoved} series duplicate(s)`);
      }
      if (result.globalDuplicatesRemoved) {
        parts.push(`removed ${result.globalDuplicatesRemoved} matching task duplicate(s)`);
      }
      if (result.archivedPast) {
        parts.push(`archived ${result.archivedPast} overdue task(s)`);
      }
      if (result.completedPurged) {
        parts.push(`purged ${result.completedPurged} completed past task(s)`);
      }
      const message = parts.length ? parts.join(", ") : "Temporary fix completed.";
      res.status(ok ? 200 : 500).json({ success: ok, ...result, message });
    });
    app.put("/api/settings", requireWrite, (req, res) => {
      const newSettings = req.body;
      const wasAutoUpdate = settings.autoUpdate;
      const wasCoinSystem = settings.useCoinSystem ?? settings.usePointSystem ?? false;
      let taskPointsRulesUpdated = false;
      
      if (typeof newSettings !== "object") {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      
      // Handle manual coin editing
      if (newSettings._updatePersonCoins) {
        const { personId, points } = newSettings._updatePersonCoins;
        const person = people.find(p => p.id === personId);
        if (person) {
          person.points = points;
          saveData();
          self.sendSocketNotification("PEOPLE_UPDATE", people);
          return res.json({ success: true });
        }
        return res.status(404).json({ error: "Person not found" });
      }
      
      if (newSettings.pushoverEnabled && (!self.config.pushoverApiKey || !self.config.pushoverUser)) {
        return res.status(400).json({
          error: "Please set pushoverApiKey and pushoverUser in config.js to use Pushover notifications."
        });
      }
      if (newSettings.leveling) {
        settings.leveling = { ...settings.leveling, ...newSettings.leveling };
        self.config.leveling = { ...self.config.leveling, ...newSettings.leveling };
      }
      
      // Handle system migration
      const rawCoinToggle =
        newSettings.useCoinSystem ??
        newSettings.usePointSystem;
      const requestedCoinToggle = normalizeBooleanInput(rawCoinToggle);
      if (requestedCoinToggle !== undefined && requestedCoinToggle !== wasCoinSystem) {
        if (requestedCoinToggle) {
          migrateToPointSystem();
        } else {
          migrateToLevelSystem();
        }
        settings.useCoinSystem = Boolean(requestedCoinToggle);
        settings.usePointSystem = settings.useCoinSystem;
        if (self.config) {
          self.config.useCoinSystem = settings.useCoinSystem;
          self.config.usePointSystem = settings.usePointSystem;
        }
      }
      
      Object.entries(newSettings).forEach(([key, val]) => {
        if (
          key === "leveling" ||
          key === "openaiApiKey" ||
          key === "pushoverApiKey" ||
          key === "pushoverUser" ||
          key === "_updatePersonCoins" ||
          key === "_giftReason" ||
          key === "usePointSystem" ||
          key === "useCoinSystem"
        ) {
          return;
        }
        if ((key === "taskPointsRules" || key === "taskCoinRules") && !Array.isArray(val)) return;
        if (key === "taskPointsRules" || key === "taskCoinRules") {
          taskPointsRulesUpdated = true;
          settings.taskPointsRules = val;
          settings.taskCoinRules = val;
          if (self.config) {
            self.config.taskPointsRules = val;
            self.config.taskCoinRules = val;
          }
          return;
        }
        settings[key] = val;
        if (self.config) {
          if (key === "levelingEnabled") {
            self.config.leveling = self.config.leveling || {};
            self.config.leveling.enabled = val;
          } else {
            self.config[key] = val;
          }
        }
      });
      let tasksRecomputed = false;
      if (taskPointsRulesUpdated) {
        tasks.forEach(task => {
          const force = task.autoPointsRule ? true : task.points === undefined;
          if (force) {
            const changed = autoAssignTaskPoints(task, { force });
            tasksRecomputed = tasksRecomputed || changed;
          }
        });
      }

      if (tasksRecomputed) {
        broadcastTasks(self);
      }

      saveData();
      updatePeopleLevels(self.config);
      self.sendSocketNotification("LEVEL_INFO", getLevelInfo(self.config));
      self.sendSocketNotification("PEOPLE_UPDATE", people);
      self.sendSocketNotification("SETTINGS_UPDATE", settings);
      res.json({ success: true, settings });
      if (newSettings.autoUpdate && !wasAutoUpdate) {
        scheduleAutoUpdate();
      } else if (!newSettings.autoUpdate && wasAutoUpdate) {
        if (autoUpdateTimer) {
          clearTimeout(autoUpdateTimer);
          autoUpdateTimer = null;
        }
      }
      scheduleReminder(self);
    });

    app.post("/api/ai-chat", requireWrite, async (req, res) => {
      if (!settings.chatbotEnabled) {
        return res.status(400).json({ error: "AI chatbot is disabled in settings" });
      }
      if (!self.config || !self.config.openaiApiKey) {
        return res.status(400).json({ error: "OpenAI API key missing" });
      }
      if (!openaiLoaded) {
        return res.status(500).json({ error: "OpenAI package not installed. Run npm install openai." });
      }

      const { message, history } = req.body || {};
      const prompt = typeof message === "string" ? message.trim() : "";
      if (!prompt) {
        return res.status(400).json({ error: "Message is required" });
      }

      const langCode = (settings.language || "en").toLowerCase();
      const peopleSummary = people
        .map(p => {
          const coins = coinStore.peopleCoins?.[p.id] ?? p.points;
          const parts = [p.name];
          if (p.level !== undefined) parts.push(`level ${p.level}`);
          if (coins !== undefined) parts.push(`${coins} coins`);
          return parts.join(" - ");
        })
        .slice(0, 15)
        .join("; ");

      const upcomingTasks = tasks
        .filter(t => !t.deleted && !t.done)
        .slice(0, 20)
        .map(t => {
          const assignee = people.find(p => p.id === t.assignedTo);
          const date = t.date ? ` on ${t.date}` : "";
          return `${t.name}${assignee ? ` for ${assignee.name}` : ""}${date}`;
        })
        .join("; ");

      const rewardSummary = (coinStore.rewards || [])
        .slice(0, 10)
        .map(r => `${r.name} (${r.pointCost} coins)`)
        .join("; ");

      const taskRulesSummary = (settings.taskPointsRules || [])
        .map(r => `${r.pattern} (${r.points} coins)`)
        .join("; ");

      const safeHistory = Array.isArray(history)
        ? history
            .filter(msg => msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string")
            .slice(-6)
            .map(msg => ({ role: msg.role, content: msg.content.slice(0, 800) }))
        : [];

      const currentUser = (req.user && req.user.username) ? req.user.username : null;
      const currentDate = new Date().toLocaleDateString(langCode, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const systemPrompt = `You are an assistant for the MMM-Chores admin dashboard. Be concise and actionable. Respond in ${langCode}. 
Current Date: ${currentDate} (YYYY-MM-DD: ${new Date().toISOString().split('T')[0]}).
Current User: ${currentUser || "Guest"}.
You can answer questions about:
1. Managing tasks, rewards, and people in this dashboard.
2. General advice on how to perform household chores (e.g., "how to clean a window", "how to start a dishwasher").
If a user asks about unrelated topics (e.g., "best places to visit in New York", "how to climb a mountain"), politely decline.
When a user asks about a reward or their stats (e.g. "I want the PS5"), try to identify the person. If 'Current User' matches a name in 'People', assume that person. Otherwise, ask "Who are you?" or "Which person are you checking for?".
Once identified, check if they have enough coins. If not, calculate and state exactly how many more coins they need.
You can create tasks. If a user wants to create a task, ensure you have the task name, person, and date. If any are missing, ask for them.
Context: People: ${peopleSummary || "none"}. 
Upcoming tasks: ${upcomingTasks || "none"}. 
Rewards: ${rewardSummary || "none"}.
Task Rules (Points): ${taskRulesSummary || "none"}.`;

      function extractChatContent(content) {
        if (!content) return "";
        if (typeof content === "string") return content.trim();
        if (Array.isArray(content)) {
          return content
            .map(part => extractChatContent(part))
            .filter(Boolean)
            .join("")
            .trim();
        }
        if (typeof content === "object") {
          if (typeof content.text?.value === "string") return content.text.value.trim();
          if (typeof content.text === "string") return content.text.trim();
          if (Array.isArray(content.text)) return extractChatContent(content.text);
          if (typeof content.value === "string") return content.value.trim();
          if (typeof content.content === "string") return content.content.trim();
          if (Array.isArray(content.content)) return extractChatContent(content.content);
        }
        return "";
      }

      try {
        const client = new OpenAI({ apiKey: self.config.openaiApiKey });
        const messages = [{ role: "system", content: systemPrompt }, ...safeHistory, { role: "user", content: prompt }];
        
        const tools = [
          {
            type: "function",
            function: {
              name: "create_task",
              description: "Create a new household chore task for a person",
              parameters: {
                type: "object",
                properties: {
                  taskName: { type: "string", description: "The name of the task" },
                  personName: { type: "string", description: "The name of the person" },
                  date: { type: "string", description: "YYYY-MM-DD" }
                },
                required: ["taskName", "personName", "date"]
              }
            }
          }
        ];

        let completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools,
          tool_choice: "auto",
          max_tokens: 512,
          temperature: 0.7
        });

        const choice = completion.choices[0];
        let reply = "";
        let dataChanged = false;

        if (choice.message.tool_calls) {
          const toolCall = choice.message.tool_calls[0];
          if (toolCall.function.name === "create_task") {
            const args = JSON.parse(toolCall.function.arguments);
            const person = people.find(p => p.name.toLowerCase() === args.personName.toLowerCase());
            
            if (person) {
              const newTask = {
                id: Date.now(),
                name: args.taskName,
                assignedTo: person.id,
                date: args.date,
                created: getLocalISO(new Date()),
                done: false
              };
              // Auto-assign points if rule matches
              autoAssignTaskPoints(newTask, { force: true });
              tasks.push(newTask);
              saveData();
              dataChanged = true;
              
              messages.push(choice.message);
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: `Task created: ${args.taskName} for ${person.name} on ${args.date}. Points: ${newTask.points || 0}`
              });
              
              const followUp = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages,
                max_tokens: 512
              });
              reply = extractChatContent(followUp.choices[0].message.content);
            } else {
              messages.push(choice.message);
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: `Error: Person '${args.personName}' not found.`
              });
              const followUp = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages,
                max_tokens: 512
              });
              reply = extractChatContent(followUp.choices[0].message.content);
            }
          }
        } else {
          reply = extractChatContent(choice.message.content);
        }

        if (!reply) {
          reply = "I processed your request.";
        }

        // Generate audio if chatbot is enabled
        let audioBase64 = null;
        if (settings.chatbotEnabled && settings.chatbotTtsEnabled) {
          try {
            const selectedVoice = settings.chatbotVoice || "nova";
            const ttsResponse = await client.audio.speech.create({
              model: "tts-1",
              voice: selectedVoice,
              input: reply
            });
            const buffer = Buffer.from(await ttsResponse.arrayBuffer());
            audioBase64 = buffer.toString("base64");
            Log.log("MMM-Chores: Generated TTS audio, size:", buffer.length);
          } catch (ttsError) {
            Log.error("MMM-Chores: TTS generation failed", ttsError);
            // Continue without audio if TTS fails
          }
        }

        res.json({ reply, audio: audioBase64, dataChanged });
      } catch (error) {
        Log.error("MMM-Chores: AI chat failed", error);
        res.status(500).json({ error: "Failed to generate AI response" });
      }
    });

    app.post("/api/ai-generate", requireWrite, (req, res) => self.aiGenerateTasks(req, res));

    // Rewards API
    app.get("/api/rewards", (req, res) => res.json(coinStore.rewards));
    app.post("/api/rewards", requireWrite, (req, res) => {
      const { name, pointCost, description, emailTemplate } = req.body;
      if (!name || !pointCost) {
        return res.status(400).json({ error: "Name and point cost are required" });
      }
      
      const newReward = {
        id: Date.now(),
        name,
        pointCost: parseInt(pointCost),
        description: description || "",
        emailTemplate: emailTemplate || "",
        active: true,
        created: getLocalISO(new Date())
      };
      
      coinStore.rewards.push(newReward);
      saveData();
      res.status(201).json(newReward);
    });
    
    app.put("/api/rewards/:id", requireWrite, (req, res) => {
      const id = parseInt(req.params.id, 10);
      const reward = coinStore.rewards.find(r => r.id === id);
      if (!reward) return res.status(404).json({ error: "Reward not found" });
      
      Object.entries(req.body).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          reward[key] = val;
        }
      });
      
      saveData();
      res.json(reward);
    });
    
    app.delete("/api/rewards/:id", requireWrite, (req, res) => {
      const id = parseInt(req.params.id, 10);
      coinStore.rewards = coinStore.rewards.filter(r => r.id !== id);
      saveData();
      res.json({ success: true });
    });

    // Redemptions API
    app.get("/api/redemptions", (req, res) => res.json(coinStore.redemptions));
    app.post("/api/redemptions", requireWrite, (req, res) => {
      const { rewardId, personId } = req.body;
      const reward = coinStore.rewards.find(r => r.id === rewardId && r.active);
      const person = people.find(p => p.id === personId);
      
      if (!reward) return res.status(404).json({ error: "Reward not found" });
      if (!person) return res.status(404).json({ error: "Person not found" });
      if (!settings.useCoinSystem) return res.status(400).json({ error: "Coins system not enabled" });
      
      const personPoints = person.points || 0;
      if (personPoints < reward.pointCost) {
        return res.status(400).json({ error: "Insufficient points" });
      }
      
      // Deduct points
      person.points = personPoints - reward.pointCost;
      
      // Create redemption record
      const redemption = {
        id: Date.now(),
        rewardId,
        personId,
        rewardName: reward.name,
        personName: person.name,
        pointCost: reward.pointCost,
        redeemed: getLocalISO(new Date()),
        used: false,
        emailSent: false
      };
      
      coinStore.redemptions.push(redemption);
      saveData();
      
      // Send email if template exists
      if (reward.emailTemplate && self.config.emailEnabled) {
        sendRedemptionEmail(person, reward, redemption);
      }
      
      // Notify via Pushover that someone claimed a reward
      const t = getLanguageStrings(settings.language);
      const coinWord = t.pointsLabel || "coins";
      const redeemMsg = formatTemplate(t.pushoverRewardRedeemed || "{person} redeemed {reward} for {cost} {coins}", {
        person: person.name,
        reward: reward.name,
        cost: reward.pointCost,
        coins: coinWord
      });
      sendPushover(self, settings, redeemMsg);

      self.sendSocketNotification("PEOPLE_UPDATE", people);
      self.sendSocketNotification("REDEMPTIONS_UPDATE", coinStore.redemptions);
      res.status(201).json(redemption);
    });
    
    app.put("/api/redemptions/:id/use", requireWrite, (req, res) => {
      const id = parseInt(req.params.id, 10);
      const redemption = coinStore.redemptions.find(r => r.id === id);
      if (!redemption) return res.status(404).json({ error: "Redemption not found" });
      
      redemption.used = true;
      redemption.usedDate = getLocalISO(new Date());
      saveData();
      self.sendSocketNotification("REDEMPTIONS_UPDATE", coinStore.redemptions);
      res.json(redemption);
    });

    // Points API
    app.get("/api/people/:id/points", (req, res) => {
      const id = parseInt(req.params.id, 10);
      const person = people.find(p => p.id === id);
      if (!person) return res.status(404).json({ error: "Person not found" });
      
      const coins = coinStore.peopleCoins?.[id];
      const numericCoins = Number(coins);
      const fallback = Number(person.points) || 0;
      const points = Number.isFinite(numericCoins) ? numericCoins : fallback;
      res.json({ points });
    });

    this.server = app.listen(port, "0.0.0.0", () => {
      Log.log(`MMM-Chores admin (HTTP) running at http://0.0.0.0:${port}`);
      broadcastTasks(self);
      self.sendSocketNotification("PEOPLE_UPDATE", people);
      self.sendSocketNotification("ANALYTICS_UPDATE", analyticsBoards);
      self.sendSocketNotification("SETTINGS_UPDATE", settings);
        self.sendSocketNotification("REDEMPTIONS_UPDATE", coinStore.redemptions || []);
    });

    const httpsPort = port + 1;
    const keyPath   = path.join(CERT_DIR, "server.key");
    const certPath  = path.join(CERT_DIR, "server.crt");
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const options = {
        key:  fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      https.createServer(options, app).listen(httpsPort, "0.0.0.0", () => {
        Log.log(`MMM-Chores admin (HTTPS) running at https://0.0.0.0:${httpsPort}`);
      });
    } else {
      Log.warn("MMM-Chores: HTTPS cert/key not found, skipping HTTPS server");
    }
  }
});
