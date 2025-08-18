const Log        = require("logger");
const NodeHelper = require("node_helper");
const express    = require("express");
const bodyParser = require("body-parser");
const path       = require("path");
const fs         = require("fs");
const https      = require("https");
const { exec }   = require("child_process");

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

const DATA_FILE = path.join(__dirname, "data.json");
const CERT_DIR  = path.join(__dirname, "certs");

let tasks = [];
let people = [];
let analyticsBoards = [];
let sessions = {};

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

let settings = {};
let autoUpdateTimer = null;

function getLocalISO(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, -1);
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

function sendPushover(config, settings, message) {
  if (!config.pushoverApiKey || !settings.pushoverEnabled || !config.pushoverUser) return;
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
  if (fs.existsSync(DATA_FILE)) {
    Log.log("loadData: reading", DATA_FILE);
    try {
      const j = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      tasks = j.tasks || [];
      // Ensure active tasks are sorted and have sequential order
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
      people          = j.people          || [];
      analyticsBoards = j.analyticsBoards || [];
      settings        = j.settings        || {};
      if (settings.openaiApiKey !== undefined) delete settings.openaiApiKey;
      if (settings.pushoverApiKey !== undefined) delete settings.pushoverApiKey;
      if (settings.pushoverUser !== undefined) delete settings.pushoverUser;

      updatePeopleLevels({});

      Log.log(
        `MMM-Chores: Loaded ${tasks.length} tasks, ${people.length} people, ${analyticsBoards.length} analytics boards`
      );
    } catch (e) {
      Log.error("MMM-Chores: Error reading data.json:", e);
    }
  }
}

function saveData() {
  try {
    Log.log("saveData: writing", DATA_FILE);
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ tasks, people, analyticsBoards, settings }, null, 2),
      "utf8"
    );
    Log.log(
      `MMM-Chores: Saved ${tasks.length} tasks, ${people.length} people, ${analyticsBoards.length} analytics boards, language: ${settings.language}`
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
  const years  = parseFloat(lvlConf.yearsToMaxLevel) || 1;
  const perW   = parseFloat(lvlConf.choresPerWeekEstimate) || 1;
  const max    = parseInt(lvlConf.maxLevel, 10) || 100;
  const done   = tasks.filter(t => t.done && (!personId || t.assignedTo === personId)).length;
  const totalNeeded = years * 52 * perW;
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
  const ok = saveData();
  Log.log(`broadcastTasks: saveData returned ${ok}`);
  return ok;
}

