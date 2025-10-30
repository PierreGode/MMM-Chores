// Languages defined in lang.js

let currentLang = 'en';
let peopleCache = [];
let tasksCache = [];
let chartInstances = {};
let chartIdCounter = 0;
let boardTitleMap = {};
let calendarView = 'week';
let calendarDate = new Date();
let localizedMonths = [];
let localizedWeekdays = [];
let levelingEnabled = true;
let taskSortable = null;
let settingsMode = 'unlocked';
let settingsChanged = false;
let settingsSaved = false;
let dateFormatting = '';
let authToken = localStorage.getItem('choresToken') || null;
let userPermission = 'write';
let loginEnabled = true;
let editTaskId = null;
let editTaskModal = null;
let customLevelTitles = {};
let personRewardsTarget = null;
let levelTitles = [];
const personRewardsModalEl = document.getElementById('personRewardsModal');
const personRewardTitlesContainer = document.getElementById('personRewardTitlesContainer');
const personRewardTitleInputs = [];
if (personRewardTitlesContainer) {
  for (let i = 0; i < 10; i++) {
    const wrap = document.createElement('div');
    const lbl = document.createElement('label');
    lbl.className = 'form-label person-reward-title-label';
    lbl.setAttribute('for', `personRewardTitle${i}`);
    lbl.textContent = `Levels ${i * 10 + 1}-${(i + 1) * 10}`;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'form-control person-reward-title-input';
    inp.id = `personRewardTitle${i}`;
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    personRewardTitlesContainer.appendChild(wrap);
    personRewardTitleInputs.push(inp);
  }
}

function authHeaders() {
  return authToken ? { 'x-auth-token': authToken } : {};
}

function authFetch(url, options = {}) {
  options.headers = Object.assign({}, authHeaders(), options.headers || {});
  return fetch(url, options).then(res => {
    if (res.status === 401) {
      authToken = null;
      localStorage.removeItem('choresToken');
      checkLogin();
      throw new Error('Unauthorized');
    }
    return res;
  });
}

function setBackground(image) {
  const body = document.body;
  const loginDiv = document.getElementById('loginContainer');
  if (image) {
    const url = `img/${image}`;
    if (body) {
      body.style.backgroundImage = `url('${url}')`;
      body.style.backgroundSize = 'cover';
      body.style.backgroundRepeat = 'no-repeat';
      body.style.backgroundPosition = 'center';
    }
    if (loginDiv) {
      loginDiv.style.backgroundImage = `url('${url}')`;
    }
  } else {
    if (body) body.style.backgroundImage = '';
    if (loginDiv) loginDiv.style.backgroundImage = 'none';
  }
}

async function checkLogin() {
  const savedBg = localStorage.getItem('choresBackground');
  setBackground(savedBg === null ? 'forest.png' : savedBg);
  const app = document.getElementById('app');
  const loginDiv = document.getElementById('loginContainer');
  const res = await fetch('/api/login', { headers: authHeaders() });
  const data = await res.json();
  loginEnabled = data.loginRequired;
  if (!loginEnabled) {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (loginDiv) loginDiv.style.display = 'none';
    if (app) app.style.display = '';
    initApp();
    return;
  }
  if (data.loggedIn) {
    userPermission = data.permission || 'write';
    if (loginDiv) loginDiv.style.display = 'none';
    if (app) app.style.display = '';
    initApp();
    return;
  }
  if (loginDiv) loginDiv.style.display = '';
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUser').value;
      const password = document.getElementById('loginPass').value;
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const out = await resp.json();
      if (resp.ok && out.token) {
        authToken = out.token;
        localStorage.setItem('choresToken', authToken);
        userPermission = out.permission || 'write';
        loginDiv.style.display = 'none';
        if (app) app.style.display = '';
        initApp();
      } else {
        const err = document.getElementById('loginError');
        if (err) err.textContent = out.error || LANGUAGES[currentLang].loginError || 'Login failed';
      }
    });
  }
}

// ==========================
// API: Hämta inställningar från backend
// ==========================
async function fetchUserSettings() {
  try {
    const res = await authFetch('/api/settings');
    if (!res.ok) throw new Error('Failed fetching user settings');
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn('Could not fetch user settings:', e);
    return {};
  }
}

// ==========================
// API: Spara språk till backend
// ==========================
async function saveUserLanguage(lang) {
  try {
    await authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang })
    });
  } catch (e) {
    console.error('Failed saving user language:', e);
  }
}

// ==========================
// Init settings form and save handler
// ==========================
function initSettingsForm(settings) {
  const form = document.getElementById('settingsForm');
  if (!form) return;

  // Reward system selection
  const useLevelSystem = document.getElementById('useLevelSystem');
  const usePointSystem = document.getElementById('usePointSystem');
  const levelSystemCard = document.getElementById('levelSystemCard');
  const pointSystemCard = document.getElementById('pointSystemCard');
  const migrationWarning = document.getElementById('migrationWarning');
  const levelSettings = document.getElementById('levelSettings');
  const pointSettings = document.getElementById('pointSettings');

  // Initialize reward system selection
  const currentSystem = settings.usePointSystem ? 'points' : 'level';
  if (useLevelSystem && usePointSystem) {
    useLevelSystem.checked = currentSystem === 'level';
    usePointSystem.checked = currentSystem === 'points';
    updateRewardSystemUI(currentSystem);
  }

  // Reward system change handlers
  if (useLevelSystem) {
    useLevelSystem.addEventListener('change', () => {
      if (useLevelSystem.checked) {
        updateRewardSystemUI('level');
      }
    });
  }

  if (usePointSystem) {
    usePointSystem.addEventListener('change', () => {
      if (usePointSystem.checked) {
        updateRewardSystemUI('points');
        if (migrationWarning) {
          migrationWarning.classList.remove('d-none');
        }
      }
    });
  }

  // Card click handlers
  if (levelSystemCard) {
    levelSystemCard.addEventListener('click', () => {
      if (useLevelSystem) {
        useLevelSystem.checked = true;
        updateRewardSystemUI('level');
      }
    });
  }

  if (pointSystemCard) {
    pointSystemCard.addEventListener('click', () => {
      if (usePointSystem) {
        usePointSystem.checked = true;
        updateRewardSystemUI('points');
        if (migrationWarning) {
          migrationWarning.classList.remove('d-none');
        }
      }
    });
  }

  function updateRewardSystemUI(system) {
    // Update card styles
    if (levelSystemCard && pointSystemCard) {
      levelSystemCard.classList.toggle('selected', system === 'level');
      pointSystemCard.classList.toggle('selected', system === 'points');
    }

    // Show/hide settings sections
    if (levelSettings) {
      levelSettings.classList.toggle('d-none', system !== 'level');
    }
    if (pointSettings) {
      pointSettings.classList.toggle('d-none', system !== 'points');
    }

    // Update rewards tab visibility
    updateRewardsTabVisibility(system === 'points');

    // Hide migration warning for level system
    if (system === 'level' && migrationWarning) {
      migrationWarning.classList.add('d-none');
    }
  }

  // Other settings
  const showPast = document.getElementById('settingsShowPast');
  const textSize = document.getElementById('settingsTextSize');
  const dateFmt = document.getElementById('settingsDateFmt');
  const useAI = document.getElementById('settingsUseAI');
  const showAnalytics = document.getElementById('settingsShowAnalytics');
  const levelEnable = document.getElementById('settingsLevelEnable');
  const autoUpdate = document.getElementById('settingsAutoUpdate');
  const pushoverEnable = document.getElementById('settingsPushoverEnable');
  const reminderTime = document.getElementById('settingsReminderTime');
  const backgroundSelect = document.getElementById('settingsBackground');
  const editRewardsBtn = document.getElementById('editRewardsBtn');

  if (showPast) showPast.checked = !!settings.showPast;
  if (textSize) textSize.value = settings.textMirrorSize || 'small';
  if (dateFmt) dateFmt.value = settings.dateFormatting || '';
  if (useAI) useAI.checked = settings.useAI !== false;
  if (showAnalytics) showAnalytics.checked = !!settings.showAnalyticsOnMirror;
  if (levelEnable) levelEnable.checked = settings.levelingEnabled !== false;
  if (autoUpdate) autoUpdate.checked = !!settings.autoUpdate;
  if (pushoverEnable) pushoverEnable.checked = !!settings.pushoverEnabled;
  if (reminderTime) reminderTime.value = settings.reminderTime || '';
  if (backgroundSelect) backgroundSelect.value = settings.background || '';

  // Update point totals preview
  updatePointTotalsPreview();

  // Edit rewards button handler
  if (editRewardsBtn) {
    editRewardsBtn.addEventListener('click', () => {
      const rewardsModal = document.getElementById('rewardsModal');
      if (rewardsModal) {
        const modal = new bootstrap.Modal(rewardsModal);
        modal.show();
      }
    });
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newSettings = {
      usePointSystem: usePointSystem ? usePointSystem.checked : false,
      showPast: showPast ? showPast.checked : false,
      textMirrorSize: textSize ? textSize.value : 'small',
      dateFormatting: dateFmt ? dateFmt.value : '',
      useAI: useAI ? useAI.checked : false,
      showAnalyticsOnMirror: showAnalytics ? showAnalytics.checked : false,
      levelingEnabled: levelEnable ? levelEnable.checked : false,
      autoUpdate: autoUpdate ? autoUpdate.checked : false,
      pushoverEnabled: pushoverEnable ? pushoverEnable.checked : false,
      reminderTime: reminderTime ? reminderTime.value : '',
      background: backgroundSelect ? backgroundSelect.value : ''
    };

    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      settingsSaved = true;
      setBackground(newSettings.background);
      localStorage.setItem('choresBackground', newSettings.background || '');
      
      // Update rewards tab based on new system
      updateRewardsTabVisibility(newSettings.usePointSystem);
      
      // Refresh data if switching systems
      if (settings.usePointSystem !== newSettings.usePointSystem) {
        if (newSettings.usePointSystem) {
          await fetchRewards();
          await fetchRedemptions();
        }
        await fetchPeople();
      }

      showToast('Settings saved successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
    } catch (e) {
      console.error('Failed to save settings:', e);
      showToast(e.message || 'Failed to save settings', 'danger');
    }
  });
}

