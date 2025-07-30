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

// ==========================
// API: Hämta inställningar från backend
// ==========================
async function fetchUserSettings() {
  try {
    const res = await fetch('/api/settings');
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
    await fetch('/api/settings', {
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

  const showPast = document.getElementById('settingsShowPast');
  const textSize = document.getElementById('settingsTextSize');
  const dateFmt = document.getElementById('settingsDateFmt');
  const openAI = document.getElementById('settingsOpenAI');
  const useAI = document.getElementById('settingsUseAI');
  const showAnalytics = document.getElementById('settingsShowAnalytics');
  const levelEnable = document.getElementById('settingsLevelEnable');
  const yearsInput = document.getElementById('settingsYears');
  const perWeekInput = document.getElementById('settingsPerWeek');
  const maxLevelInput = document.getElementById('settingsMaxLevel');

  if (showPast) showPast.checked = !!settings.showPast;
  if (textSize) textSize.value = settings.textMirrorSize || 'small';
  if (dateFmt) dateFmt.value = settings.dateFormatting || '';
  if (openAI) openAI.value = settings.openaiApiKey || '';
  if (useAI) useAI.checked = settings.useAI !== false;
  if (showAnalytics) showAnalytics.checked = !!settings.showAnalyticsOnMirror;
  if (levelEnable) levelEnable.checked = settings.levelingEnabled !== false;
  if (yearsInput) yearsInput.value = settings.leveling?.yearsToMaxLevel || 3;
  if (perWeekInput) perWeekInput.value = settings.leveling?.choresPerWeekEstimate || 4;
  if (maxLevelInput) maxLevelInput.value = settings.leveling?.maxLevel || 100;

  settingsChanged = false;
  settingsSaved = false;

  const inputs = [showPast, textSize, dateFmt, openAI, useAI, showAnalytics, levelEnable, yearsInput, perWeekInput, maxLevelInput];
  inputs.forEach(el => {
    if (el) {
      el.addEventListener('input', () => { settingsChanged = true; });
      el.addEventListener('change', () => { settingsChanged = true; });
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    settingsSaved = true;
    const payload = {
      showPast: showPast.checked,
      textMirrorSize: textSize.value,
      dateFormatting: dateFmt.value,
      openaiApiKey: openAI.value,
      useAI: useAI.checked,
      showAnalyticsOnMirror: showAnalytics.checked,
      levelingEnabled: levelEnable.checked,
      leveling: {
        yearsToMaxLevel: parseFloat(yearsInput.value) || 3,
        choresPerWeekEstimate: parseFloat(perWeekInput.value) || 4,
        maxLevel: parseInt(maxLevelInput.value, 10) || 100
      }
    };
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        await applySettings(data.settings || payload);
        const instance = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        if (instance) instance.hide();
      }
    } catch (err) {
      console.error('Failed saving settings', err);
    }
  });
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

  const tabs = document.querySelectorAll(".nav-link");
  if (tabs[0]) tabs[0].textContent = t.tabs[0];
  if (tabs[1]) tabs[1].textContent = t.tabs[1];

  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) settingsBtn.title = t.settingsBtnTitle || 'Settings';
  const modalTitle = document.getElementById("settingsModalLabel");
  if (modalTitle) modalTitle.textContent = t.settingsTitle || 'Settings';
  const saveBtn = document.getElementById("settingsSaveBtn");
  if (saveBtn) saveBtn.textContent = t.saveButton || 'Save';
  const levelEnableLbl = document.querySelector("label[for='settingsLevelEnable']");
  if (levelEnableLbl) levelEnableLbl.textContent = t.levelingEnabledLabel;
  const yearsLbl = document.querySelector("label[for='settingsYears']");
  if (yearsLbl) yearsLbl.textContent = t.yearsToMaxLabel;
  const perWeekLbl = document.querySelector("label[for='settingsPerWeek']");
  if (perWeekLbl) perWeekLbl.textContent = t.choresPerWeekLabel;
  const maxLvlLbl = document.querySelector("label[for='settingsMaxLevel']");
  if (maxLvlLbl) maxLvlLbl.textContent = t.maxLevelLabel;

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
  const res = await fetch("/api/people");
  peopleCache = await res.json();
  renderPeople();
}

async function fetchTasks() {
  const res = await fetch("/api/tasks");
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
  await fetchPeople();
  await fetchTasks();
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
    if (levelingEnabled && person.level) {
      const small = document.createElement("small");
      small.className = "ms-2 text-muted";
      const titlePart = person.title ? ` - ${person.title}` : "";
      small.textContent = `lvl${person.level}${titlePart}`;
      info.appendChild(small);
    }

    li.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-danger";
    btn.title = LANGUAGES[currentLang].remove;
    btn.innerHTML = '<i class="bi bi-trash"></i>';
    btn.onclick = () => deletePerson(person.id);

    li.appendChild(btn);
    list.appendChild(li);
  }

}

