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
let editCoinsPersonId = null;
let levelTitles = [];
let taskPointsRules = [];
let aiChatHistory = [];
let aiChatRecognizer = null;
let aiChatListening = false;
let aiChatInitialized = false;
let aiChatEnabled = false;
let aiChatTtsEnabled = false;
let aiResponseAudio = new Audio(); // Global audio object for AI responses
let aiAutoStopTimer = null;
const TASK_SERIES_FILTER_KEY = 'mmm-chores-series-filter';
let showTaskSeriesRootsOnly = localStorage.getItem(TASK_SERIES_FILTER_KEY) === '1';
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
  const settingsContainer = document.getElementById('settingsForm');
  if (!settingsContainer) return;
  const settingsSaveBtn = settingsContainer.querySelector('#settingsSaveBtn');
  if (!settingsSaveBtn) return;

  // Load task coin rules
  if (settings.taskPointsRules && Array.isArray(settings.taskPointsRules)) {
    taskPointsRules = settings.taskPointsRules;
    renderTaskPointsRules();
  }
  
  // Populate gift points person select
  populateGiftPersonSelect();

  // Reward system selection
  const useLevelSystem = document.getElementById('useLevelSystem');
  const useCoinSystem = document.getElementById('useCoinSystem');
  const levelSystemCard = document.getElementById('levelSystemCard');
  const coinSystemCard = document.getElementById('coinSystemCard');
  const migrationWarning = document.getElementById('migrationWarning');
  const levelSettings = document.getElementById('levelSettings');
  const coinSettings = document.getElementById('coinSettings');

  // Initialize reward system selection
  const coinSystemEnabled = settings.useCoinSystem ?? settings.usePointSystem ?? false;
  const currentSystem = coinSystemEnabled ? 'coins' : 'level';
  if (useLevelSystem && useCoinSystem) {
    useLevelSystem.checked = currentSystem === 'level';
    useCoinSystem.checked = currentSystem === 'coins';
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

  if (useCoinSystem) {
    useCoinSystem.addEventListener('change', () => {
      if (useCoinSystem.checked) {
        updateRewardSystemUI('coins');
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

  if (coinSystemCard) {
    coinSystemCard.addEventListener('click', () => {
      if (useCoinSystem) {
        useCoinSystem.checked = true;
        updateRewardSystemUI('coins');
        if (migrationWarning) {
          migrationWarning.classList.remove('d-none');
        }
      }
    });
  }

  function updateRewardSystemUI(system) {
    // Update card styles
    if (levelSystemCard && coinSystemCard) {
      levelSystemCard.classList.toggle('selected', system === 'level');
      coinSystemCard.classList.toggle('selected', system === 'coins');
    }

    // Show/hide settings sections
    if (levelSettings) {
      levelSettings.classList.toggle('d-none', system !== 'level');
    }
    if (coinSettings) {
      coinSettings.classList.toggle('d-none', system !== 'coins');
    }

    // Show/hide Rewards tab setting
    const showRewardsTabContainer = document.getElementById('settingsShowRewardsTabContainer');
    if (showRewardsTabContainer) {
      if (system === 'coins') {
        showRewardsTabContainer.style.display = '';
      } else {
        showRewardsTabContainer.style.display = 'none';
      }
    }

    // Show/hide coin badge toggle based on system
    const showCoinsContainer = document.getElementById('settingsShowCoinsOnMirrorContainer');
    if (showCoinsContainer) {
      if (system === 'coins') {
        showCoinsContainer.style.display = '';
      } else {
        showCoinsContainer.style.display = 'none';
      }
    }

    // Update rewards tab visibility
    updateRewardsTabVisibility(system === 'coins');

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
  const showRewardsTab = document.getElementById('settingsShowRewardsTab');
  const showRewardsTabContainer = document.getElementById('settingsShowRewardsTabContainer');
  const showCoinsOnMirror = document.getElementById('settingsShowCoinsOnMirror');
  const showCoinsOnMirrorContainer = document.getElementById('settingsShowCoinsOnMirrorContainer');
  const showRedeemedRewards = document.getElementById('settingsShowRedeemedRewards');
  const showRedeemedRewardsContainer = document.getElementById('settingsShowRedeemedRewardsContainer');
  const levelEnable = document.getElementById('settingsLevelEnable');
  const autoUpdate = document.getElementById('settingsAutoUpdate');
  const aiSettingsContainer = document.getElementById('aiSettingsContainer');
  const chatbotEnabledToggle = document.getElementById('settingsChatbotEnabled');
  const aiAudioEnabledToggle = document.getElementById('settingsAiAudioEnabled');
  const chatbotVoiceSelect = document.getElementById('settingsChatbotVoice');
  const chatbotVoiceContainer = document.getElementById('chatbotVoiceContainer');

  const updateVoiceVisibility = () => {
    if (!chatbotVoiceContainer) return;
    const aiOn = useAI ? useAI.checked : true;
    const chatOn = chatbotEnabledToggle ? chatbotEnabledToggle.checked : false;
    const audioOn = aiAudioEnabledToggle ? aiAudioEnabledToggle.checked : false;
    const show = aiOn && chatOn && audioOn;
    chatbotVoiceContainer.style.display = show ? '' : 'none';
    chatbotVoiceContainer.classList.toggle('d-none', !show);
    chatbotVoiceContainer.hidden = !show;
    chatbotVoiceContainer.setAttribute('aria-hidden', show ? 'false' : 'true');
  };

  const updateAiSettingsVisibility = () => {
    const aiOn = useAI ? useAI.checked : true;
    if (aiSettingsContainer) {
      aiSettingsContainer.style.display = aiOn ? '' : 'none';
      aiSettingsContainer.classList.toggle('d-none', !aiOn);
      aiSettingsContainer.hidden = !aiOn;
      aiSettingsContainer.setAttribute('aria-hidden', aiOn ? 'false' : 'true');
    }
    if (!aiOn) {
      if (chatbotEnabledToggle) chatbotEnabledToggle.checked = false;
      if (aiAudioEnabledToggle) aiAudioEnabledToggle.checked = false;
    }
    updateVoiceVisibility();
  };

  if (useAI) {
    useAI.addEventListener('change', updateAiSettingsVisibility);
  }

  if (chatbotEnabledToggle) {
    chatbotEnabledToggle.addEventListener('change', updateVoiceVisibility);
  }

  if (aiAudioEnabledToggle) {
    aiAudioEnabledToggle.addEventListener('change', updateVoiceVisibility);
  }
  
  updateAiSettingsVisibility();
  const pushoverEnable = document.getElementById('settingsPushoverEnable');
  const reminderTime = document.getElementById('settingsReminderTime');
  const backgroundSelect = document.getElementById('settingsBackground');
  const editRewardsBtn = document.getElementById('editRewardsBtn');
  const runDataFixBtn = document.getElementById('runDataFixBtn');
  const dataFixStatus = document.getElementById('dataFixStatus');

  if (showPast) showPast.checked = !!settings.showPast;
  if (showRedeemedRewards) showRedeemedRewards.checked = settings.showRedeemedRewards !== false;
  if (textSize) textSize.value = settings.textMirrorSize || 'small';
  if (dateFmt) dateFmt.value = settings.dateFormatting || '';
  if (useAI) useAI.checked = settings.useAI !== false;
  if (showAnalytics) showAnalytics.checked = !!settings.showAnalyticsOnMirror;
  if (showRewardsTab) showRewardsTab.checked = settings.showRewardsTab !== false;
  if (showCoinsOnMirror) showCoinsOnMirror.checked = settings.showCoinsOnMirror !== false;
  if (levelEnable) levelEnable.checked = settings.levelingEnabled !== false;
  if (autoUpdate) autoUpdate.checked = !!settings.autoUpdate;
  if (chatbotEnabledToggle) {
    chatbotEnabledToggle.checked = !!settings.chatbotEnabled;
  }
  if (aiAudioEnabledToggle) {
    aiAudioEnabledToggle.checked = !!settings.chatbotTtsEnabled;
  }
  if (chatbotVoiceSelect) chatbotVoiceSelect.value = settings.chatbotVoice || 'nova';
  updateAiSettingsVisibility();
  aiChatTtsEnabled = !!settings.chatbotEnabled && !!settings.chatbotTtsEnabled && settings.useAI !== false;
  if (pushoverEnable) pushoverEnable.checked = !!settings.pushoverEnabled;
  if (reminderTime) reminderTime.value = settings.reminderTime || '';
  if (backgroundSelect) backgroundSelect.value = settings.background || '';
  
  // Show/hide Rewards tab setting based on coins system
  if (showRewardsTabContainer) {
    if (currentSystem === 'coins') {
      showRewardsTabContainer.style.display = '';
    } else {
      showRewardsTabContainer.style.display = 'none';
    }
  }

  if (showCoinsOnMirrorContainer) {
    if (currentSystem === 'coins') {
      showCoinsOnMirrorContainer.style.display = '';
    } else {
      showCoinsOnMirrorContainer.style.display = 'none';
    }
  }

  if (showRedeemedRewardsContainer) {
    if (currentSystem === 'coins') {
      showRedeemedRewardsContainer.style.display = '';
    } else {
      showRedeemedRewardsContainer.style.display = 'none';
    }
  }

  // Update coin totals preview
  updateCoinTotalsPreview();

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

  if (runDataFixBtn) {
    const defaultLabel = runDataFixBtn.innerHTML;
    runDataFixBtn.addEventListener('click', async () => {
      const confirmText = (LANGUAGES[currentLang] && LANGUAGES[currentLang].dataFixConfirm) ||
        'Archive overdue recurring tasks and remove duplicates? This cannot be undone.';
      if (!window.confirm(confirmText)) return;

      if (dataFixStatus) {
        dataFixStatus.classList.remove('text-danger', 'text-success');
        dataFixStatus.textContent = (LANGUAGES[currentLang] && LANGUAGES[currentLang].dataFixRunning) ||
          'Running temporary fix...';
      }

      runDataFixBtn.disabled = true;
      runDataFixBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Working...';

      try {
        const res = await authFetch('/api/datafix', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || data.message || 'Failed to run temporary fix');
        }
        if (dataFixStatus) {
          dataFixStatus.textContent = data.message || 'Temporary fix completed.';
          dataFixStatus.classList.add('text-success');
        }
        if (typeof fetchTasks === 'function') {
          await fetchTasks();
        }
      } catch (error) {
        console.error('Temporary data fix failed:', error);
        if (dataFixStatus) {
          dataFixStatus.textContent = error.message;
          dataFixStatus.classList.add('text-danger');
        }
      } finally {
        runDataFixBtn.disabled = false;
        runDataFixBtn.innerHTML = defaultLabel;
      }
    });
  }

  async function handleSettingsSave() {
    const coinSystemSelected = useCoinSystem ? useCoinSystem.checked : false;
    const newSettings = {
      useCoinSystem: coinSystemSelected,
      usePointSystem: coinSystemSelected,
      showPast: showPast ? showPast.checked : false,
      textMirrorSize: textSize ? textSize.value : 'small',
      dateFormatting: dateFmt ? dateFmt.value : '',
      useAI: useAI ? useAI.checked : false,
      showAnalyticsOnMirror: showAnalytics ? showAnalytics.checked : false,
      showRewardsTab: showRewardsTab ? showRewardsTab.checked : true,
      showCoinsOnMirror: showCoinsOnMirror ? showCoinsOnMirror.checked : true,
      showRedeemedRewards: showRedeemedRewards ? showRedeemedRewards.checked : true,
      levelingEnabled: levelEnable ? levelEnable.checked : false,
      autoUpdate: autoUpdate ? autoUpdate.checked : false,
      chatbotEnabled: (useAI ? useAI.checked : false) && (chatbotEnabledToggle ? chatbotEnabledToggle.checked : false),
      chatbotTtsEnabled: (useAI ? useAI.checked : false) && (aiAudioEnabledToggle ? aiAudioEnabledToggle.checked : false),
      chatbotVoice: chatbotVoiceSelect ? chatbotVoiceSelect.value : 'nova',
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
      updateRewardsTabVisibility(newSettings.useCoinSystem, newSettings.showRewardsTab);
      
      // Refresh data if switching systems
      const previousCoinSetting = settings.useCoinSystem ?? settings.usePointSystem ?? false;
      if (previousCoinSetting !== newSettings.useCoinSystem) {
        if (newSettings.useCoinSystem) {
          await fetchRewards();
          await fetchRedemptions();
        }
        await fetchPeople();
      }

      settings.useCoinSystem = newSettings.useCoinSystem;
      settings.usePointSystem = newSettings.useCoinSystem;
      settings.showCoinsOnMirror = newSettings.showCoinsOnMirror;
      settings.useAI = newSettings.useAI;
      settings.chatbotEnabled = newSettings.chatbotEnabled;
      settings.chatbotTtsEnabled = newSettings.chatbotTtsEnabled;
      settings.chatbotVoice = newSettings.chatbotVoice;

      toggleAiChat(newSettings.chatbotEnabled && newSettings.useAI !== false);
      aiChatTtsEnabled = !!newSettings.chatbotEnabled && !!newSettings.chatbotTtsEnabled && newSettings.useAI !== false;

      showToast('Settings saved successfully', 'success');
      const settingsModal = document.getElementById('settingsModal');
      const modalInstance = settingsModal ? bootstrap.Modal.getInstance(settingsModal) : null;
      if (modalInstance) {
        modalInstance.hide();
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
      showToast(e.message || 'Failed to save settings', 'danger');
    }
  }

  settingsSaveBtn.addEventListener('click', handleSettingsSave);
}

function updateRewardsTabVisibility(useCoinSystem, showRewardsTab = true) {
  const rewardsSystemEnabled = document.getElementById('rewardsSystemEnabled');
  const rewardsSystemDisabled = document.getElementById('rewardsSystemDisabled');
  const rewardsTabButton = document.querySelector('[data-bs-target="#rewards"]');
  const rewardsTabLi = rewardsTabButton ? rewardsTabButton.closest('li') : null;
  
  // Show/hide the rewards tab button itself
  if (rewardsTabLi) {
    if (useCoinSystem && showRewardsTab) {
      rewardsTabLi.style.display = '';
    } else {
      rewardsTabLi.style.display = 'none';
    }
  }
  
  // Show appropriate content in rewards tab
  if (rewardsSystemEnabled && rewardsSystemDisabled) {
    if (useCoinSystem) {
      rewardsSystemEnabled.classList.remove('d-none');
      rewardsSystemDisabled.classList.add('d-none');
    } else {
      rewardsSystemEnabled.classList.add('d-none');
      rewardsSystemDisabled.classList.remove('d-none');
    }
  }
}

function updateCoinTotalsPreview() {
  const preview = document.getElementById('coinTotalsPreview');
  if (!preview) return;
  const t = LANGUAGES[currentLang];
  
  if (peopleCache.length === 0) {
    preview.textContent = t.noPeople || 'No people added yet';
    return;
  }
  
  const pointsText = peopleCache.map(person => {
    const points = person.points || 0;
    return `${person.name}: ${points} ${t.pointsLabel || 'coins'}`;
  }).join('\n');
  
  preview.textContent = pointsText || t.coinTotalsLoading || t.loadingLabel || 'Loading...';
}

// ==========================
// AI Chatbot (admin dashboard)
// ==========================

function getAiChatNodes() {
  return {
    container: document.getElementById('aiChatContainer'),
    log: document.getElementById('aiChatLog'),
    input: document.getElementById('aiChatInput'),
    send: document.getElementById('aiChatSend'),
    mic: document.getElementById('aiChatMic'),
    micIcon: document.getElementById('aiChatMicIcon'),
    status: document.getElementById('aiChatStatus')
  };
}

function toggleAiChat(enabled) {
  const { container } = getAiChatNodes();
  aiChatEnabled = !!enabled;
  if (container) {
    container.style.display = aiChatEnabled ? '' : 'none';
  }
  if (aiChatEnabled) {
    setupAiChat();
    renderAiChatWelcome(true);
  }
}

function renderAiChatWelcome(force = false) {
  const { log } = getAiChatNodes();
  if (!log) return;
  if (aiChatHistory.length) return;
  if (!force && log.childElementCount) return;
  const t = LANGUAGES[currentLang] || {};
  log.innerHTML = '';
  appendAiChatBubble('system', t.aiChatWelcome || 'I am ready to help with chores, people, and schedules.');
}

function appendAiChatBubble(role, text) {
  const { log } = getAiChatNodes();
  if (!log || !text) return;
  const bubble = document.createElement('div');
  bubble.className = `ai-chat-bubble ${role}`;
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function setAiChatStatus(message, variant = 'muted') {
  const { status } = getAiChatNodes();
  if (!status) return;
  status.classList.remove('text-danger', 'text-success');
  if (variant === 'error') {
    status.classList.add('text-danger');
  } else if (variant === 'success') {
    status.classList.add('text-success');
  }
  status.textContent = message || '';
}

function resolveAiChatLocale() {
  const map = {
    sv: 'sv-SE',
    nb: 'nb-NO',
    nn: 'nb-NO',
    no: 'nb-NO',
    da: 'da-DK',
    de: 'de-DE',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
    nl: 'nl-NL',
    pt: 'pt-PT'
  };
  return map[currentLang] || navigator.language || 'en-US';
}

function updateAiMicState(listening) {
  const { mic, micIcon } = getAiChatNodes();
  if (mic) {
    mic.classList.toggle('btn-danger', listening);
    mic.setAttribute('aria-pressed', listening ? 'true' : 'false');
  }
  if (micIcon) {
    micIcon.className = listening ? 'bi bi-stop-fill' : 'bi bi-soundwave';
  }
}

function stopAiChatListeningSession() {
  if (aiAutoStopTimer) {
    clearTimeout(aiAutoStopTimer);
    aiAutoStopTimer = null;
  }
  if (aiChatRecognizer) {
    try {
      aiChatRecognizer.onend = null;
      aiChatRecognizer.onresult = null;
      aiChatRecognizer.onerror = null;
      aiChatRecognizer.stop();
    } catch (e) {}
    aiChatRecognizer = null;
  }
  aiChatListening = false;
  updateAiMicState(false);
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isiOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isiOS || iPadOS;
}

function initAiChatSpeechRecognition() {
  if (typeof window === 'undefined') return;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;

  // Always clean up old instance if it exists
  if (aiChatRecognizer) {
    try {
      aiChatRecognizer.abort();
    } catch (e) {}
    aiChatRecognizer = null;
  }

  aiChatRecognizer = new Recognition();
  aiChatRecognizer.continuous = false;
  aiChatRecognizer.interimResults = true;

  aiChatRecognizer.onstart = () => {
    aiChatListening = true;
    updateAiMicState(true);
    const t = LANGUAGES[currentLang] || {};
    setAiChatStatus(t.aiChatListening || 'Listening...', 'success');
  };

  aiChatRecognizer.onerror = (event) => {
    aiChatListening = false;
    updateAiMicState(false);
    const t = LANGUAGES[currentLang] || {};
    setAiChatStatus(event.error || t.aiChatListenError || 'Speech recognition error', 'error');
    aiChatRecognizer = null;
  };

  aiChatRecognizer.onend = () => {
    aiChatListening = false;
    updateAiMicState(false);
    const { input } = getAiChatNodes();
    if (input && input.value.trim()) {
      sendAiChatMessage(true);
    } else {
      const t = LANGUAGES[currentLang] || {};
      setAiChatStatus(t.aiChatReady || 'Ready');
    }
    aiChatRecognizer = null;
  };

  aiChatRecognizer.onresult = (event) => {
    if (aiAutoStopTimer) {
      clearTimeout(aiAutoStopTimer);
      aiAutoStopTimer = null;
    }
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (res && res[0]) {
        transcript += res[0].transcript + ' ';
      }
    }
    const { input } = getAiChatNodes();
    if (input) {
      input.value = transcript.trim();
    }
  };
}

function speakAiResponse(text, audioBase64, onComplete) {
  // Ensure mic is stopped before speaking to prevent feedback
  stopAiChatListeningSession();

  if (!aiChatTtsEnabled) {
    if (onComplete) onComplete();
    return;
  }
  
  // If we have OpenAI TTS audio, play it
  if (audioBase64) {
    try {
      try {
        aiResponseAudio.pause();
        aiResponseAudio.currentTime = 0;
      } catch (e) {}
      aiResponseAudio.onended = null;

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Use the global audio object
      aiResponseAudio.src = audioUrl;
      
      // Small delay to allow mic to fully close and audio context to settle
      setTimeout(() => {
        aiResponseAudio.play().catch(err => {
          console.error('Failed to play audio:', err);
          // Fallback to browser TTS
          fallbackToWebSpeech(text, onComplete);
        });
      }, 300);
      
      // Clean up blob url when done
      aiResponseAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (onComplete) onComplete();
      };
      return;
    } catch (err) {
      console.error('Failed to decode audio:', err);
    }
  }
  
  // Fallback to browser TTS if no audio provided
  fallbackToWebSpeech(text, onComplete);
}

function fallbackToWebSpeech(text, onComplete) {
  if (!text || !aiChatTtsEnabled) {
    if (onComplete) onComplete();
    return;
  }
  if ('speechSynthesis' in window) {
    // Add padding to prevent first word cutoff
    const utterance = new SpeechSynthesisUtterance(" " + text);
    utterance.lang = resolveAiChatLocale();
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      if (onComplete) onComplete();
    };
    setTimeout(() => {
      speechSynthesis.speak(utterance);
    }, 200);
  } else {
    if (onComplete) onComplete();
  }
}

function startListeningWithTimeout() {
  if (!aiChatEnabled) return;
  
  // Start listening if not already
  if (!aiChatListening) {
    toggleAiChatListening();
  }
  
  // Set timeout to stop listening if no speech detected
  if (aiAutoStopTimer) clearTimeout(aiAutoStopTimer);
  aiAutoStopTimer = setTimeout(() => {
    if (aiChatListening && aiChatRecognizer) {
      console.log("Auto-stop listening due to inactivity");
      aiChatRecognizer.stop();
    }
  }, 7000);
}

function toggleAiChatListening() {
  if (!aiChatEnabled) return;
  
  // Unlock/warm up the global audio object with silence
  aiResponseAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==";
  aiResponseAudio.play().catch(e => console.log("Audio unlock failed", e));

  if (aiChatListening) {
    if (aiChatRecognizer) aiChatRecognizer.stop();
    return;
  }

  // Always re-init for a fresh session to avoid stale state
  initAiChatSpeechRecognition();

  const t = LANGUAGES[currentLang] || {};
  const { mic } = getAiChatNodes();
  if (!aiChatRecognizer) {
    if (mic) mic.disabled = true;
    setAiChatStatus(t.aiChatNoSpeech || 'Speech recognition not supported in this browser.', 'error');
    return;
  }

  try {
    aiChatRecognizer.lang = resolveAiChatLocale();
    aiChatRecognizer.start();
  } catch (err) {
    aiChatListening = false;
    updateAiMicState(false);
    aiChatRecognizer = null;
    setAiChatStatus(err.message || t.aiChatListenError || 'Could not start microphone.', 'error');
  }
}

async function sendAiChatMessage(isVoice = false) {
  if (!aiChatEnabled) return;
  
  // Try to warm up audio if this was a click interaction
  aiResponseAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==";
  aiResponseAudio.play().catch(e => {}); // Ignore errors if not a user interaction

  const { input, send, mic } = getAiChatNodes();
  const prompt = (input && input.value ? input.value.trim() : '');
  if (!prompt) return;

  stopAiChatListeningSession();

  const t = LANGUAGES[currentLang] || {};
  appendAiChatBubble('user', prompt);
  aiChatHistory.push({ role: 'user', content: prompt });
  if (input) input.value = '';
  if (send) send.disabled = true;
  if (mic) mic.disabled = true;
  setAiChatStatus(t.aiChatWorking || 'Thinking...');
  let micReleased = false;
  let playbackCompleted = false;
  const releaseMic = () => {
    if (mic && !micReleased) {
      mic.disabled = false;
      micReleased = true;
    }
  };

  try {
    const res = await authFetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, history: aiChatHistory.slice(-6) })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'AI chat failed');
    }
    const reply = data.reply || data.response || t.aiChatNoReply || 'No response from AI.';
    aiChatHistory.push({ role: 'assistant', content: reply });
    appendAiChatBubble('assistant', reply);
    
    speakAiResponse(reply, data.audio, () => {
      playbackCompleted = true;
      releaseMic();
      // Auto-listen removed. User must press mic button.
    });
    
    setAiChatStatus(t.aiChatReady || 'Ready', 'success');

    if (data.dataChanged) {
      await fetchTasks();
      await fetchPeople();
    }
  } catch (err) {
    playbackCompleted = true;
    releaseMic();
    setAiChatStatus(err.message || 'AI chat failed', 'error');
    showToast(err.message || 'AI chat failed', 'danger', 6000);
  } finally {
    if (send) send.disabled = false;
    if (playbackCompleted) {
      releaseMic();
    }
  }
}