function updateRewardsTabVisibility(usePointSystem) {
  // Show/hide rewards management section in settings
  const rewardsSection = document.getElementById('rewardsManagementSection');
  if (rewardsSection) {
    if (usePointSystem) {
      rewardsSection.classList.remove('d-none');
      loadSettingsRewards();
      loadSettingsPeoplePoints();
    } else {
      rewardsSection.classList.add('d-none');
    }
  }
}

function updatePointTotalsPreview() {
  const preview = document.getElementById('pointTotalsPreview');
  if (!preview) return;
  
  if (peopleCache.length === 0) {
    preview.textContent = 'No people added yet';
    return;
  }
  
  const pointsText = peopleCache.map(person => {
    const points = person.points || 0;
    return `${person.name}: ${points} points`;
  }).join('\n');
  
  preview.textContent = pointsText || 'Loading point totals...';
}

function openSettingsToRewardSystem() {
  const settingsModal = document.getElementById('settingsModal');
  const usePointSystem = document.getElementById('usePointSystem');
  
  if (settingsModal && usePointSystem) {
    const modal = new bootstrap.Modal(settingsModal);
    modal.show();
    
    // After modal opens, select point system
    setTimeout(() => {
      usePointSystem.checked = true;
      usePointSystem.dispatchEvent(new Event('change'));
    }, 500);
  }
}

// ==========================
// Uppdatera boardTitleMap
// ==========================
function updateBoardTitleMap() {
  boardTitleMap = { ...LANGUAGES[currentLang].chartOptions };
}