function renderTasks() {
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
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.dataset.id = task.id;

    const left = document.createElement("div");
    left.className = "d-flex align-items-center";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = task.done;
    chk.className = "form-check-input me-3";
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

  const span = document.createElement("span");
  span.innerHTML = `<strong>${task.name}</strong> <small class="task-date">(${task.date})</small>`;
  if (task.recurring && task.recurring !== "none") {
    const recurText = LANGUAGES[currentLang].taskRecurring[task.recurring] || task.recurring;
    span.innerHTML += ` <span class="badge bg-info text-dark">${recurText}</span>`;
  }
  if (task.done) span.classList.add("task-done");

    left.appendChild(chk);
    left.appendChild(span);

    const select = document.createElement("select");
    select.className = "form-select mx-3";
    select.add(new Option(LANGUAGES[currentLang].unassigned, ""));
    peopleCache.forEach(p => {
      const opt = new Option(p.name, p.id);
      if (task.assignedTo === p.id) opt.selected = true;
      select.add(opt);
    });
    
    select.addEventListener("change", () => {
      const val = select.value ? parseInt(select.value) : null;
      const updateObj = { assignedTo: val };
      if (val !== task.assignedTo) {
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
        updateObj.assignedDate = iso;
        updateObj.assignedDateShort = stamp("A");
      }
      updateTask(task.id, updateObj);
    });

    const del = document.createElement("button");
    del.className = "btn btn-sm btn-outline-danger me-1";
    del.title = LANGUAGES[currentLang].remove;
    del.innerHTML = '<i class="bi bi-trash"></i>';
    del.addEventListener("click", () => deleteTask(task.id));

    const dragBtn = document.createElement("button");
    dragBtn.className = "btn btn-sm btn-outline-secondary drag-handle me-1";
    dragBtn.innerHTML = '<i class="bi bi-list"></i>';


    if (!task.done) {
      const edit = document.createElement("button");
      edit.className = "btn btn-sm btn-outline-secondary me-1";
      edit.title = LANGUAGES[currentLang].edit;
      edit.innerHTML = '<i class="bi bi-pencil"></i>';
      edit.addEventListener("click", async () => {
        const newName = prompt(LANGUAGES[currentLang].taskNamePlaceholder, task.name);
        if (newName === null) return;
        let newDate = prompt("YYYY-MM-DD", task.date);
        if (newDate === null) return;
        newDate = newDate.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
          alert("Invalid date format. Use YYYY-MM-DD.");
          return;
        }
        await updateTask(task.id, { name: newName.trim(), date: newDate });
      });
      li.append(left, select, edit, del, dragBtn);
    } else {
      li.append(left, select, del, dragBtn);
    }

    list.appendChild(li);
  }


  if (taskSortable) {
    taskSortable.destroy();
  }
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
      await fetch('/api/tasks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids)
      });
    }
  });
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
document.getElementById("personForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("personName").value.trim();
  if (!name) return;
  await fetch("/api/people", {
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

  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      date,
      recurring,
      created: iso,
      createdShort: stamp("C")
    })
  });
  e.target.reset();
  await fetchTasks();
});

async function updateTask(id, changes) {
  Object.keys(changes).forEach(key => {
    if (changes[key] === null) changes[key] = undefined;
  });
  await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes)
  });
  await fetchTasks();
}

async function deletePerson(id) {
  await fetch(`/api/people/${id}`, { method: "DELETE" });
  await fetchPeople();
  await fetchTasks();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  await fetchTasks();
}


// ==========================
// Analytics Board Persistence
// ==========================
async function fetchSavedBoards() {
  try {
    const res = await fetch('/api/analyticsBoards');
    if (!res.ok) throw new Error('Failed fetching saved boards');
    return await res.json();
  } catch (e) {
    console.warn('No saved analytics boards or error:', e);
    return [];
  }
}

async function saveBoards(typesArray) {
  try {
    await fetch('/api/analyticsBoards', {
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
const themeTgl = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const STORAGE_KEY = "mmm-chores-theme";

const savedTheme = localStorage.getItem(STORAGE_KEY) || "light";
root.setAttribute("data-theme", savedTheme);
themeTgl.checked = savedTheme === "dark";
setIcon(savedTheme);

themeTgl.addEventListener("change", () => {
  const theme = themeTgl.checked ? "dark" : "light";
  root.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  setIcon(theme);
});

function setIcon(theme) {
  themeIcon.className = theme === "dark"
    ? "bi bi-moon-stars-fill"
    : "bi bi-brightness-high-fill";
}

document.addEventListener("DOMContentLoaded", async () => {
  const userSettings = await fetchUserSettings();
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

  initSettingsForm(userSettings);

  setLanguage(currentLang);
  await fetchPeople();
  await fetchTasks();

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
      if (settingsMode !== 'unlocked') {
        if (lockedMsg) {
          lockedMsg.textContent = LANGUAGES[currentLang].settingsLocked;
          lockedMsg.classList.remove('d-none');
        }
        if (settingsForm) settingsForm.classList.add('d-none');
      } else {
        if (lockedMsg) lockedMsg.classList.add('d-none');
        if (settingsForm) settingsForm.classList.remove('d-none');
      }
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
      const res = await fetch('/api/ai-generate', { method: "POST" });
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