function setupAiChat() {
  if (aiChatInitialized) return;
  const { container, send, input, mic } = getAiChatNodes();
  if (!container) return;
  aiChatInitialized = true;

  if (send) {
    send.addEventListener('click', sendAiChatMessage);
  }
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAiChatMessage();
      }
    });
  }
  if (mic) {
    mic.addEventListener('click', toggleAiChatListening);
  }

  initAiChatSpeechRecognition();
  renderAiChatWelcome();
  setAiChatStatus((LANGUAGES[currentLang] && LANGUAGES[currentLang].aiChatReady) || 'Ready');
}

function openSettingsToRewardSystem() {
  const settingsModal = document.getElementById('settingsModal');
  const useCoinSystem = document.getElementById('useCoinSystem');
  
  if (settingsModal && useCoinSystem) {
    const modal = new bootstrap.Modal(settingsModal);
    modal.show();
    
    // After modal opens, select coins system
    setTimeout(() => {
      useCoinSystem.checked = true;
      useCoinSystem.dispatchEvent(new Event('change'));
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

  // Generic data-i18n handler
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const keys = key.split('.');
    let value = t;
    for (const k of keys) {
      value = value ? value[k] : null;
    }
    if (value) {
      el.textContent = value;
    }
  });

  // Generic data-i18n-placeholder handler
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const keys = key.split('.');
    let value = t;
    for (const k of keys) {
      value = value ? value[k] : null;
    }
    if (value) {
      el.placeholder = value;
    }
  });

  // Generic data-i18n-title handler
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const keys = key.split('.');
    let value = t;
    for (const k of keys) {
      value = value ? value[k] : null;
    }
    if (value) {
      el.title = value;
    }
  });

  // Generic data-i18n-aria-label handler
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    const keys = key.split('.');
    let value = t;
    for (const k of keys) {
      value = value ? value[k] : null;
    }
    if (value) {
      el.setAttribute('aria-label', value);
    }
  });

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
  const pinPromptLabel = document.getElementById('settingsPinPromptLabel');
  if (pinPromptLabel) pinPromptLabel.textContent = t.settingsEnterPin || 'Enter your 6-digit PIN:';
  const pinSubmitBtn = document.getElementById('settingsPinSubmit');
  if (pinSubmitBtn) {
    const pinText = t.settingsEnterPin || 'Enter your 6-digit PIN:';
    pinSubmitBtn.setAttribute('title', pinText);
    pinSubmitBtn.setAttribute('aria-label', pinText);
  }
  const pinInputField = document.getElementById('settingsPinInput');
  if (pinInputField) pinInputField.placeholder = '000000';
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
  const showRedeemedRewardsLbl = document.querySelector("label[for='settingsShowRedeemedRewards']");
  if (showRedeemedRewardsLbl) showRedeemedRewardsLbl.textContent = t.showRedeemedRewardsLabel || 'Show redeemed rewards on mirror';
  const useAiLbl = document.querySelector("label[for='settingsUseAI']");
  if (useAiLbl) useAiLbl.textContent = t.useAiLabel || 'Use AI features';
  const chatbotLbl = document.getElementById('settingsChatbotLabel');
  if (chatbotLbl) chatbotLbl.textContent = t.chatbotToggleLabel || 'Enable AI chatbot in admin';
  const chatbotHelp = document.getElementById('settingsChatbotHelp');
  if (chatbotHelp) chatbotHelp.textContent = t.chatbotToggleHelp || 'Show a chat box with text and microphone support on the dashboard.';
  const chatbotVoiceLbl = document.getElementById('settingsChatbotVoiceLabel');
  if (chatbotVoiceLbl) chatbotVoiceLbl.textContent = t.chatbotVoiceLabel || 'Voice';
  const chatbotVoiceHelp = document.getElementById('settingsChatbotVoiceHelp');
  if (chatbotVoiceHelp) chatbotVoiceHelp.textContent = t.chatbotVoiceHelp || 'Choose the AI voice for spoken responses.';
  const aiChatTitle = document.getElementById('aiChatTitle');
  if (aiChatTitle) aiChatTitle.textContent = t.aiChatTitle || 'AI Chatbot';
  const aiChatSubtitle = document.getElementById('aiChatSubtitle');
  if (aiChatSubtitle) aiChatSubtitle.textContent = t.aiChatSubtitle || 'Ask questions about your chores, people, and schedule.';
  const aiChatSendLabel = document.getElementById('aiChatSendLabel');
  if (aiChatSendLabel) aiChatSendLabel.textContent = t.aiChatSendLabel || 'Send';
  const aiChatBadge = document.getElementById('aiChatBadge');
  if (aiChatBadge) aiChatBadge.textContent = t.aiChatBadge || 'Beta';
  const aiChatInput = document.getElementById('aiChatInput');
  if (aiChatInput) aiChatInput.placeholder = t.aiChatPlaceholder || 'Type your question...';
  const aiChatMic = document.getElementById('aiChatMic');
  if (aiChatMic) aiChatMic.title = t.aiChatMicTitle || 'Speak to the assistant';
  const userRewardsHeader = document.getElementById('userRewardsHeader');
  if (userRewardsHeader) userRewardsHeader.textContent = t.userRewardsTitle || 'User Reward Config';
  const userRewardsDescription = document.getElementById('userRewardsDescription');
  if (userRewardsDescription) userRewardsDescription.textContent = t.userRewardsDescription || 'Track redeemed rewards and mark them when delivered.';
  const rewardsLibraryHeader = document.getElementById('rewardsLibraryHeader');
  if (rewardsLibraryHeader) rewardsLibraryHeader.innerHTML = `<i class="bi bi-collection me-2"></i>${t.rewardsLibraryTitle || 'Rewards Library'}`;
  const rewardsLibraryDescription = document.getElementById('rewardsLibraryDescription');
  if (rewardsLibraryDescription) rewardsLibraryDescription.textContent = t.rewardsLibraryDescription || 'Review every reward below and edit details as needed.';
  const coinsDisabledTitle = document.getElementById('coinsSystemDisabledTitle');
  if (coinsDisabledTitle) coinsDisabledTitle.textContent = t.coinsSystemDisabledTitle || 'Coins System Not Enabled';
  const coinsDisabledDescription = document.getElementById('coinsSystemDisabledDescription');
  if (coinsDisabledDescription) coinsDisabledDescription.textContent = t.coinsSystemDisabledDescription || "The coin-based reward system is currently disabled. You're using the traditional level system.";
  const coinsDisabledButton = document.getElementById('coinsSystemDisabledButtonText');
  if (coinsDisabledButton) coinsDisabledButton.textContent = t.coinsSystemDisabledButton || 'Enable Coins System in Settings';
  const coinsDisabledHint = document.getElementById('coinsSystemDisabledHint');
  if (coinsDisabledHint) coinsDisabledHint.textContent = t.coinsSystemDisabledHint || 'You can switch between level and coins systems anytime without losing data.';
  const peoplePointsHeaderText = document.getElementById('peoplePointsHeaderText');
  if (peoplePointsHeaderText) peoplePointsHeaderText.textContent = t.peoplePointsTitle || 'People & Coins';
  const redemptionsHeaderText = document.getElementById('redemptionsHeaderText');
  if (redemptionsHeaderText) redemptionsHeaderText.textContent = t.redemptionsTitle || 'Pending Redemptions';
  const coinsSystemActiveText = document.getElementById('coinsSystemActiveText');
  if (coinsSystemActiveText) coinsSystemActiveText.textContent = t.coinsSystemActiveAlert || 'Coins system is active. Manage rewards below and view balances on the Rewards tab.';
  const currentCoinTotalsLabel = document.getElementById('currentCoinTotalsLabel');
  if (currentCoinTotalsLabel) currentCoinTotalsLabel.textContent = t.currentCoinTotalsLabel || 'Current Coin Totals:';
  const coinRewardsHeadingText = document.getElementById('coinRewardsHeadingText');
  if (coinRewardsHeadingText) coinRewardsHeadingText.textContent = t.rewardsTitle || 'Rewards Management';
  const rewardNameLabel = document.getElementById('rewardNameLabel');
  if (rewardNameLabel) rewardNameLabel.textContent = t.rewardNameLabel || 'Reward Name';
  const rewardNameInput = document.getElementById('rewardName');
  if (rewardNameInput) rewardNameInput.placeholder = t.rewardName || 'Reward name…';
  const rewardPointsLabel = document.getElementById('rewardPointsLabel');
  if (rewardPointsLabel) rewardPointsLabel.textContent = t.rewardPoints || 'Coins';
  const rewardPointsInput = document.getElementById('rewardPoints');
  if (rewardPointsInput) rewardPointsInput.placeholder = t.rewardPoints || 'Coins';
  const rewardDescriptionLabel = document.getElementById('rewardDescriptionLabel');
  if (rewardDescriptionLabel) rewardDescriptionLabel.textContent = t.rewardDescriptionLabel || 'Description';
  const rewardDescriptionInput = document.getElementById('rewardDescription');
  if (rewardDescriptionInput) rewardDescriptionInput.placeholder = t.rewardDescriptionPlaceholder || 'Optional';
  const rewardSubmitBtn = document.getElementById('rewardFormSubmitBtn');
  if (rewardSubmitBtn) rewardSubmitBtn.innerHTML = `<i class="bi bi-plus-lg me-1"></i>${t.addRewardButton || 'Add Reward'}`;
  const rewardCancelBtn = document.getElementById('rewardFormCancelBtn');
  if (rewardCancelBtn) rewardCancelBtn.innerHTML = `<i class="bi bi-x-circle me-1"></i>${t.cancelButton || 'Cancel'}`;
  const rewardEditNoticeText = document.getElementById('rewardEditNoticeText');
  if (rewardEditNoticeText) {
    const template = t.rewardEditNotice || 'Editing reward {name}. Save or cancel to finish editing.';
    rewardEditNoticeText.innerHTML = template.replace('{name}', '<strong id="rewardEditTarget"></strong>');
  }
  const taskCoinAssignmentTitle = document.getElementById('taskCoinAssignmentTitle');
  if (taskCoinAssignmentTitle) taskCoinAssignmentTitle.textContent = t.taskCoinAssignmentTitle || 'Task Coin Assignment';
  const taskCoinAssignmentDescription = document.getElementById('taskCoinAssignmentDescription');
  if (taskCoinAssignmentDescription) taskCoinAssignmentDescription.textContent = t.taskCoinAssignmentDescription || 'Assign coin values to tasks by matching their names.';
  const taskPatternLabel = document.getElementById('taskPatternLabel');
  if (taskPatternLabel) taskPatternLabel.textContent = t.taskPatternLabel || 'Task Name';
  const taskPatternInput = document.getElementById('taskPatternName');
  if (taskPatternInput) taskPatternInput.placeholder = LANGUAGES[currentLang].taskPatternSelectPlaceholder || 'Type a task name…';
  const taskPatternPointsLabel = document.getElementById('taskPatternPointsLabel');
  if (taskPatternPointsLabel) taskPatternPointsLabel.textContent = t.taskPatternPointsLabel || 'Coins Awarded';
  const taskPatternPointsInput = document.getElementById('taskPatternPoints');
  if (taskPatternPointsInput) taskPatternPointsInput.placeholder = t.taskPointsPlaceholder || 'Coins';
  const taskPointsAddRuleText = document.getElementById('taskPointsAddRuleText');
  if (taskPointsAddRuleText) taskPointsAddRuleText.textContent = t.taskPointsAddRule || 'Add Rule';
  const applyTaskPointsText = document.getElementById('applyTaskPointsText');
  if (applyTaskPointsText) applyTaskPointsText.textContent = t.taskPointsApplyButton || 'Apply Rules to Existing Tasks';
  const giftCoinsTitle = document.getElementById('giftCoinsTitle');
  if (giftCoinsTitle) giftCoinsTitle.textContent = t.giftCoinsTitle || 'Gift Coins to Person';
  const giftCoinsDescription = document.getElementById('giftCoinsDescription');
  if (giftCoinsDescription) giftCoinsDescription.textContent = t.giftCoinsDescription || 'Give bonus coins to people without completing a task.';
  const giftPersonLabel = document.getElementById('giftPersonLabel');
  if (giftPersonLabel) giftPersonLabel.textContent = t.giftPersonLabel || 'Person';
  const giftPersonSelect = document.getElementById('giftPersonSelect');
  if (giftPersonSelect) {
    const emptyOpt = giftPersonSelect.querySelector('option[value=""]');
    if (emptyOpt) emptyOpt.textContent = t.selectPersonLabel || 'Select person…';
  }
  const giftPointsAmountLabel = document.getElementById('giftPointsAmountLabel');
  if (giftPointsAmountLabel) giftPointsAmountLabel.textContent = t.giftPointsAmountLabel || 'Coins to Gift';
  const giftPointsAmountInput = document.getElementById('giftPointsAmount');
  if (giftPointsAmountInput) giftPointsAmountInput.placeholder = t.taskPointsPlaceholder || 'Coins';
  const giftPointsReasonLabel = document.getElementById('giftPointsReasonLabel');
  if (giftPointsReasonLabel) giftPointsReasonLabel.textContent = t.giftPointsReasonLabel || 'Reason (optional)';
  const giftPointsReasonInput = document.getElementById('giftPointsReason');
  if (giftPointsReasonInput) giftPointsReasonInput.placeholder = t.giftPointsReasonPlaceholder || 'e.g., Bonus';
  const giftCoinsButtonText = document.getElementById('giftCoinsButtonText');
  if (giftCoinsButtonText) giftCoinsButtonText.textContent = t.giftCoinsButton || 'Gift Coins';
  const rewardsTipLabel = document.getElementById('rewardsTipLabel');
  if (rewardsTipLabel) rewardsTipLabel.textContent = t.rewardsTipLabel || 'Tip:';
  const rewardsTipText = document.getElementById('rewardsTipText');
  if (rewardsTipText) rewardsTipText.textContent = t.rewardsTipText || 'To add or edit rewards, go to Settings → Coins System Settings → Rewards Management';
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
  const notificationsTitle = document.getElementById('notificationsTitle');
  if (notificationsTitle) notificationsTitle.textContent = t.notificationsTitle || 'Notifications';
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
  const editRewardModalLabel = document.getElementById('editRewardModalLabel');
  if (editRewardModalLabel) editRewardModalLabel.textContent = t.editReward || 'Edit Reward';
  const editRewardNameLabel = document.getElementById('editRewardNameLabel');
  if (editRewardNameLabel) editRewardNameLabel.textContent = t.rewardNameLabel || 'Reward Name';
  const editRewardPointsLabel = document.getElementById('editRewardPointsLabel');
  if (editRewardPointsLabel) editRewardPointsLabel.textContent = t.editRewardPointsLabel || t.rewardPoints || 'Coins';
  const editRewardDescriptionLabel = document.getElementById('editRewardDescriptionLabel');
  if (editRewardDescriptionLabel) editRewardDescriptionLabel.textContent = t.rewardDescriptionLabel || 'Description';
  const editRewardDescription = document.getElementById('editRewardDescription');
  if (editRewardDescription) editRewardDescription.placeholder = t.rewardDescriptionPlaceholder || 'Optional';
  const editRewardEmailLabel = document.getElementById('editRewardEmailLabel');
  if (editRewardEmailLabel) editRewardEmailLabel.textContent = t.editRewardEmailLabel || 'Email Template';
  const editRewardEmail = document.getElementById('editRewardEmail');
  if (editRewardEmail) editRewardEmail.placeholder = t.editRewardEmailPlaceholder || 'Optional email template for when reward is redeemed';
  const editRewardActiveLabel = document.getElementById('editRewardActiveLabel');
  if (editRewardActiveLabel) editRewardActiveLabel.textContent = t.editRewardActiveLabel || 'Active';
  const editRewardCancelBtn = document.getElementById('editRewardCancelBtn');
  if (editRewardCancelBtn) editRewardCancelBtn.textContent = t.cancelButton || 'Cancel';
  const editRewardSaveBtn = document.getElementById('editRewardSaveBtn');
  if (editRewardSaveBtn) editRewardSaveBtn.textContent = t.saveChangesButton || 'Save Changes';
  const editCoinsModalTitle = document.getElementById('editCoinsModalTitle');
  if (editCoinsModalTitle) editCoinsModalTitle.textContent = t.editCoinsModalTitle || 'Edit Coins';
  const editCoinsLabel = document.getElementById('editCoinsLabel');
  if (editCoinsLabel) editCoinsLabel.textContent = t.editCoinsLabel || 'Current Coins';
  const editCoinsHelper = document.getElementById('editCoinsHelper');
  if (editCoinsHelper) editCoinsHelper.textContent = t.editCoinsHelper || 'Enter the new coin amount for this person.';
  const editCoinsInfoText = document.getElementById('editCoinsInfoText');
  if (editCoinsInfoText) editCoinsInfoText.textContent = t.editCoinsInfo || 'You can manually adjust coin balances here. This is useful for giving bonus coins or correcting mistakes.';
  const editCoinsCancelBtn = document.getElementById('editCoinsCancelBtn');
  if (editCoinsCancelBtn) editCoinsCancelBtn.textContent = t.cancelButton || 'Cancel';
  const editCoinsSaveBtn = document.getElementById('editCoinsSaveBtn');
  if (editCoinsSaveBtn) editCoinsSaveBtn.textContent = t.saveChangesButton || 'Save Changes';
  const redeemRewardModalLabel = document.getElementById('redeemRewardModalLabel');
  if (redeemRewardModalLabel) redeemRewardModalLabel.textContent = t.redeemReward || 'Redeem Reward';
  const redeemPersonLabel = document.getElementById('redeemPersonLabel');
  if (redeemPersonLabel) redeemPersonLabel.textContent = t.selectPersonLabel || 'Select person...';
  const redeemPersonPlaceholder = document.getElementById('redeemPersonPlaceholder');
  if (redeemPersonPlaceholder) redeemPersonPlaceholder.textContent = t.selectPersonLabel || 'Select person...';
  const redeemRewardLabel = document.getElementById('redeemRewardLabel');
  if (redeemRewardLabel) redeemRewardLabel.textContent = t.selectRewardLabel || 'Select reward...';
  const redeemRewardPlaceholder = document.getElementById('redeemRewardPlaceholder');
  if (redeemRewardPlaceholder) redeemRewardPlaceholder.textContent = t.selectRewardLabel || 'Select reward...';
  const redeemRewardCancelBtn = document.getElementById('redeemRewardCancelBtn');
  if (redeemRewardCancelBtn) redeemRewardCancelBtn.textContent = t.cancelButton || 'Cancel';
  const redeemRewardSubmitBtn = document.getElementById('redeemRewardSubmitBtn');
  if (redeemRewardSubmitBtn) redeemRewardSubmitBtn.textContent = t.redeemButton || 'Redeem';

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
  const taskSeriesFilterLabel = document.getElementById('taskSeriesFilterLabel');
  if (taskSeriesFilterLabel) {
    taskSeriesFilterLabel.textContent = t.taskSeriesFilterLabel || 'Show recurring tasks only';
  }
  const taskSeriesFilterToggle = document.getElementById('tasksSeriesFilter');
  if (taskSeriesFilterToggle) {
    taskSeriesFilterToggle.checked = showTaskSeriesRootsOnly;
    if (!taskSeriesFilterToggle.dataset.bound) {
      taskSeriesFilterToggle.addEventListener('change', (event) => {
        showTaskSeriesRootsOnly = event.target.checked;
        localStorage.setItem(TASK_SERIES_FILTER_KEY, showTaskSeriesRootsOnly ? '1' : '0');
        renderTasks();
      });
      taskSeriesFilterToggle.dataset.bound = 'true';
    }
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

  [
    { id: 'giftPersonSelect', text: t.selectPersonLabel || 'Select person…' },
    { id: 'redeemPerson', text: t.selectPersonLabel || 'Select person…' },
    { id: 'redeemReward', text: t.selectRewardLabel || 'Select reward...' }
  ].forEach(({ id, text }) => {
    const select = document.getElementById(id);
    if (!select) return;
    const emptyOption = select.querySelector('option[value=""]');
    if (emptyOption) emptyOption.textContent = text;
  });

  // Manual updates for Reward System Settings (to ensure translation)
  const rewardSystemTitle = document.querySelector('[data-i18n="rewardSystemTitle"]');
  if (rewardSystemTitle) rewardSystemTitle.textContent = t.rewardSystemTitle;
  const rewardSystemInfo = document.querySelector('[data-i18n="rewardSystemInfo"]');
  if (rewardSystemInfo) rewardSystemInfo.textContent = t.rewardSystemInfo;
  const levelSystemLabel = document.querySelector('[data-i18n="levelSystemLabel"]');
  if (levelSystemLabel) levelSystemLabel.textContent = t.levelSystemLabel;
  const levelSystemDesc = document.querySelector('[data-i18n="levelSystemDesc"]');
  if (levelSystemDesc) levelSystemDesc.textContent = t.levelSystemDesc;
  const defaultBadge = document.querySelector('[data-i18n="defaultBadge"]');
  if (defaultBadge) defaultBadge.textContent = t.defaultBadge;
  const coinSystemLabel = document.querySelector('[data-i18n="coinSystemLabel"]');
  if (coinSystemLabel) coinSystemLabel.textContent = t.coinSystemLabel;
  const coinSystemDesc = document.querySelector('[data-i18n="coinSystemDesc"]');
  if (coinSystemDesc) coinSystemDesc.textContent = t.coinSystemDesc;
  const newFeatureBadge = document.querySelector('[data-i18n="newFeatureBadge"]');
  if (newFeatureBadge) newFeatureBadge.textContent = t.newFeatureBadge;
  const migrationWarning = document.querySelector('[data-i18n="migrationWarning"]');
  if (migrationWarning) migrationWarning.textContent = t.migrationWarning;
  
  const displaySettingsTitle = document.querySelector('[data-i18n="displaySettingsTitle"]');
  if (displaySettingsTitle) displaySettingsTitle.textContent = t.displaySettingsTitle;
  const showRewardsTabLabel = document.querySelector('[data-i18n="showRewardsTabLabel"]');
  if (showRewardsTabLabel) showRewardsTabLabel.textContent = t.showRewardsTabLabel;
  const showCoinsOnMirrorLabel = document.querySelector('[data-i18n="showCoinsOnMirrorLabel"]');
  if (showCoinsOnMirrorLabel) showCoinsOnMirrorLabel.textContent = t.showCoinsOnMirrorLabel;
  
  const levelSystemSettingsTitle = document.querySelector('[data-i18n="levelSystemSettingsTitle"]');
  if (levelSystemSettingsTitle) levelSystemSettingsTitle.textContent = t.levelSystemSettingsTitle;
  const configureLevelTitlesBtn = document.querySelector('[data-i18n="configureLevelTitlesBtn"]');
  if (configureLevelTitlesBtn) configureLevelTitlesBtn.textContent = t.configureLevelTitlesBtn;
  
  const coinsSystemSettingsTitle = document.querySelector('[data-i18n="coinsSystemSettingsTitle"]');
  if (coinsSystemSettingsTitle) coinsSystemSettingsTitle.textContent = t.coinsSystemSettingsTitle;
  
  const aiFeaturesTitle = document.querySelector('[data-i18n="aiFeaturesTitle"]');
  if (aiFeaturesTitle) aiFeaturesTitle.textContent = t.aiFeaturesTitle;
  const aiAudioLabel = document.querySelector('[data-i18n="aiAudioLabel"]');
  if (aiAudioLabel) aiAudioLabel.textContent = t.aiAudioLabel;
  const aiAudioHelp = document.querySelector('[data-i18n="aiAudioHelp"]');
  if (aiAudioHelp) aiAudioHelp.textContent = t.aiAudioHelp;
  
  const advancedFeaturesTitle = document.querySelector('[data-i18n="advancedFeaturesTitle"]');
  if (advancedFeaturesTitle) advancedFeaturesTitle.textContent = t.advancedFeaturesTitle;
  
  const maintenanceToolsTitle = document.querySelector('[data-i18n="maintenanceToolsTitle"]');
  if (maintenanceToolsTitle) maintenanceToolsTitle.textContent = t.maintenanceToolsTitle;
  const maintenanceToolsDesc = document.querySelector('[data-i18n="maintenanceToolsDesc"]');
  if (maintenanceToolsDesc) maintenanceToolsDesc.textContent = t.maintenanceToolsDesc;
  const runDataFixBtn = document.querySelector('[data-i18n="runDataFixBtn"]');
  if (runDataFixBtn) runDataFixBtn.textContent = t.runDataFixBtn;

  updateBoardTitleMap();
  renderPeople();
  renderTasks();
  renderCalendar();
  renderRewards();
  renderPeoplePoints();
  renderRedemptions();
  updateCoinTotalsPreview();
  populateTaskPatternSelect();

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
  renderPeople();
  renderPeoplePoints(); // Update coin display when people data changes
  populateGiftPersonSelect(); // Update gift points dropdown
  updateCoinTotalsPreview();
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
  populateTaskPatternSelect();
}