// ==========================
// Sätt språk och uppdatera UI
// ==========================
function setLanguage(lang) {
  if (!LANGUAGES[lang]) return;
  currentLang = lang;
  localStorage.setItem("mmm-chores-lang", lang);
  document.documentElement.setAttribute('lang', lang);

  const t = LANGUAGES[lang];

  localizedMonths = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i).toLocaleDateString(lang, { month: "short" })
  );
  localizedWeekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2021, 5, 7 + i); // Monday based
    return d.toLocaleDateString(lang, { weekday: "short" });
  });

  document.querySelector(".hero h1").textContent = t.title;
  document.querySelector(".hero small").textContent = t.subtitle;

  const loginTitle = document.querySelector('#loginContainer h2');
  if (loginTitle) loginTitle.textContent = t.loginTitle || 'Login';
  const loginUserLbl = document.querySelector("label[for='loginUser']");
  if (loginUserLbl) loginUserLbl.textContent = t.loginUsername || 'Username';
  const loginUserInput = document.getElementById('loginUser');
  if (loginUserInput) loginUserInput.placeholder = t.loginUsername || 'Username';
  const loginPassLbl = document.querySelector("label[for='loginPass']");
  if (loginPassLbl) loginPassLbl.textContent = t.loginPassword || 'Password';
  const loginPassInput = document.getElementById('loginPass');
  if (loginPassInput) loginPassInput.placeholder = t.loginPassword || 'Password';
  const loginBtnEl = document.getElementById('loginBtn');
  if (loginBtnEl) loginBtnEl.textContent = t.loginButton || 'Login';

  const tabs = document.querySelectorAll(".nav-link");
  if (tabs[0]) tabs[0].textContent = t.tabs[0];
  if (tabs[1]) tabs[1].textContent = t.tabs[1];
  if (tabs[2]) tabs[2].textContent = t.tabs[2] || 'Rewards';

  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) themeToggleBtn.title = t.toggleTheme || 'Toggle theme';

  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) settingsBtn.title = t.settingsBtnTitle || 'Settings';
  const modalTitle = document.getElementById("settingsModalLabel");
  if (modalTitle) modalTitle.textContent = t.settingsTitle || 'Settings';
  const saveBtn = document.getElementById("settingsSaveBtn");
  if (saveBtn) saveBtn.textContent = t.saveButton || 'Save';
  const editRewardsBtn = document.getElementById('editRewardsBtn');
  if (editRewardsBtn) editRewardsBtn.textContent = t.editRewardsButton || 'Edit Rewards';
  const rewardsTitle = document.getElementById('rewardsModalLabel');
  if (rewardsTitle) rewardsTitle.textContent = t.editRewardsButton || 'Edit Rewards';
  const rewardsSave = document.getElementById('rewardsSaveBtn');
  if (rewardsSave) rewardsSave.textContent = t.saveButton || 'Save';
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.title = t.logout || 'Logout';
  const showPastLbl = document.querySelector("label[for='settingsShowPast']");
  if (showPastLbl) showPastLbl.textContent = t.showPastLabel || 'Show past tasks';
  const showAnalyticsLbl = document.querySelector("label[for='settingsShowAnalytics']");
  if (showAnalyticsLbl) showAnalyticsLbl.textContent = t.analyticsOnMirrorLabel || 'Analytics on mirror';
  const useAiLbl = document.querySelector("label[for='settingsUseAI']");
  if (useAiLbl) useAiLbl.textContent = t.useAiLabel || 'Use AI features';
  const textSizeLbl = document.querySelector("label[for='settingsTextSize']");
  if (textSizeLbl) textSizeLbl.textContent = t.textSizeLabel || 'Mirror text size';
  const textSizeSelect = document.getElementById('settingsTextSize');
  if (textSizeSelect && t.textSizeOptions) {
    Array.from(textSizeSelect.options).forEach(opt => {
      if (t.textSizeOptions[opt.value]) opt.textContent = t.textSizeOptions[opt.value];
    });
  }
  const dateFmtLbl = document.querySelector("label[for='settingsDateFmt']");
  if (dateFmtLbl) dateFmtLbl.textContent = t.dateFormatLabel || 'Date format';
  const dateFmtSelect = document.getElementById('settingsDateFmt');
  if (dateFmtSelect && t.dateFormatOptions) {
    const noneOpt = Array.from(dateFmtSelect.options).find(o => o.value === '');
    if (noneOpt) noneOpt.textContent = t.dateFormatOptions.none;
  }
  const levelEnableLbl = document.querySelector("label[for='settingsLevelEnable']");
  if (levelEnableLbl) levelEnableLbl.textContent = t.levelingEnabledLabel;
  const autoUpdateLbl = document.querySelector("label[for='settingsAutoUpdate']");
  if (autoUpdateLbl) autoUpdateLbl.textContent = t.autoUpdateLabel || 'Enable autoupdate';
  const pushoverEnableLbl = document.querySelector("label[for='settingsPushoverEnable']");
  if (pushoverEnableLbl) pushoverEnableLbl.textContent = t.pushoverEnabledLabel || 'Enable Pushover';
  const reminderTimeLbl = document.querySelector("label[for='settingsReminderTime']");
  if (reminderTimeLbl) reminderTimeLbl.textContent = t.reminderTimeLabel || 'Reminder time';
  const backgroundLbl = document.querySelector("label[for='settingsBackground']");
  if (backgroundLbl) backgroundLbl.textContent = t.backgroundLabel || 'Background';
  const backgroundSelect = document.getElementById('settingsBackground');
  if (backgroundSelect && t.backgroundOptions) {
    Array.from(backgroundSelect.options).forEach(opt => {
      let key;
      switch (opt.value) {
        case "":
          key = 'none';
          break;
        case 'forest.png':
          key = 'autumn';
          break;
        case 'winter.png':
          key = 'winter';
          break;
        case 'summer.png':
          key = 'summer';
          break;
        case 'spring.png':
          key = 'spring';
          break;
      }
      if (key && t.backgroundOptions[key]) opt.textContent = t.backgroundOptions[key];
    });
  }
  const yearsLbl = document.querySelector("label[for='rewardsYears']");
  if (yearsLbl) yearsLbl.textContent = t.yearsToMaxLabel;
  const perWeekLbl = document.querySelector("label[for='rewardsPerWeek']");
  if (perWeekLbl) perWeekLbl.textContent = t.choresPerWeekLabel;
  const modeLbl = document.querySelector("label[for='rewardsLevelMode']");
  if (modeLbl) modeLbl.textContent = t.levelingModeLabel;
  const modeSelect = document.getElementById('rewardsLevelMode');
  if (modeSelect && t.levelingModeOptions) {
    Array.from(modeSelect.options).forEach(opt => {
      if (t.levelingModeOptions[opt.value]) opt.textContent = t.levelingModeOptions[opt.value];
    });
  }
  const choresMaxLbl = document.querySelector("label[for='rewardsChoresToMax']");
  if (choresMaxLbl) choresMaxLbl.textContent = t.choresToMaxLabel;
  const rewardTitlesLbl = document.getElementById('rewardTitlesLabel');
  if (rewardTitlesLbl) rewardTitlesLbl.textContent = t.rewardTitlesLabel || 'Reward titles';
  document.querySelectorAll('.reward-title-label').forEach((lbl, idx) => {
    lbl.textContent = `${t.levelRangeLabel || 'Levels'} ${idx * 10 + 1}-${(idx + 1) * 10}`;
  });
  const personRewardsListLbl = document.getElementById('personRewardsListLabel');
  if (personRewardsListLbl) personRewardsListLbl.textContent = t.customRewardsLabel || 'Custom rewards per person';
  renderPersonRewardsList();
  const personRewardTitlesLbl = document.getElementById('personRewardTitlesLabel');
  if (personRewardTitlesLbl) personRewardTitlesLbl.textContent = t.rewardTitlesLabel || 'Reward titles';
  document.querySelectorAll('.person-reward-title-label').forEach((lbl, idx) => {
    lbl.textContent = `${t.levelRangeLabel || 'Levels'} ${idx * 10 + 1}-${(idx + 1) * 10}`;
  });
  const personRewardsTitle = document.getElementById('personRewardsModalLabel');
  if (personRewardsTitle) personRewardsTitle.textContent = t.editRewardsButton || 'Edit Rewards';
  const viewRewardsTitle = document.getElementById('viewRewardsModalLabel');
  if (viewRewardsTitle) viewRewardsTitle.textContent = t.viewRewardsButton || 'Rewards';
  const personRewardsSave = document.getElementById('personRewardsSaveBtn');
  if (personRewardsSave) personRewardsSave.textContent = t.saveButton || 'Save';
  const personRewardsRemove = document.getElementById('personRewardsRemoveBtn');
  if (personRewardsRemove) personRewardsRemove.textContent = t.remove || 'Remove';

  const peopleHeader = document.getElementById("peopleHeader");
  if (peopleHeader) peopleHeader.textContent = t.peopleTitle;
  const peopleInput = document.getElementById("personName");
  if (peopleInput) peopleInput.placeholder = t.newPersonPlaceholder;
  const personAddBtn = document.querySelector("#personForm button");
  if (personAddBtn) personAddBtn.title = t.addPersonBtnTitle;

  const tasksHeader = document.getElementById("tasksHeader");
  if (tasksHeader) tasksHeader.textContent = t.taskTitle;
  const doneLabel = document.getElementById("doneLabel");
  if (doneLabel) doneLabel.textContent = ` ${t.taskDoneLabel}`;
  const pendingLabel = document.getElementById("pendingLabel");
  if (pendingLabel) pendingLabel.textContent = ` ${t.taskPendingLabel}`;
  const taskInput = document.getElementById("taskName");
  if (taskInput) taskInput.placeholder = t.taskNamePlaceholder;
  const recurringSelect = document.getElementById("taskRecurring");
  if (recurringSelect && t.taskRecurring) {
    Array.from(recurringSelect.options).forEach(opt => {
      const key = opt.value || "none";
      if (t.taskRecurring[key]) opt.textContent = t.taskRecurring[key];
    });
  }
  const taskAddBtn = document.getElementById("btnAddTask");
  if (taskAddBtn) taskAddBtn.innerHTML = `<i class='bi bi-plus-lg me-1'></i>${t.taskAddButton}`;
  if (aiBtn) {
    aiBtn.innerHTML = `<i class='bi bi-stars me-1'></i>${t.aiGenerateButton}`;
    aiBtn.title = t.aiGenerateTitle;
  }

  const analyticsHeader = document.getElementById("analyticsHeader");
  if (analyticsHeader) analyticsHeader.textContent = t.analyticsTitle;
  const addChartSelect = document.getElementById("addChartSelect");
  if (addChartSelect) {
    addChartSelect.options[0].textContent = t.addChartOption;
    Object.entries(t.chartOptions).forEach(([key, val]) => {
      const option = Array.from(addChartSelect.options).find(o => o.value === key);
      if (option) option.textContent = val;
    });
  }

  const footer = document.getElementById("footerText");
  if (footer) footer.textContent = t.footer;

  document.querySelectorAll("select").forEach(select => {
    const unassignedOption = Array.from(select.options).find(opt => opt.value === "");
    if (unassignedOption) unassignedOption.textContent = t.unassigned;
  });

  updateBoardTitleMap();
  renderPeople();
  renderTasks();
  renderCalendar();

  Object.entries(chartInstances).forEach(([id, chart]) => {
    const cardHeaderSpan = document.querySelector(`#${id}`).closest(".card").querySelector(".card-header span");
    if (cardHeaderSpan && boardTitleMap[chart.boardType]) {
      cardHeaderSpan.textContent = boardTitleMap[chart.boardType];
    }
  });
}

// ==========================
// Fetch People & Tasks
// ==========================
async function fetchPeople() {
  const res = await authFetch("/api/people");
  peopleCache = await res.json();
  
  // If using point system, fetch and add points for each person
  if (userSettings?.usePointSystem) {
    try {
      const pointsRes = await authFetch("/api/people-points");
      const peoplePoints = await pointsRes.json();
      
      // Add points to each person
      peopleCache.forEach(person => {
        const pointData = peoplePoints.find(p => p.id === person.id);
        person.points = pointData ? pointData.points : 0;
      });
    } catch (error) {
      console.error('Error fetching people points:', error);
      // Set default points if error
      peopleCache.forEach(person => {
        person.points = 0;
      });
    }
  }
  
  renderPeople();
  renderPeoplePoints(); // Update points display when people data changes
}

async function fetchTasks() {
  const res = await authFetch("/api/tasks");
  tasksCache = await res.json();
  tasksCache.sort((a, b) => {
    if (a.deleted && !b.deleted) return 1;
    if (!a.deleted && b.deleted) return -1;
    return (a.order || 0) - (b.order || 0);
  });
  renderTasks();
  renderCalendar();
}

async function applySettings(newSettings) {
  if (typeof newSettings.levelingEnabled === 'boolean') {
    levelingEnabled = newSettings.levelingEnabled;
  }
  if (newSettings.useAI !== undefined) {
    const aiButton = document.getElementById('btnAiGenerate');
    if (aiButton) aiButton.style.display = newSettings.useAI === false ? 'none' : '';
  }
  if (newSettings.dateFormatting !== undefined) {
    dateFormatting = newSettings.dateFormatting;
  }
  if (Array.isArray(newSettings.levelTitles)) {
    levelTitles = newSettings.levelTitles;
  }
  if (newSettings.background !== undefined) {
    setBackground(newSettings.background);
    localStorage.setItem('choresBackground', newSettings.background || '');
  }
  await fetchPeople();
  await fetchTasks();
}