function getNextDate(dateStr, recurring) {
  const d = new Date(dateStr);
  if (recurring === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (recurring === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (recurring === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

module.exports = NodeHelper.create({
  start() {
    Log.log("MMM-Chores helper started...");
    loadData();
    if (settings.autoUpdate) {
      scheduleAutoUpdate();
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "INIT_SERVER") {
      this.config = payload;

      settings = {
        language: settings.language ?? payload.language,
        dateFormatting: settings.dateFormatting ?? payload.dateFormatting,
        textMirrorSize: settings.textMirrorSize ?? payload.textMirrorSize,
        showPast: settings.showPast ?? payload.showPast,
        showAnalyticsOnMirror: settings.showAnalyticsOnMirror ?? payload.showAnalyticsOnMirror,
        useAI: settings.useAI ?? payload.useAI,
        autoUpdate: settings.autoUpdate ?? payload.autoUpdate,
        pushoverEnabled: settings.pushoverEnabled ?? payload.pushoverEnabled,
        levelingEnabled: settings.levelingEnabled ?? (payload.leveling?.enabled !== false),
        leveling: {
          yearsToMaxLevel: settings.leveling?.yearsToMaxLevel ?? payload.leveling?.yearsToMaxLevel,
          choresPerWeekEstimate: settings.leveling?.choresPerWeekEstimate ?? payload.leveling?.choresPerWeekEstimate,
          maxLevel: settings.leveling?.maxLevel ?? payload.leveling?.maxLevel
        }
      };

      Object.assign(this.config, settings, {
        leveling: { ...payload.leveling, ...settings.leveling, enabled: settings.levelingEnabled }
      });
      saveData();
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

        max_tokens: 5000,
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

    const users = Array.isArray(self.config.users) ? self.config.users : [];
    if (self.config.login) {
      const token = Math.random().toString(36).slice(2);
      sessions[token] = { username: "__internal__", permission: "write" };
      self.internalToken = token;
    }

    app.post("/api/login", (req, res) => {
      if (!self.config.login) return res.json({ loginRequired: false });
      const { username, password } = req.body;
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const token = Math.random().toString(36).slice(2);
      sessions[token] = user;
      res.json({ token, permission: user.permission });
    });

    app.get("/api/login", (req, res) => {
      if (!self.config.login) return res.json({ loginRequired: false });
      const token = req.headers["x-auth-token"];
      const user = sessions[token];
      if (user) {
        return res.json({ loginRequired: true, loggedIn: true, permission: user.permission });
      }
      res.json({ loginRequired: true, loggedIn: false });
    });

    app.use((req, res, next) => {
      if (!self.config.login) return next();
      // Allow the login API and root admin page without authentication so the
      // login overlay can be displayed in the browser.
      if (req.path === "/api/login" || req.path === "/") return next();
      const token = req.headers["x-auth-token"];
      const user = sessions[token];
      if (!user) return res.status(401).json({ error: "Unauthorized" });
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
      const newPerson = { ...newPersonBase, level: info.level, title: info.title };

      people.push(newPerson);
      saveData();
      self.sendSocketNotification("PEOPLE_UPDATE", people);
      res.status(201).json(newPerson);
    });
    app.delete("/api/people/:id", requireWrite, (req, res) => {
      const id = parseInt(req.params.id, 10);
      people = people.filter(p => p.id !== id);
      tasks  = tasks.map(t => t.assignedTo === id ? { ...t, assignedTo: null } : t);
      const success = saveData();
      self.sendSocketNotification("PEOPLE_UPDATE", people);
      broadcastTasks(self);
      res.json({ success });
    });

    // Return all tasks. Filtering of deleted items is handled client-side so
    // analytics can include completed tasks even after deletion.
    app.get("/api/tasks", (req, res) => {
      res.json(tasks);
    });
    app.post("/api/tasks", requireWrite, (req, res) => {
      const now = new Date();
      const newTask = {
        id: Date.now(),
        ...req.body,
        created: getLocalISO(now),
        order: tasks.filter(t => !t.deleted).length,
        done: false,
        assignedTo: null,
        recurring: req.body.recurring || "none",
      };
      Log.log("POST /api/tasks", newTask);
      tasks.push(newTask);
      sendPushover(self.config, settings, `New task: ${newTask.name}`);
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

      Object.entries(req.body).forEach(([key, val]) => {
        if (val === undefined || val === null) {
          delete task[key];
        } else {
          task[key] = val;
        }
      });
      Log.log("PUT /api/tasks/" + id, req.body);

      if (!prevDone && task.done && task.recurring && task.recurring !== "none") {
        const nextDate = getNextDate(task.date, task.recurring);
        if (nextDate) {
          const newTask = {
            id: Date.now(),
            name: task.name,
            date: nextDate,
            assignedTo: task.assignedTo || null,
            recurring: task.recurring,
            order: tasks.filter(t => !t.deleted).length,
            done: false,
            created: getLocalISO(new Date()),
          };
          tasks.push(newTask);
        }
      }

      const ok = broadcastTasks(self);
      if (!prevDone && task.done) {
        sendPushover(self.config, settings, `Task completed: ${task.name}`);
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
    app.put("/api/settings", requireWrite, (req, res) => {
      const newSettings = req.body;
      const wasAutoUpdate = settings.autoUpdate;
      if (typeof newSettings !== "object") {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      if (newSettings.leveling) {
        settings.leveling = { ...settings.leveling, ...newSettings.leveling };
        self.config.leveling = { ...self.config.leveling, ...newSettings.leveling };
      }
      Object.entries(newSettings).forEach(([key, val]) => {
        if (key === "leveling" || key === "openaiApiKey" || key === "pushoverApiKey" || key === "pushoverUser") return;
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
    });

    app.post("/api/ai-generate", requireWrite, (req, res) => self.aiGenerateTasks(req, res));

    this.server = app.listen(port, "0.0.0.0", () => {
      Log.log(`MMM-Chores admin (HTTP) running at http://0.0.0.0:${port}`);
      broadcastTasks(self);
      self.sendSocketNotification("PEOPLE_UPDATE", people);
      self.sendSocketNotification("ANALYTICS_UPDATE", analyticsBoards);
      self.sendSocketNotification("SETTINGS_UPDATE", settings);
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