async function applySettings(newSettings) {
  if (typeof newSettings.levelingEnabled === 'boolean') {
    levelingEnabled = newSettings.levelingEnabled;
  }
  if (newSettings.useAI !== undefined) {
    const aiButton = document.getElementById('btnAiGenerate');
    if (aiButton) aiButton.style.display = newSettings.useAI === false ? 'none' : '';
  }
  if (newSettings.chatbotEnabled !== undefined || newSettings.useAI !== undefined) {
    const allowChat = (newSettings.chatbotEnabled ?? aiChatEnabled) && (newSettings.useAI ?? true);
    toggleAiChat(allowChat);
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

function openEditCoinsModal(person) {
  editCoinsPersonId = person.id;
  const modal = new bootstrap.Modal(document.getElementById('editCoinsModal'));
  const titleEl = document.getElementById('editCoinsModalTitle');
  const amountInput = document.getElementById('editCoinsAmount');
  const t = LANGUAGES[currentLang];
  
  if (titleEl) titleEl.textContent = `${t.editCoinsModalTitle || 'Edit Coins'} - ${person.name}`;
  if (amountInput) amountInput.value = person.points || 0;
  
  modal.show();
}

// Task Coin Rules Management
function renderTaskPointsRules() {
  const list = document.getElementById('taskPointsRulesList');
  if (!list) return;
  const t = LANGUAGES[currentLang];
  
  list.innerHTML = '';
  
  if (taskPointsRules.length === 0) {
    const li = document.createElement('li');
    li.className = 'list-group-item text-center text-muted small';
    li.textContent = t.taskPointsNoRules || 'No task coin rules defined';
    list.appendChild(li);
    return;
  }
  
  taskPointsRules.forEach((rule, index) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
    li.innerHTML = `
      <div>
        <strong class="small">${rule.pattern}</strong>
        <span class="badge bg-warning text-dark ms-2">${rule.points} ${t.pointsLabel || 'coins'}</span>
      </div>
      <button class="btn btn-sm btn-outline-danger" onclick="removeTaskPointsRule(${index})" title="${t.remove || 'Remove'}">
        <i class="bi bi-trash"></i>
      </button>
    `;
    list.appendChild(li);
  });
}

function removeTaskPointsRule(index) {
  taskPointsRules.splice(index, 1);
  saveTaskPointsRules();
  renderTaskPointsRules();
}

// Make function available globally for onclick
window.removeTaskPointsRule = removeTaskPointsRule;

async function saveTaskPointsRules() {
  try {
    await authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskPointsRules })
    });
  } catch (e) {
    console.error('Failed to save task coin rules:', e);
  }
}