function openPersonRewards(person) {
  personRewardsTarget = person;
  const titles = customLevelTitles[person.name] || [];
  for (let i = 0; i < personRewardTitleInputs.length; i++) {
    personRewardTitleInputs[i].value = titles[i] || '';
  }
  const removeBtn = document.getElementById('personRewardsRemoveBtn');
  if (removeBtn) removeBtn.style.display = customLevelTitles[person.name] ? '' : 'none';
  const modalTitle = document.getElementById('personRewardsModalLabel');
  const t = LANGUAGES[currentLang];
  if (modalTitle) modalTitle.textContent = `${t.editRewardsButton || 'Edit Rewards'} - ${person.name}`;
  const modal = personRewardsModalEl ? new bootstrap.Modal(personRewardsModalEl) : null;
  if (modal) modal.show();
}

function showPersonRewards(person) {
  const list = document.getElementById('viewRewardsList');
  if (!list) return;
  list.innerHTML = '';
  const t = LANGUAGES[currentLang];
  const titles = (customLevelTitles[person.name] && customLevelTitles[person.name].length)
    ? customLevelTitles[person.name]
    : levelTitles;
  for (let i = 0; i < 10; i++) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between';
    const range = document.createElement('span');
    range.textContent = `${t.levelRangeLabel || 'Levels'} ${i * 10 + 1}-${(i + 1) * 10}`;
    const txt = document.createElement('span');
    txt.textContent = titles[i] || '';
    li.appendChild(range);
    li.appendChild(txt);
    list.appendChild(li);
  }
  const modalTitle = document.getElementById('viewRewardsModalLabel');
  if (modalTitle) modalTitle.textContent = `${t.viewRewardsButton || 'Rewards'} - ${person.name}`;
  const modalEl = document.getElementById('viewRewardsModal');
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
  if (modal) modal.show();
}

function showRedeemRewards(person) {
  // Set the person for redemption
  const redeemPersonSelect = document.getElementById('redeemPerson');
  if (redeemPersonSelect) {
    redeemPersonSelect.value = person.id;
    redeemPersonSelect.dispatchEvent(new Event('change'));
  }
  
  // Show the redeem modal
  const modalEl = document.getElementById('redeemRewardModal');
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
  if (modal) modal.show();
}

function renderPersonRewardsList() {
  const list = document.getElementById('personRewardsList');
  if (!list) return;
  list.innerHTML = '';
  if (peopleCache.length === 0) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-center text-muted';
    li.textContent = LANGUAGES[currentLang].noPeople;
    list.appendChild(li);
    return;
  }
  for (const person of peopleCache) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    const span = document.createElement('span');
    span.textContent = person.name;
    li.appendChild(span);
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-secondary btn-sm';
    btn.textContent = LANGUAGES[currentLang].editRewardsButton || 'Edit Rewards';
    btn.onclick = () => openPersonRewards(person);
    li.appendChild(btn);
    list.appendChild(li);
  }
}

// ==========================
// Render People & Tasks
// ==========================
function renderPeople() {
  const list = document.getElementById("peopleList");
  list.innerHTML = "";

  if (peopleCache.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item text-center text-muted";
    li.textContent = LANGUAGES[currentLang].noPeople;
    list.appendChild(li);
    return;
  }

  for (const person of peopleCache) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    const info = document.createElement("span");
    info.textContent = person.name;
    
    // Show level info for level system
    if (levelingEnabled && person.level && !userSettings?.usePointSystem) {
      const small = document.createElement("small");
      small.className = "ms-2 text-muted";
      const titlePart = person.title ? ` - ${person.title}` : "";
      small.textContent = `lvl${person.level}${titlePart}`;
      info.appendChild(small);
    }
    
    // Show points for point system
    if (levelingEnabled && userSettings?.usePointSystem && person.points !== undefined) {
      const small = document.createElement("small");
      small.className = "ms-2 text-muted";
      small.textContent = `${person.points} points`;
      info.appendChild(small);
    }

    li.appendChild(info);

    if (userPermission === 'write') {
      const actions = document.createElement('div');
      actions.className = 'btn-group btn-group-sm';
      if (levelingEnabled) {
        if (userSettings?.usePointSystem) {
          // Redeem rewards button for point system
          const redeemBtn = document.createElement('button');
          redeemBtn.className = 'btn btn-outline-success';
          redeemBtn.title = 'Redeem Rewards';
          redeemBtn.innerHTML = '<i class="bi bi-gift"></i>';
          redeemBtn.onclick = () => showRedeemRewards(person);
          actions.appendChild(redeemBtn);
        } else {
          // View rewards button for level system
          const viewBtn = document.createElement('button');
          viewBtn.className = 'btn btn-outline-secondary';
          viewBtn.title = LANGUAGES[currentLang].viewRewardsButton || 'Rewards';
          viewBtn.innerHTML = '<i class="bi bi-gift"></i>';
          viewBtn.onclick = () => showPersonRewards(person);
          actions.appendChild(viewBtn);
        }
      }
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-outline-danger';
      delBtn.title = LANGUAGES[currentLang].remove;
      delBtn.innerHTML = '<i class="bi bi-trash"></i>';
      delBtn.onclick = () => deletePerson(person.id);
      actions.appendChild(delBtn);
      li.appendChild(actions);
    }
    list.appendChild(li);
  }
  const taskPerson = document.getElementById('taskPerson');
  const editPerson = document.getElementById('editTaskPerson');
  if (taskPerson) {
    taskPerson.innerHTML = '';
    taskPerson.add(new Option(LANGUAGES[currentLang].unassigned, ''));
    peopleCache.forEach(p => {
      taskPerson.add(new Option(p.name, p.id));
    });
  }
  if (editPerson) {
    editPerson.innerHTML = '';
    editPerson.add(new Option(LANGUAGES[currentLang].unassigned, ''));
    peopleCache.forEach(p => {
      editPerson.add(new Option(p.name, p.id));
    });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const [, yyyy, mm, dd] = match;

  let fmt =
    dateFormatting !== undefined && dateFormatting !== null
      ? dateFormatting
      : 'yyyy-mm-dd';

  if (fmt === '') return '';

  fmt = fmt.replace(/yyyy/gi, yyyy);
  fmt = fmt.replace(/mm/gi, mm);
  fmt = fmt.replace(/dd/gi, dd);

  fmt = fmt.replace(/YYYY/g, yyyy);
  fmt = fmt.replace(/MM/g, mm);
  fmt = fmt.replace(/DD/g, dd);

  return fmt;
}

function renderTasks() {
  const canWrite = userPermission === 'write';
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  if (tasksCache.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item text-center text-muted";
    li.textContent = LANGUAGES[currentLang].noTasks;
    list.appendChild(li);
    return;
  }

  for (const task of tasksCache.filter(t => !t.deleted)) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center";
    li.dataset.id = task.id;

    const left = document.createElement("div");
    left.className = "d-flex align-items-center";

    const actions = document.createElement("div");
    actions.className = "d-flex align-items-center ms-auto gap-1";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = task.done;
    chk.className = "form-check-input me-3";
    if (canWrite) {
      chk.addEventListener("change", async () => {
        const updateObj = { done: chk.checked };

      const now = new Date();
      const iso = now.toISOString();

      const pad = n => n.toString().padStart(2, "0");
      const stamp = (prefix) => (
        prefix +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        pad(now.getHours()) +
        pad(now.getMinutes())
      );

      if (chk.checked) {
        updateObj.finished = iso;
        updateObj.finishedShort = stamp("F");
      } else {
        updateObj.finished = null;
        updateObj.finishedShort = null;
      }
      await updateTask(task.id, updateObj);
    });
    } else {
      chk.disabled = true;
    }

  const span = document.createElement("span");
  const formatted = formatDate(task.date);
  span.innerHTML = `<strong>${task.name}</strong>`;
  if (formatted) {
    span.innerHTML += ` <small class="task-date">(${formatted})</small>`;
  }
  if (task.recurring && task.recurring !== "none") {
    const recurText = LANGUAGES[currentLang].taskRecurring[task.recurring] || task.recurring;
    span.innerHTML += ` <span class="badge bg-info text-dark">${recurText}</span>`;
  }
  if (task.points && task.points > 1) {
    span.innerHTML += ` <span class="badge bg-warning text-dark">${task.points} pts</span>`;
  }
  if (task.done) span.classList.add("task-done");
  const person = peopleCache.find(p => p.id === task.assignedTo);
  const personName = person ? person.name : LANGUAGES[currentLang].unassigned;
  span.innerHTML += ` - ${personName}`;

    left.appendChild(chk);
    left.appendChild(span);

    if (canWrite) {
      const del = document.createElement("button");
      del.className = "btn btn-sm btn-outline-danger";
      del.title = LANGUAGES[currentLang].remove;
      del.innerHTML = '<i class="bi bi-trash"></i>';
      del.addEventListener("click", () => deleteTask(task.id));

      const dragBtn = document.createElement("button");
      dragBtn.className = "btn btn-sm btn-outline-secondary drag-handle";
      dragBtn.innerHTML = '<i class="bi bi-list"></i>';

      if (!task.done) {
        const edit = document.createElement("button");
        edit.className = "btn btn-sm btn-outline-secondary";
        edit.title = LANGUAGES[currentLang].edit;
        edit.innerHTML = '<i class="bi bi-pencil"></i>';
        edit.addEventListener("click", () => openEditModal(task));
        actions.appendChild(edit);
      }
      actions.appendChild(del);
      actions.appendChild(dragBtn);
    }

    if (actions.childElementCount > 0) {
      li.append(left, actions);
    } else {
      li.append(left);
    }

    list.appendChild(li);
  }


  if (taskSortable) {
    taskSortable.destroy();
    taskSortable = null;
  }
  if (canWrite) {
    taskSortable = new Sortable(list, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async (evt) => {
        const visible = tasksCache.filter(t => !t.deleted);
        const moved = visible.splice(evt.oldIndex, 1)[0];
        visible.splice(evt.newIndex, 0, moved);
        let i = 0;
        tasksCache = tasksCache.map(t => t.deleted ? t : visible[i++]);
        const ids = tasksCache.filter(t => !t.deleted).map(t => t.id);
        await authFetch('/api/tasks/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ids)
        });
      }
    });
  }
}

function openEditModal(task) {
  editTaskId = task.id;
  const nameInput = document.getElementById('editTaskName');
  const dateInput = document.getElementById('editTaskDate');
  const personSelect = document.getElementById('editTaskPerson');
  if (nameInput) nameInput.value = task.name;
  if (dateInput) dateInput.value = task.date || '';
  if (personSelect) personSelect.value = task.assignedTo || '';
  if (!editTaskModal) {
    const modalEl = document.getElementById('editTaskModal');
    if (modalEl) editTaskModal = new bootstrap.Modal(modalEl);
  }
  if (editTaskModal) editTaskModal.show();
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function renderCalendar() {
  const container = document.getElementById("taskCalendar");
  if (!container) return;

  const undone = tasksCache.filter(t => !t.deleted && !t.done);
  if (undone.length === 0) {
    container.innerHTML = `<p class="text-center text-muted">${LANGUAGES[currentLang].noTasks}</p>`;
    return;
  }

  const tasksByDate = {};
  undone.forEach(t => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  });

  const weekdays = localizedWeekdays.length ? localizedWeekdays : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const pad = n => String(n).padStart(2, '0');

  let html = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <button class="btn btn-sm btn-outline-secondary" id="calPrev">&lt;</button>
      <span id="calTitle" class="fw-bold"></span>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" id="calToggle">${calendarView === 'week' ? LANGUAGES[currentLang].monthLabel : LANGUAGES[currentLang].weekLabel}</button>
        <button class="btn btn-sm btn-outline-secondary" id="calNext">&gt;</button>
      </div>
    </div>`;

  html += '<table class="table table-bordered table-sm">';
  html += '<thead><tr>' + weekdays.map(d => `<th class="text-center">${d}</th>`).join('') + '</tr></thead><tbody>';

  if (calendarView === 'month') {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday as first day
    const last = new Date(year, month + 1, 0);
    const totalDays = last.getDate();
    let day = 1;
    for (let w = 0; w < 6 && day <= totalDays; w++) {
      html += '<tr>';
      for (let d = 0; d < 7; d++) {
        if ((w === 0 && d < startDay) || day > totalDays) {
          html += '<td></td>';
        } else {
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const arr = tasksByDate[dateStr] || [];
          html += `<td class="align-top"><div><strong>${day}</strong></div>`;
          arr.forEach(t => { html += `<div class="small">${t.name}</div>`; });
          html += '</td>';
          day++;
        }
      }
      html += '</tr>';
    }
  } else {
    const start = new Date(calendarDate);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    html += '<tr>';
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const arr = tasksByDate[dateStr] || [];
      html += `<td class="align-top"><div><strong>${d.getDate()}</strong></div>`;
      arr.forEach(t => { html += `<div class="small">${t.name}</div>`; });
      html += '</td>';
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  const titleEl = document.getElementById('calTitle');
  if (calendarView === 'month') {
    const months = localizedMonths.length ? localizedMonths : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    titleEl.textContent = `${months[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;
  } else {
    titleEl.textContent = `${LANGUAGES[currentLang].weekLabel} ${getWeekNumber(calendarDate)} ${calendarDate.getFullYear()}`;
  }

  document.getElementById('calPrev').onclick = () => {
    if (calendarView === 'month') {
      calendarDate.setMonth(calendarDate.getMonth() - 1);
    } else {
      calendarDate.setDate(calendarDate.getDate() - 7);
    }
    renderCalendar();
  };
  document.getElementById('calNext').onclick = () => {
    if (calendarView === 'month') {
      calendarDate.setMonth(calendarDate.getMonth() + 1);
    } else {
      calendarDate.setDate(calendarDate.getDate() + 7);
    }
    renderCalendar();
  };
  document.getElementById('calToggle').onclick = () => {
    calendarView = calendarView === 'week' ? 'month' : 'week';
    renderCalendar();
  };
}

// ==========================
// CRUD Handlers
// ==========================
const personRewardsForm = document.getElementById('personRewardsForm');
if (personRewardsForm) {
  personRewardsForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!personRewardsTarget) return;
    const titles = personRewardTitleInputs.map(inp => inp.value);
    if (titles.every(t => !t.trim())) {
      delete customLevelTitles[personRewardsTarget.name];
    } else {
      customLevelTitles[personRewardsTarget.name] = titles;
    }
    try {
      await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customLevelTitles })
      });
      const modal = bootstrap.Modal.getInstance(personRewardsModalEl);
      if (modal) modal.hide();
      await fetchPeople();
    } catch (err) {
      console.error('Failed saving custom rewards', err);
    }
  });
}
const personRewardsRemoveBtn = document.getElementById('personRewardsRemoveBtn');
if (personRewardsRemoveBtn) {
  personRewardsRemoveBtn.addEventListener('click', async () => {
    if (!personRewardsTarget) return;
    delete customLevelTitles[personRewardsTarget.name];
    try {
      await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customLevelTitles })
      });
      const modal = bootstrap.Modal.getInstance(personRewardsModalEl);
      if (modal) modal.hide();
      await fetchPeople();
    } catch (err) {
      console.error('Failed removing custom rewards', err);
    }
  });
}

document.getElementById("personForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("personName").value.trim();
  if (!name) return;
  await authFetch("/api/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  e.target.reset();
  await fetchPeople();
  await fetchTasks();
});

document.getElementById("taskForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("taskName").value.trim();
  let date = document.getElementById("taskDate").value;
  const recurring = document.getElementById("taskRecurring").value;
  const assigned = document.getElementById("taskPerson").value;
  const points = document.getElementById("taskPoints").value || 1;
  if (!name) return;
  if (!date) date = new Date().toISOString().split("T")[0];

  const now = new Date();
  const iso = now.toISOString();
  const pad = n => n.toString().padStart(2, "0");
  const stamp = (prefix) => (
    prefix +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes())
  );

  await authFetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      date,
      recurring,
      assignedTo: assigned ? parseInt(assigned) : null,
      points: parseInt(points),
      created: iso,
      createdShort: stamp("C")
    })
  });
  e.target.reset();
  document.getElementById("taskPoints").value = 1; // Reset points to default
  await fetchTasks();
});

document.getElementById('editTaskForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('editTaskName').value.trim();
  const date = document.getElementById('editTaskDate').value;
  const assigned = document.getElementById('editTaskPerson').value;
  await updateTask(editTaskId, {
    name,
    date,
    assignedTo: assigned ? parseInt(assigned) : null
  });
  if (editTaskModal) editTaskModal.hide();
  editTaskId = null;
});

async function updateTask(id, changes) {
  Object.keys(changes).forEach(key => {
    if (changes[key] === null) changes[key] = undefined;
  });
  await authFetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes)
  });
  await fetchTasks();
}

async function deletePerson(id) {
  await authFetch(`/api/people/${id}`, { method: "DELETE" });
  await fetchPeople();
  await fetchTasks();
}

async function deleteTask(id) {
  await authFetch(`/api/tasks/${id}`, { method: "DELETE" });
  await fetchTasks();
}