async function applyTaskPointsRules() {
  const t = LANGUAGES[currentLang];
  if (taskPointsRules.length === 0) {
    showToast(t.taskPointsApplyNone || 'No rules to apply', 'warning');
    return;
  }
  
  let updatedCount = 0;
  
  for (const task of tasksCache) {
    if (task.deleted) continue;
    
    for (const rule of taskPointsRules) {
      const pattern = rule.pattern.toLowerCase();
      const taskName = task.name.toLowerCase();
      
      if (taskName.includes(pattern)) {
        if (task.points !== rule.points) {
          await authFetch(`/api/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: rule.points, autoPointsRule: rule.pattern })
          });
          updatedCount++;
        }
        break; // Only apply first matching rule
      }
    }
  }
  
  await fetchTasks();
  const successMsg = (t.taskPointsApplySuccess || 'Applied rules to {count} task(s)').replace('{count}', updatedCount);
  showToast(successMsg, 'success');
}

function resolveTaskCoinValue(taskName) {
  if (!taskName || !Array.isArray(taskPointsRules) || taskPointsRules.length === 0) {
    return null;
  }

  const normalized = taskName.toLowerCase();
  const matchingRule = taskPointsRules.find(rule => {
    if (!rule?.pattern) return false;
    return normalized.includes(rule.pattern.toLowerCase());
  });

  if (!matchingRule) return null;

  const parsed = parseInt(matchingRule.points, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Populate gift points person select
function populateGiftPersonSelect() {
  const select = document.getElementById('giftPersonSelect');
  if (!select) return;
  const t = LANGUAGES[currentLang];
  const placeholder = t.selectPersonLabel || 'Select person…';
  
  select.innerHTML = `<option value="">${placeholder}</option>`;
  peopleCache.forEach(person => {
    const option = document.createElement('option');
    option.value = person.id;
    const points = person.points || 0;
    option.textContent = `${person.name} (${points} ${t.pointsLabel || 'coins'})`;
    select.appendChild(option);
  });
}

function populateTaskPatternSelect() {
  const input = document.getElementById('taskPatternName');
  const datalist = document.getElementById('taskPatternSuggestions');
  if (!input || !datalist) return;

  const availableTasks = Array.isArray(tasksCache)
    ? tasksCache.filter(task => task && task.name)
    : [];
  const placeholder = LANGUAGES[currentLang].taskPatternSelectPlaceholder || 'Type a task name…';
  const emptyText = LANGUAGES[currentLang].taskPatternNoTasks || 'Type any task name';

  input.placeholder = availableTasks.length ? placeholder : emptyText;

  datalist.innerHTML = '';
  if (!availableTasks.length) return;

  const names = [...new Set(availableTasks.map(task => task.name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  names.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  });
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
  
  // Check if coin system is active
  const useCoinSystem = document.getElementById('useCoinSystem');
  const isCoinSystemActive = useCoinSystem && useCoinSystem.checked;

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
    
    // Show coins if coin system is active, otherwise show level
    if (isCoinSystemActive) {
      const small = document.createElement("small");
      small.className = "ms-2 text-muted";
      const coins = person.points || 0;
      small.innerHTML = `<i class="bi bi-coin text-warning"></i> ${coins} ${LANGUAGES[currentLang].pointsLabel || 'coins'}`;
      info.appendChild(small);
    } else if (levelingEnabled && person.level) {
      const small = document.createElement("small");
      small.className = "ms-2 text-muted";
      const titlePart = person.title ? ` - ${person.title}` : "";
      small.textContent = `lvl${person.level}${titlePart}`;
      info.appendChild(small);
    }

    li.appendChild(info);

    if (userPermission === 'write') {
      const actions = document.createElement('div');
      actions.className = 'btn-group btn-group-sm';
      
      // Show redeem reward button if coin system is active
      if (isCoinSystemActive) {
        const redeemBtn = document.createElement('button');
        redeemBtn.className = 'btn btn-outline-success';
        redeemBtn.title = LANGUAGES[currentLang].redeemReward || 'Redeem Reward';
        redeemBtn.innerHTML = '<i class="bi bi-gift"></i>';
        redeemBtn.onclick = () => openRedeemModalForPerson(person.id);
        actions.appendChild(redeemBtn);
      } else if (levelingEnabled) {
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-outline-secondary';
        viewBtn.title = LANGUAGES[currentLang].viewRewardsButton || 'Rewards';
        viewBtn.innerHTML = '<i class="bi bi-gift"></i>';
        viewBtn.onclick = () => showPersonRewards(person);
        actions.appendChild(viewBtn);
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
  const t = LANGUAGES[currentLang];
  const canWrite = userPermission === 'write';
  const list = document.getElementById("taskList");
  list.innerHTML = "";
  const useCoinSystem = document.getElementById('useCoinSystem');
  const isCoinSystemActive = useCoinSystem && useCoinSystem.checked;
  const activeTasks = tasksCache.filter(task => !task.deleted);

  if (activeTasks.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item text-center text-muted";
    li.textContent = t.noTasks;
    list.appendChild(li);
    return;
  }

  const recurringTasks = activeTasks.filter(task => task.recurring && task.recurring !== 'none'); // only keep recurring entries
  const visibleTasks = showTaskSeriesRootsOnly ? recurringTasks : activeTasks;

  if (visibleTasks.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item text-center text-muted";
    li.textContent = showTaskSeriesRootsOnly ? (t.taskSeriesFilterEmpty || t.noTasks) : t.noTasks;
    list.appendChild(li);
    return;
  }

  for (const task of visibleTasks) {
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
      const recurrenceLabel = (t.taskRecurring && t.taskRecurring[task.recurring]) || task.recurring;
      span.innerHTML += ` <span class="badge bg-info text-dark">${recurrenceLabel}</span>`;
    }
    if (isCoinSystemActive && typeof task.points === 'number' && task.points > 0) {
      span.innerHTML += ` <span class="badge bg-warning text-dark">${task.points} ${t.pointsLabel || 'coins'}</span>`;
    }
    if (task.done) span.classList.add("task-done");
    const person = peopleCache.find(p => p.id === task.assignedTo);
    const personName = person ? person.name : t.unassigned;
    span.innerHTML += ` - ${personName}`;

    left.appendChild(chk);
    left.appendChild(span);

    if (canWrite) {
      const del = document.createElement("button");
      del.className = "btn btn-sm btn-outline-danger";
      del.title = t.remove;
      del.innerHTML = '<i class="bi bi-trash"></i>';
      del.addEventListener("click", () => deleteTask(task.id));

      const dragBtn = document.createElement("button");
      dragBtn.className = "btn btn-sm btn-outline-secondary drag-handle";
      dragBtn.innerHTML = '<i class="bi bi-list"></i>';

      if (!task.done) {
        const edit = document.createElement("button");
        edit.className = "btn btn-sm btn-outline-secondary";
        edit.title = t.edit;
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
        const activeSnapshot = tasksCache.filter(task => !task.deleted);
        let reordered;
        if (showTaskSeriesRootsOnly) {
          const displayed = visibleTasks.slice();
          const movedRoot = displayed.splice(evt.oldIndex, 1)[0];
          displayed.splice(evt.newIndex, 0, movedRoot);
          const grouped = activeSnapshot.reduce((map, task) => {
            const seriesId = task.seriesId || task.id;
            if (!map.has(seriesId)) map.set(seriesId, []);
            map.get(seriesId).push(task);
            return map;
          }, new Map());
          const seriesOrder = displayed.map(task => task.seriesId || task.id);
          const usedSeries = new Set();
          reordered = [];
          seriesOrder.forEach(seriesId => {
            const group = grouped.get(seriesId) || [];
            group.forEach(item => reordered.push(item));
            usedSeries.add(seriesId);
          });
          activeSnapshot.forEach(task => {
            const seriesId = task.seriesId || task.id;
            if (!usedSeries.has(seriesId)) {
              reordered.push(task);
              usedSeries.add(seriesId);
            }
          });
        } else {
          reordered = activeSnapshot.slice();
          const moved = reordered.splice(evt.oldIndex, 1)[0];
          reordered.splice(evt.newIndex, 0, moved);
        }

        let i = 0;
        tasksCache = tasksCache.map(task => task.deleted ? task : reordered[i++]);
        const ids = reordered.map(task => task.id);
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
  if (!name) return;
  const points = resolveTaskCoinValue(name);
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

  const payload = {
    name,
    date,
    recurring,
    assignedTo: assigned ? parseInt(assigned) : null,
    created: iso,
    createdShort: stamp("C")
  };

  if (typeof points === 'number' && points > 0) {
    payload.points = points;
  }

  await authFetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  e.target.reset();
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
  await fetchPeople(); // Refresh people to update points after task completion
  renderPeoplePoints(); // Update the rewards tab if visible
}

async function deletePerson(id) {
  const person = peopleCache.find(p => p.id === id);
  const personName = person ? person.name : LANGUAGES[currentLang].unassigned;
  const assignedTasks = tasksCache.filter(task => !task.deleted && task.assignedTo === id);
  const confirmMsg = assignedTasks.length > 0
    ? `${personName} still has ${assignedTasks.length} assigned task(s). Delete anyway?`
    : `Delete ${personName}?`;

  if (!confirm(confirmMsg)) return;

  try {
    await authFetch(`/api/people/${id}`, { method: "DELETE" });
    await fetchPeople();
    await fetchTasks();
    showToast(LANGUAGES[currentLang].personDeleted || `${personName} deleted`, 'success');
  } catch (e) {
    showToast(LANGUAGES[currentLang].personDeleteFailed || 'Failed to delete person', 'danger');
  }
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
  setupAiChat();
  toggleAiChat(userSettings.chatbotEnabled && userSettings.useAI !== false);
  await applySettings(userSettings);

  // Initialize rewards system visibility
  const userCoinSystemEnabled = userSettings.useCoinSystem ?? userSettings.usePointSystem ?? false;
  updateRewardsTabVisibility(userCoinSystemEnabled, userSettings.showRewardsTab !== false);
  
  if (userCoinSystemEnabled) {
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
  const settingsPinPrompt = document.getElementById('settingsPinPrompt');
  const settingsPinInput = document.getElementById('settingsPinInput');
  const settingsPinSubmit = document.getElementById('settingsPinSubmit');
  const modal = settingsModalEl ? new bootstrap.Modal(settingsModalEl) : null;

  const togglePinPrompt = (visible) => {
    if (!settingsPinPrompt) return;
    settingsPinPrompt.classList.toggle('d-none', !visible);
    if (visible && settingsPinInput) {
      settingsPinInput.value = '';
      setTimeout(() => settingsPinInput.focus(), 50);
    }
  };

  const attemptSettingsUnlock = () => {
    if (!settingsPinInput) return;
    const candidate = (settingsPinInput.value || '').trim();
    if (!/^\d{6}$/.test(candidate)) {
      if (lockedMsg) {
        lockedMsg.textContent = LANGUAGES[currentLang].settingsEnterPin;
        lockedMsg.classList.remove('d-none');
      }
      settingsPinInput.focus();
      return;
    }
    if (candidate === settingsMode) {
      settingsMode = 'unlocked';
      togglePinPrompt(false);
      if (lockedMsg) lockedMsg.classList.add('d-none');
      if (settingsForm) settingsForm.classList.remove('d-none');
    } else {
      if (lockedMsg) {
        lockedMsg.textContent = LANGUAGES[currentLang].settingsWrongPin;
        lockedMsg.classList.remove('d-none');
      }
      settingsPinInput.value = '';
      settingsPinInput.focus();
    }
  };

  if (settingsPinSubmit) {
    settingsPinSubmit.addEventListener('click', attemptSettingsUnlock);
  }
  if (settingsPinInput) {
    settingsPinInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        attemptSettingsUnlock();
      }
    });
    settingsPinInput.addEventListener('input', () => {
      const digitsOnly = settingsPinInput.value.replace(/\D/g, '').slice(0, 6);
      settingsPinInput.value = digitsOnly;
    });
  }

  if (settingsBtn && modal) {
    settingsBtn.addEventListener('click', () => {
      settingsChanged = false;
      settingsSaved = false;
      if (settingsMode === 'unlocked') {
        togglePinPrompt(false);
        if (lockedMsg) lockedMsg.classList.add('d-none');
        if (settingsForm) settingsForm.classList.remove('d-none');
        modal.show();
        return;
      }

      if (/^\d{6}$/.test(settingsMode)) {
        if (settingsForm) settingsForm.classList.add('d-none');
        togglePinPrompt(true);
        if (lockedMsg) {
          lockedMsg.textContent = '';
          lockedMsg.classList.add('d-none');
        }
        modal.show();
        return;
      }

      togglePinPrompt(false);
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
let rewardFormEditId = null;

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
  const settingsList = document.getElementById('rewardsList');
  const libraryList = document.getElementById('rewardsManageList');

  if (!settingsList && !libraryList) return;

  const t = LANGUAGES[currentLang] || {};
  const emptyMessage = t.noRewardsConfigured || 'No rewards configured yet';

  [settingsList, libraryList].forEach(list => {
    if (list) list.innerHTML = '';
  });

  if (!rewardsCache.length) {
    [settingsList, libraryList].forEach(list => {
      if (!list) return;
      const li = document.createElement('li');
      li.className = 'list-group-item text-center text-muted';
      li.textContent = emptyMessage;
      list.appendChild(li);
    });
    return;
  }

  const sortedRewards = rewardsCache
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  if (settingsList) {
    sortedRewards.forEach(reward => {
      settingsList.appendChild(createSettingsRewardItem(reward, t));
    });
  }

  if (libraryList) {
    const availableRewards = sortedRewards.filter(reward => reward.active !== false);
    const availableMessage = t.noActiveRewards || emptyMessage;
    if (!availableRewards.length) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-center text-muted';
      li.textContent = availableMessage;
      libraryList.appendChild(li);
    } else {
      availableRewards.forEach(reward => {
        libraryList.appendChild(createRewardListItem(reward, t));
      });
    }
  }
}

function createRewardListItem(reward, t) {
  const item = document.createElement('li');
  item.className = 'list-group-item d-flex justify-content-between align-items-center flex-column flex-md-row gap-2';

  const details = document.createElement('div');
  details.innerHTML = `
    <strong>${reward.name}</strong>
    <span class="badge bg-primary ms-2">${reward.pointCost} ${t.pointsLabel || 'coins'}</span>
    ${reward.description ? `<br><small class="text-muted">${reward.description}</small>` : ''}
  `;

  const actionWrapper = document.createElement('div');
  actionWrapper.className = 'd-flex justify-content-center justify-content-md-end w-100';

  const redeemBtn = document.createElement('button');
  redeemBtn.className = 'btn btn-sm btn-outline-success';
  redeemBtn.title = t.redeemReward || 'Redeem Reward';
  redeemBtn.innerHTML = '<i class="bi bi-gift"></i>';
  redeemBtn.onclick = () => openRedeemModal(reward.id);

  actionWrapper.appendChild(redeemBtn);
  item.append(details, actionWrapper);
  return item;
}

function createSettingsRewardItem(reward, t) {
  const item = document.createElement('li');
  item.className = 'list-group-item d-flex justify-content-between align-items-start flex-column flex-md-row gap-2';

  const inactiveBadge = reward.active === false
    ? `<span class="badge bg-secondary ms-2">${t.rewardInactive || 'Inactive'}</span>`
    : '';

  const details = document.createElement('div');
  details.innerHTML = `
    <strong>${reward.name}</strong>
    <span class="badge bg-primary ms-2">${reward.pointCost} ${t.pointsLabel || 'coins'}</span>
    ${inactiveBadge}
    ${reward.description ? `<br><small class="text-muted">${reward.description}</small>` : ''}
  `;

  const buttons = document.createElement('div');
  buttons.className = 'btn-group btn-group-sm';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-outline-secondary';
  editBtn.title = t.editReward || 'Edit Reward';
  editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
  editBtn.onclick = () => startRewardFormEdit(reward.id);
  buttons.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-outline-danger';
  deleteBtn.title = t.deleteReward || 'Delete';
  deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
  deleteBtn.onclick = () => deleteReward(reward.id);
  buttons.appendChild(deleteBtn);

  item.append(details, buttons);
  return item;
}

function startRewardFormEdit(rewardId) {
  const reward = rewardsCache.find(r => r.id === rewardId);
  if (!reward) return;

  rewardFormEditId = rewardId;

  const nameInput = document.getElementById('rewardName');
  const pointsInput = document.getElementById('rewardPoints');
  const descriptionInput = document.getElementById('rewardDescription');

  if (nameInput) nameInput.value = reward.name || '';
  if (pointsInput) pointsInput.value = reward.pointCost || '';
  if (descriptionInput) descriptionInput.value = reward.description || '';

  updateRewardFormModeUI(true, reward.name || '');

  const rewardForm = document.getElementById('rewardForm');
  if (rewardForm) {
    rewardForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateRewardFormModeUI(isEditing, rewardName = '') {
  const submitBtn = document.getElementById('rewardFormSubmitBtn');
  const cancelBtn = document.getElementById('rewardFormCancelBtn');
  const notice = document.getElementById('rewardEditNotice');
  const target = document.getElementById('rewardEditTarget');

  if (submitBtn) {
    submitBtn.innerHTML = isEditing
      ? '<i class="bi bi-check-lg me-1"></i>Update'
      : '<i class="bi bi-plus-lg me-1"></i>Add';
  }

  if (cancelBtn) {
    cancelBtn.classList.toggle('d-none', !isEditing);
  }

  if (notice) {
    notice.classList.toggle('d-none', !isEditing);
  }

  if (target) {
    target.textContent = isEditing ? rewardName : '';
  }
}

function cancelRewardFormEdit() {
  rewardFormEditId = null;
  const rewardForm = document.getElementById('rewardForm');
  if (rewardForm) {
    rewardForm.reset();
  }
  updateRewardFormModeUI(false);
}

function renderPeoplePoints() {
  const list = document.getElementById('peoplePointsList');
  if (!list) return;

  const t = LANGUAGES[currentLang] || {};
  const currencyLabel = t.pointsLabel || 'coins';
  const redeemTitle = t.redeemReward || 'Redeem Reward';
  const redeemBtnLabel = t.redeemButton || t.redeemReward || 'Redeem';

  list.innerHTML = '';
  peopleCache.forEach(person => {
    const points = person.points || 0;
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';
    item.innerHTML = `
      <div>
        <strong>${person.name}</strong>
        <span class="badge bg-warning text-dark ms-2">${points} ${currencyLabel}</span>
      </div>
      <button class="btn btn-sm btn-outline-primary" onclick="openRedeemModalForPerson(${person.id})" title="${redeemTitle}">
        <i class="bi bi-gift"></i> ${redeemBtnLabel}
      </button>
    `;
    list.appendChild(item);
  });
}

function renderRedemptions() {
  const t = LANGUAGES[currentLang] || {};
  const pending = redemptionsCache
    .filter(redemption => !redemption.used)
    .sort((a, b) => new Date(b.redeemed) - new Date(a.redeemed));

  renderPendingRedemptionsCard(pending, t);
  renderPendingRedemptionsSettings(pending, t);
}

function renderPendingRedemptionsCard(pending, t) {
  const list = document.getElementById('redemptionsList');
  if (!list) return;

  list.innerHTML = '';

  if (!pending.length) {
    list.innerHTML = `<li class="list-group-item text-muted text-center">${t.noPendingRedemptions || t.noRedemptions || 'No pending redemptions'}</li>`;
    return;
  }

  pending.forEach(redemption => {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2';
    item.innerHTML = `
      <div>
        <strong>${redemption.personName}</strong> ${(t.redeemedRewardLabel || 'redeemed')} <strong>${redemption.rewardName}</strong>
        <br><small class="text-muted">${new Date(redemption.redeemed).toLocaleString()} • ${redemption.pointCost} ${t.pointsLabel || 'coins'}</small>
      </div>
      <span class="badge bg-warning text-dark">${t.rewardPending || 'Pending'}</span>
    `;
    list.appendChild(item);
  });
}

function renderPendingRedemptionsSettings(pending, t) {
  const list = document.getElementById('userRewardList');
  if (!list) return;

  list.innerHTML = '';

  if (!pending.length) {
    list.innerHTML = `<li class="list-group-item text-muted text-center">${t.noPendingRedemptions || t.noRedemptions || 'No pending redemptions'}</li>`;
    return;
  }

  pending.forEach(redemption => {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2';

    const details = document.createElement('div');
    details.innerHTML = `
      <strong>${redemption.personName}</strong>
      <span class="text-muted">${t.redeemedRewardLabel || 'redeemed'}</span>
      <strong>${redemption.rewardName}</strong>
      <br><small class="text-muted">${new Date(redemption.redeemed).toLocaleString()} • ${redemption.pointCost} ${t.pointsLabel || 'coins'}</small>
    `;

    const actions = document.createElement('div');
    actions.className = 'd-flex flex-wrap align-items-center gap-2';

    const markBtn = document.createElement('button');
    markBtn.type = 'button';
    markBtn.className = 'btn btn-sm btn-outline-success';
    markBtn.innerHTML = `<i class="bi bi-check2"></i> ${t.markUsedButton || 'Mark as used'}`;
    markBtn.addEventListener('click', () => markRedemptionUsed(redemption.id));

    actions.appendChild(markBtn);
    item.append(details, actions);
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
  const t = LANGUAGES[currentLang] || {};
  const currencyLabel = t.pointsLabel || 'coins';
  const personPlaceholder = t.selectPersonLabel || 'Select person...';
  const rewardPlaceholder = t.selectRewardLabel || 'Select reward...';
  
  // Populate people
  personSelect.innerHTML = `<option value="">${personPlaceholder}</option>`;
  peopleCache.forEach(person => {
    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = `${person.name} (${person.points || 0} ${currencyLabel})`;
    personSelect.appendChild(option);
  });
  
  // Populate rewards
  rewardSelect.innerHTML = `<option value="">${rewardPlaceholder}</option>`;
  rewardsCache.filter(r => r.active !== false).forEach(reward => {
    const option = document.createElement('option');
    option.value = reward.id;
    option.textContent = `${reward.name} (${reward.pointCost} ${currencyLabel})`;
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
  const t = LANGUAGES[currentLang] || {};
  const currencyLabel = t.pointsLabel || 'coins';
  
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
    ? `${person.name} has enough ${currencyLabel} to redeem ${reward.name}`
    : `${person.name} needs ${reward.pointCost - personPoints} more ${currencyLabel} to redeem ${reward.name}`;
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
  const rewardFormCancelBtn = document.getElementById('rewardFormCancelBtn');
  if (rewardFormCancelBtn) {
    rewardFormCancelBtn.addEventListener('click', cancelRewardFormEdit);
  }
  if (rewardForm) {
    rewardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      
      const nameInput = document.getElementById('rewardName');
      const pointsInput = document.getElementById('rewardPoints');
      const descriptionInput = document.getElementById('rewardDescription');

      const name = (nameInput?.value || '').trim();
      const pointCost = parseInt(pointsInput?.value, 10);
      const description = (descriptionInput?.value || '').trim();

      if (!name || !pointCost || pointCost <= 0) {
        showToast('Enter a reward name and coin cost first', 'warning');
        return;
      }

      const payload = { name, pointCost, description };

      try {
        if (rewardFormEditId) {
          const existing = rewardsCache.find(r => r.id === rewardFormEditId);
          if (existing) {
            payload.emailTemplate = existing.emailTemplate || '';
            payload.active = existing.active === false ? false : true;
          }

          await authFetch(`/api/rewards/${rewardFormEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          showToast('Reward updated', 'success');
        } else {
          await authFetch('/api/rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          showToast('Reward added', 'success');
        }

        cancelRewardFormEdit();
        await fetchRewards();
      } catch (err) {
        showToast(rewardFormEditId ? 'Failed to update reward' : 'Failed to add reward', 'danger');
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
  
  // Edit coins form
  const editCoinsForm = document.getElementById('editCoinsForm');
  if (editCoinsForm) {
    editCoinsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!editCoinsPersonId) return;
      
      const newAmount = parseInt(document.getElementById('editCoinsAmount').value);
      
      try {
        const person = peopleCache.find(p => p.id === editCoinsPersonId);
        if (!person) {
          showToast('Person not found', 'danger');
          return;
        }
        
        person.points = newAmount;
        
        // Save via settings endpoint to update the data file
        await authFetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _updatePersonCoins: { personId: editCoinsPersonId, points: newAmount } })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('editCoinsModal')).hide();
        await fetchPeople();
        renderPeoplePoints();
        showToast('Coins updated successfully', 'success');
      } catch (e) {
        showToast('Failed to update coins', 'danger');
      }
    });
  }
  
  // Task coin form
  const taskPointsForm = document.getElementById('taskPointsForm');
  if (taskPointsForm) {
    taskPointsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const patternInput = document.getElementById('taskPatternName');
      const pattern = patternInput ? patternInput.value.trim() : '';
      const points = parseInt(document.getElementById('taskPatternPoints').value);
      
      if (!pattern || !points) return;
      
      taskPointsRules.push({ pattern, points });
      await saveTaskPointsRules();
      renderTaskPointsRules();
      taskPointsForm.reset();
      showToast('Task coin rule added', 'success');
    });
  }
  
  // Apply task coin button
  const applyTaskPointsBtn = document.getElementById('applyTaskPointsBtn');
  if (applyTaskPointsBtn) {
    applyTaskPointsBtn.addEventListener('click', applyTaskPointsRules);
  }
  
  // Gift coins form
  const giftPointsForm = document.getElementById('giftPointsForm');
  if (giftPointsForm) {
    giftPointsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const personId = parseInt(document.getElementById('giftPersonSelect').value);
      const points = parseInt(document.getElementById('giftPointsAmount').value);
      const reason = document.getElementById('giftPointsReason').value.trim();
      
      if (!personId || !points) return;
      
      try {
        const person = peopleCache.find(p => p.id === personId);
        if (!person) {
          showToast('Person not found', 'danger');
          return;
        }
        
        const newTotal = (person.points || 0) + points;
        
        await authFetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            _updatePersonCoins: { personId, points: newTotal },
            _giftReason: reason || 'Gift'
          })
        });
        
        await fetchPeople();
        renderPeoplePoints();
        populateGiftPersonSelect();
        giftPointsForm.reset();
        showToast(`Gifted ${points} coins to ${person.name}`, 'success');
      } catch (e) {
        showToast('Failed to gift coins', 'danger');
      }
    });
  }
});