// ==========================
// Analytics Board Persistence
// ==========================
async function fetchSavedBoards() {
  try {
    const res = await authFetch('/api/analyticsBoards');
    if (!res.ok) throw new Error('Failed fetching saved boards');
    return await res.json();
  } catch (e) {
    console.warn('No saved analytics boards or error:', e);
    return [];
  }
}

async function saveBoards(typesArray) {
  try {
    await authFetch('/api/analyticsBoards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typesArray)
    });
  } catch (e) {
    console.error('Failed saving analytics boards:', e);
  }
}

function getCurrentBoardTypes() {
  return Array.from(document.querySelectorAll('#analyticsContainer .card-header span'))
    .map(span => {
      const text = span.textContent.trim();
      for (const [key, title] of Object.entries(boardTitleMap)) {
        if (title === text) return key;
      }
      return null;
    }).filter(Boolean);
}

// ==========================
// Analytics Chart Handling
// ==========================
document.getElementById("addChartSelect").addEventListener("change", function () {
  const value = this.value;
  if (!value) return;
  addChart(value);
  this.value = "";
});

function addChart(type) {
  if (getCurrentBoardTypes().includes(type)) return; // no duplicates

  const container = document.getElementById("analyticsContainer");
  const card = document.createElement("div");
  card.className = "col-md-6";

  const cardId = `chart-${chartIdCounter++}`;
  card.innerHTML = `
    <div class="card card-shadow h-100">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>${boardTitleMap[type]}</span>
        <button class="btn btn-sm btn-outline-danger remove-widget" title="${LANGUAGES[currentLang].remove}">&times;</button>
      </div>
      <div class="card-body"><canvas id="${cardId}"></canvas></div>
    </div>
  `;

  container.appendChild(card);
  chartInstances[cardId] = renderChart(cardId, type);

  saveBoards(getCurrentBoardTypes());

  card.querySelector(".remove-widget").addEventListener("click", () => {
    chartInstances[cardId].destroy();
    delete chartInstances[cardId];
    card.remove();
    saveBoards(getCurrentBoardTypes());
  });
}

function renderChart(canvasId, type) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  let data = { labels: [], datasets: [] };
  let options = { scales: { y: { beginAtZero: true } } };
  let chartType = "bar";

  const filteredTasks = (filterFn) => tasksCache.filter(t => !(t.deleted && !t.done) && filterFn(t));

  switch (type) {
    case "weekly": {
      const today = new Date();
      const labels = [];
      const counts = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i * 7);
        labels.push(d.toISOString().split("T")[0]);
        const c = filteredTasks(t => {
          const td = new Date(t.date);
          return t.done && ((today - td) / 86400000) >= i * 7 && ((today - td) / 86400000) < (i + 1) * 7;
        }).length;
        counts.push(c);
      }
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartLabels.completedTasks,
          data: counts,
          backgroundColor: "rgba(75,192,192,0.5)"
        }]
      };
      break;
    }

    case "weekdays": {
      chartType = "pie";
      const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const dataArr = [0,0,0,0,0,0,0];
      filteredTasks(t => true).forEach(t => {
        const idx = (new Date(t.date).getDay() + 6) % 7;
        dataArr[idx]++;
      });
      data = {
        labels,
        datasets: [{
          data: dataArr,
          backgroundColor: [
            "#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF","#FF9F40","#C9CBCF"
          ]
        }]
      };
      options = {};
      break;
    }

    case "perPerson": {
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        filteredTasks(t => t.assignedTo === p.id).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartLabels.unfinishedTasks,
          data: counts,
          backgroundColor: "rgba(153,102,255,0.5)"
        }]
      };
      break;
    }

    case "perPersonFinished": {
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        filteredTasks(t => t.assignedTo === p.id && t.done).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.perPersonFinished,
          data: counts,
          backgroundColor: "rgba(75,192,192,0.5)"
        }]
      };
      break;
    }

    case "perPersonFinishedWeek": {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        filteredTasks(t => {
          if (!t.done || t.assignedTo !== p.id) return false;
          const d = new Date(t.date);
          return d >= start && d < end;
        }).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.perPersonFinishedWeek,
          data: counts,
          backgroundColor: "rgba(75,192,192,0.5)"
        }]
      };
      break;
    }

    case "perPersonUnfinished": {
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        filteredTasks(t => t.assignedTo === p.id && !t.done).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.perPersonUnfinished,
          data: counts,
          backgroundColor: "rgba(255,99,132,0.5)"
        }]
      };
      break;
    }

    case "perPersonUnfinishedWeek": {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        filteredTasks(t => {
          if (t.done || t.assignedTo !== p.id) return false;
          const d = new Date(t.date);
          return d >= start && d < end;
        }).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.perPersonUnfinishedWeek,
          data: counts,
          backgroundColor: "rgba(255,99,132,0.5)"
        }]
      };
      break;
    }

    case "taskmaster": {
      const now = new Date();
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        tasksCache.filter(t => {
          const d = new Date(t.date);
          return t.done && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.assignedTo === p.id;
        }).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.taskmaster,
          data: counts,
          backgroundColor: "rgba(255,159,64,0.5)"
        }]
      };
      break;
    }

    case "lazyLegends": {
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        filteredTasks(t => t.assignedTo === p.id && !t.done).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.lazyLegends,
          data: counts,
          backgroundColor: "rgba(255,99,132,0.5)"
        }]
      };
      break;
    }

    case "speedDemons": {
      const labels = peopleCache.map(p => p.name);
      const avgDays = peopleCache.map(p => {
        const times = filteredTasks(t => t.assignedTo === p.id && t.done && t.finished && t.assignedDate)
          .map(t => {
            const dDone = new Date(t.finished);
            const dAssigned = new Date(t.assignedDate);
            return (dDone - dAssigned) / (1000*60*60*24);
          });
        if (times.length === 0) return 0;
        return times.reduce((a,b) => a+b, 0) / times.length;
      });
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.speedDemons,
          data: avgDays,
          backgroundColor: "rgba(54,162,235,0.5)"
        }]
      };
      break;
    }

    case "weekendWarriors": {
      const labels = peopleCache.map(p => p.name);
      const counts = peopleCache.map(p =>
        filteredTasks(t => {
          if (!t.done || t.assignedTo !== p.id) return false;
          const d = new Date(t.date);
          return d.getDay() === 0 || d.getDay() === 6;
        }).length
      );
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.weekendWarriors,
          data: counts,
          backgroundColor: "rgba(255,206,86,0.5)"
        }]
      };
      break;
    }

    case "slacker9000": {
      const labels = peopleCache.map(p => p.name);
      const ages = peopleCache.map(p => {
        const openTasks = filteredTasks(t => t.assignedTo === p.id && !t.done && t.assignedDate);
        if (openTasks.length === 0) return 0;
        const now = new Date();
        return Math.max(...openTasks.map(t => (now - new Date(t.assignedDate)) / (1000*60*60*24)));
      });
      data = {
        labels,
        datasets: [{
          label: LANGUAGES[currentLang].chartOptions.slacker9000,
          data: ages,
          backgroundColor: "rgba(153,102,255,0.5)"
        }]
      };
      break;
    }

    default:
      data = { labels: [], datasets: [] };
      break;
  }

  const chart = new Chart(ctx, { type: chartType, data, options });
  chart.boardType = type;
  return chart;
}

// ==========================
// Theme, Språk och Init
// ==========================
function updateAllCharts() {
  for (const [id, chart] of Object.entries(chartInstances)) {
    const type = chart.boardType || "weekly";
  }
}

const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const STORAGE_KEY = "mmm-chores-theme";

const savedTheme = localStorage.getItem(STORAGE_KEY) || "light";
root.setAttribute("data-theme", savedTheme);
setIcon(savedTheme);

themeBtn.addEventListener("click", () => {
  const current = root.getAttribute("data-theme");
  const theme = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  setIcon(theme);
});

function setIcon(theme) {
  themeIcon.className = theme === "dark"
    ? "bi bi-moon-stars-fill"
    : "bi bi-brightness-high-fill";
}

async function initApp() {
  const userSettings = await fetchUserSettings();
  customLevelTitles = userSettings.customLevelTitles || {};
  if (userPermission !== 'write') {
    const personForm = document.getElementById('personForm');
    if (personForm) personForm.style.display = 'none';
    const taskForm = document.getElementById('taskForm');
    if (taskForm) taskForm.style.display = 'none';
  }
  if (typeof userSettings.levelingEnabled === "boolean") {
    levelingEnabled = userSettings.levelingEnabled;
  }
  if (userSettings.settings) {
    settingsMode = userSettings.settings;
  }
  if (userSettings.language && LANGUAGES[userSettings.language]) {
    currentLang = userSettings.language;
  } else {
    currentLang = localStorage.getItem("mmm-chores-lang") || 'en';
  }
  dateFormatting = userSettings.dateFormatting || '';

  const selector = document.createElement("select");
  selector.className = "language-select";
  Object.keys(LANGUAGES).forEach(lang => {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = lang.toUpperCase();
    if (lang === currentLang) opt.selected = true;
    selector.appendChild(opt);
  });
  selector.addEventListener("change", async e => {
    const newLang = e.target.value;
    setLanguage(newLang);
    await saveUserLanguage(newLang);
  });

  const controls = document.querySelector(".top-controls");
  if (controls) {
    controls.appendChild(selector);
  } else {
    document.body.appendChild(selector);
  }

  const aiButton = document.getElementById("btnAiGenerate");
  if (aiButton && userSettings.useAI === false) {
    aiButton.style.display = "none";
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (!loginEnabled) {
    if (logoutBtn) logoutBtn.style.display = 'none';
  } else if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await authFetch('/api/logout', { method: 'POST' }); } catch (e) {}
      localStorage.removeItem('choresToken');
      window.location.reload();
    });
  }

  initSettingsForm(userSettings);

  setLanguage(currentLang);
  await applySettings(userSettings);

  // Initialize rewards system visibility
  updateRewardsTabVisibility(!!userSettings.usePointSystem);
  
  if (userSettings.usePointSystem) {
    await fetchRewards();
    await fetchRedemptions();
  }

  const savedBoards = await fetchSavedBoards();
    if (savedBoards.length) {
      savedBoards.forEach(type => addChart(type));
    }

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModalEl = document.getElementById("settingsModal");
  const settingsForm = document.getElementById("settingsForm");
  const lockedMsg = document.getElementById("settingsLockedMsg");
  const modal = settingsModalEl ? new bootstrap.Modal(settingsModalEl) : null;
  if (settingsBtn && modal) {
    settingsBtn.addEventListener('click', () => {
      settingsChanged = false;
      settingsSaved = false;
      if (settingsMode === 'unlocked') {
        if (lockedMsg) lockedMsg.classList.add('d-none');
        if (settingsForm) settingsForm.classList.remove('d-none');
        modal.show();
        return;
      }

      if (/^\d{6}$/.test(settingsMode)) {
        const pin = prompt(LANGUAGES[currentLang].settingsEnterPin);
        if (pin === settingsMode) {
          settingsMode = 'unlocked';
          if (lockedMsg) lockedMsg.classList.add('d-none');
          if (settingsForm) settingsForm.classList.remove('d-none');
        } else {
          if (lockedMsg) {
            lockedMsg.textContent = LANGUAGES[currentLang].settingsWrongPin;
            lockedMsg.classList.remove('d-none');
          }
          if (settingsForm) settingsForm.classList.add('d-none');
        }
        modal.show();
        return;
      }

      if (lockedMsg) {
        lockedMsg.textContent = LANGUAGES[currentLang].settingsLocked;
        lockedMsg.classList.remove('d-none');
      }
      if (settingsForm) settingsForm.classList.add('d-none');
      modal.show();
    });
  }

  if (settingsModalEl) {
    settingsModalEl.addEventListener('hidden.bs.modal', () => {
      if (!settingsSaved && settingsChanged) {
        window.location.reload();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  currentLang = localStorage.getItem('mmm-chores-lang') || currentLang;
  setLanguage(currentLang);
  checkLogin();
});

// ==========================
// ====== AI GENERATE =======
// ==========================

// Lägg till denna <button> i din HTML, t.ex. under tasklist:
// <button id="btnAiGenerate" class="btn btn-outline-primary mb-3" type="button">
//   <i class="bi bi-stars me-1"></i> AI Generate
// </button>
// <div id="toastContainer" style="position:fixed;top:20px;right:20px;z-index:10000;"></div>

// Toast/notification utility
function showToast(msg, type = "danger", duration = 4000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.style.minWidth = "200px";
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
  toast.querySelector("button").onclick = () => toast.remove();
}

// AI Generate button handler
const aiBtn = document.getElementById("btnAiGenerate");
if (aiBtn) {
  aiBtn.onclick = async function () {
    aiBtn.disabled = true;
    aiBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>AI...`;

    try {
      const res = await authFetch('/api/ai-generate', { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        showToast(data.error || "AI generation failed.", "danger", 7000);
      } else {
        showToast(`AI generated ${data.count} tasks!`, "success", 4000);
        await fetchTasks();
      }
    } catch (e) {
      showToast("AI generation failed. Server error.", "danger", 7000);
    } finally {
      aiBtn.disabled = false;
      aiBtn.innerHTML = `<i class="bi bi-stars me-1"></i> ${LANGUAGES[currentLang].aiGenerateButton}`;
    }
  };
}

// ==========================
// ===== REWARDS SYSTEM =====
// ==========================

let rewardsCache = [];
let redemptionsCache = [];
let editRewardId = null;

async function fetchRewards() {
  try {
    const res = await authFetch('/api/rewards');
    rewardsCache = await res.json();
    renderRewards();
  } catch (e) {
    console.error('Failed to fetch rewards:', e);
  }
}

async function fetchRedemptions() {
  try {
    const res = await authFetch('/api/redemptions');
    redemptionsCache = await res.json();
    renderRedemptions();
  } catch (e) {
    console.error('Failed to fetch redemptions:', e);
  }
}

function renderRewards() {
  const list = document.getElementById('rewardsList');
  if (!list) return;

  list.innerHTML = '';
  rewardsCache.filter(r => r.active !== false).forEach(reward => {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';
    item.innerHTML = `
      <div>
        <strong>${reward.name}</strong>
        <span class="badge bg-primary ms-2">${reward.pointCost} pts</span>
        ${reward.description ? `<br><small class="text-muted">${reward.description}</small>` : ''}
      </div>
      <div class="btn-group" role="group">
        <button class="btn btn-sm btn-outline-secondary" onclick="editReward(${reward.id})" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-success" onclick="openRedeemModal(${reward.id})" title="Redeem">
          <i class="bi bi-gift"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteReward(${reward.id})" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderPeoplePoints() {
  const list = document.getElementById('peoplePointsList');
  if (!list) return;

  list.innerHTML = '';
  peopleCache.forEach(person => {
    const points = person.points || 0;
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';
    item.innerHTML = `
      <div>
        <strong>${person.name}</strong>
        <span class="badge bg-warning text-dark ms-2">${points} points</span>
      </div>
      <button class="btn btn-sm btn-outline-primary" onclick="openRedeemModalForPerson(${person.id})" title="Redeem Reward">
        <i class="bi bi-gift"></i> Redeem
      </button>
    `;
    list.appendChild(item);
  });
}

function renderRedemptions() {
  const list = document.getElementById('redemptionsList');
  if (!list) return;

  list.innerHTML = '';
  const recent = redemptionsCache.slice(-10).reverse(); // Show 10 most recent
  
  if (recent.length === 0) {
    list.innerHTML = '<li class="list-group-item text-muted text-center">No redemptions yet</li>';
    return;
  }

  recent.forEach(redemption => {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';
    const statusClass = redemption.used ? 'bg-success' : 'bg-warning text-dark';
    const statusText = redemption.used ? 'Used' : 'Pending';
    
    item.innerHTML = `
      <div>
        <strong>${redemption.personName}</strong> redeemed <strong>${redemption.rewardName}</strong>
        <br><small class="text-muted">${new Date(redemption.redeemed).toLocaleDateString()} - ${redemption.pointCost} points</small>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge ${statusClass}">${statusText}</span>
        ${!redemption.used ? `<button class="btn btn-sm btn-outline-success" onclick="markRedemptionUsed(${redemption.id})" title="Mark as used">
          <i class="bi bi-check2"></i>
        </button>` : ''}
      </div>
    `;
    list.appendChild(item);
  });
}

async function markRedemptionUsed(redemptionId) {
  if (!confirm('Mark this redemption as used?')) return;
  
  try {
    await authFetch(`/api/redemptions/${redemptionId}/use`, { method: 'PUT' });
    await fetchRedemptions();
    showToast('Redemption marked as used', 'success');
  } catch (e) {
    showToast('Failed to mark redemption as used', 'danger');
  }
}

function openRedeemModal(rewardId = null) {
  const modal = new bootstrap.Modal(document.getElementById('redeemRewardModal'));
  const personSelect = document.getElementById('redeemPerson');
  const rewardSelect = document.getElementById('redeemReward');
  const info = document.getElementById('redeemInfo');
  
  // Populate people
  personSelect.innerHTML = '<option value="">Select person...</option>';
  peopleCache.forEach(person => {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = `${person.name} (${person.points || 0} points)`;
    personSelect.appendChild(option);
  });
  
  // Populate rewards
  rewardSelect.innerHTML = '<option value="">Select reward...</option>';
  rewardsCache.filter(r => r.active !== false).forEach(reward => {
    const option = document.createElement('option');
    option.value = reward.id;
    option.textContent = `${reward.name} (${reward.pointCost} points)`;
    if (rewardId && reward.id === rewardId) {
      option.selected = true;
    }
    rewardSelect.appendChild(option);
  });
  
  info.style.display = 'none';
  modal.show();
}

function openRedeemModalForPerson(personId) {
  openRedeemModal();
  const personSelect = document.getElementById('redeemPerson');
  personSelect.value = personId;
  updateRedeemInfo();
}

function updateRedeemInfo() {
  const personId = parseInt(document.getElementById('redeemPerson').value);
  const rewardId = parseInt(document.getElementById('redeemReward').value);
  const info = document.getElementById('redeemInfo');
  
  if (!personId || !rewardId) {
    info.style.display = 'none';
    return;
  }
  
  const person = peopleCache.find(p => p.id === personId);
  const reward = rewardsCache.find(r => r.id === rewardId);
  
  if (!person || !reward) {
    info.style.display = 'none';
    return;
  }
  
  const personPoints = person.points || 0;
  const canRedeem = personPoints >= reward.pointCost;
  
  info.className = `alert ${canRedeem ? 'alert-success' : 'alert-danger'}`;
  info.textContent = canRedeem 
    ? `${person.name} has enough points to redeem ${reward.name}`
    : `${person.name} needs ${reward.pointCost - personPoints} more points to redeem ${reward.name}`;
  info.style.display = 'block';
}

function editReward(rewardId) {
  const reward = rewardsCache.find(r => r.id === rewardId);
  if (!reward) return;
  
  editRewardId = rewardId;
  const modal = new bootstrap.Modal(document.getElementById('editRewardModal'));
  
  document.getElementById('editRewardName').value = reward.name;
  document.getElementById('editRewardPoints').value = reward.pointCost;
  document.getElementById('editRewardDescription').value = reward.description || '';
  document.getElementById('editRewardEmail').value = reward.emailTemplate || '';
  document.getElementById('editRewardActive').checked = reward.active !== false;
  
  modal.show();
}

async function deleteReward(rewardId) {
  if (!confirm('Delete this reward? This action cannot be undone.')) return;
  
  try {
    await authFetch(`/api/rewards/${rewardId}`, { method: 'DELETE' });
    await fetchRewards();
    showToast('Reward deleted', 'success');
  } catch (e) {
    showToast('Failed to delete reward', 'danger');
  }
}

// Event listeners for rewards system
document.addEventListener('DOMContentLoaded', () => {
  // Reward form
  const rewardForm = document.getElementById('rewardForm');
  if (rewardForm) {
    rewardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('rewardName').value;
      const pointCost = document.getElementById('rewardPoints').value;
      const description = document.getElementById('rewardDescription').value;
      
      try {
        await authFetch('/api/rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, pointCost, description })
        });
        
        rewardForm.reset();
        await fetchRewards();
        showToast('Reward added', 'success');
      } catch (e) {
        showToast('Failed to add reward', 'danger');
      }
    });
  }
  
  // Edit reward form
  const editRewardForm = document.getElementById('editRewardForm');
  if (editRewardForm) {
    editRewardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!editRewardId) return;
      
      const name = document.getElementById('editRewardName').value;
      const pointCost = document.getElementById('editRewardPoints').value;
      const description = document.getElementById('editRewardDescription').value;
      const emailTemplate = document.getElementById('editRewardEmail').value;
      const active = document.getElementById('editRewardActive').checked;
      
      try {
        await authFetch(`/api/rewards/${editRewardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, pointCost, description, emailTemplate, active })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('editRewardModal')).hide();
        await fetchRewards();
        showToast('Reward updated', 'success');
      } catch (e) {
        showToast('Failed to update reward', 'danger');
      }
    });
  }
  
  // Redeem reward form
  const redeemRewardForm = document.getElementById('redeemRewardForm');
  if (redeemRewardForm) {
    redeemRewardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const personId = parseInt(document.getElementById('redeemPerson').value);
      const rewardId = parseInt(document.getElementById('redeemReward').value);
      
      if (!personId || !rewardId) return;
      
      try {
        await authFetch('/api/redemptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId, rewardId })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('redeemRewardModal')).hide();
        await fetchRedemptions();
        await fetchPeople(); // Refresh to update points
        renderPeoplePoints();
        showToast('Reward redeemed successfully', 'success');
      } catch (e) {
        const errorText = await e.response?.text() || 'Failed to redeem reward';
        showToast(errorText, 'danger');
      }
    });
    
    // Update info when selections change
    document.getElementById('redeemPerson').addEventListener('change', updateRedeemInfo);
    document.getElementById('redeemReward').addEventListener('change', updateRedeemInfo);
  }
  
  // Update task form to include points
  const taskPointsField = document.getElementById('taskPoints');
  if (taskPointsField && !taskPointsField.hasAttribute('data-initialized')) {
    taskPointsField.setAttribute('data-initialized', 'true');
    // Field is already handled by the existing task form handler above
  }

  // Settings rewards form handler
  const settingsRewardForm = document.getElementById('settingsRewardForm');
  if (settingsRewardForm) {
    settingsRewardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('settingsRewardName').value;
      const pointCost = document.getElementById('settingsRewardPoints').value;
      const description = document.getElementById('settingsRewardDescription').value;
      
      try {
        await authFetch('/api/rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, pointCost, description })
        });
        
        // Clear form
        document.getElementById('settingsRewardName').value = '';
        document.getElementById('settingsRewardPoints').value = '';
        document.getElementById('settingsRewardDescription').value = '';
        
        // Reload rewards list
        loadSettingsRewards();
        loadSettingsPeoplePoints();
      } catch (error) {
        console.error('Error adding reward:', error);
        alert('Failed to add reward');
      }
    });
  }
});

// Settings Rewards Functions
async function loadSettingsRewards() {
  try {
    const response = await authFetch('/api/rewards');
    const rewards = await response.json();
    
    const list = document.getElementById('settingsRewardsList');
    if (!list) return;
    
    if (rewards.length === 0) {
      list.innerHTML = '<li class="list-group-item text-muted">No rewards created yet</li>';
      return;
    }
    
    list.innerHTML = rewards.map(reward => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${escapeHtml(reward.name)}</strong>
          <span class="badge bg-primary rounded-pill ms-2">${reward.pointCost} pts</span>
          ${reward.description ? `<br><small class="text-muted">${escapeHtml(reward.description)}</small>` : ''}
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteSettingsReward(${reward.id})" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </li>
    `).join('');
  } catch (error) {
    console.error('Error loading rewards:', error);
    const list = document.getElementById('settingsRewardsList');
    if (list) {
      list.innerHTML = '<li class="list-group-item text-danger">Error loading rewards</li>';
    }
  }
}

async function loadSettingsPeoplePoints() {
  try {
    const response = await authFetch('/api/people-points');
    const peoplePoints = await response.json();
    
    const list = document.getElementById('settingsPeoplePointsList');
    if (!list) return;
    
    if (peoplePoints.length === 0) {
      list.innerHTML = '<li class="list-group-item text-muted">No people found</li>';
      return;
    }
    
    list.innerHTML = peoplePoints.map(person => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <span>${escapeHtml(person.name)}</span>
        <span class="badge bg-success rounded-pill">${person.points} points</span>
      </li>
    `).join('');
  } catch (error) {
    console.error('Error loading people points:', error);
    const list = document.getElementById('settingsPeoplePointsList');
    if (list) {
      list.innerHTML = '<li class="list-group-item text-danger">Error loading points</li>';
    }
  }
}

async function deleteSettingsReward(rewardId) {
  if (!confirm('Are you sure you want to delete this reward?')) {
    return;
  }
  
  try {
    await authFetch(`/api/rewards/${rewardId}`, {
      method: 'DELETE'
    });
    
    loadSettingsRewards();
    loadSettingsPeoplePoints();
  } catch (error) {
    console.error('Error deleting reward:', error);
    alert('Failed to delete reward');
  }
}
