const LANGUAGES = {
  en: {
    title: "MMM-Chores Admin  ",
    subtitle: "Manage tasks, people & analytics",
    tabs: ["Dashboard", "Analytics"],
    peopleTitle: "People",
    newPersonPlaceholder: "New person…",
    addPersonBtnTitle: "Add",
    taskTitle: "Tasks",
    taskDoneLabel: "done",
    taskPendingLabel: "pending",
    taskNamePlaceholder: "Task name…",
    taskAddButton: "Add",
    aiGenerateButton: "AI Generate",
    aiGenerateTitle: "Generate tasks with AI",
    analyticsTitle: "Analytics",
    addChartOption: "Add Chart...",
    chartOptions: {
      weekly: "Tasks Completed Per Week",
      weekdays: "Busiest Weekdays",
      perPerson: "Chores Per Person",
      taskmaster: "Taskmaster This Month",
      lazyLegends: "Lazy Legends",
      speedDemons: "Speed Demons",
      weekendWarriors: "Weekend Warriors",
      slacker9000: "Slacker Detector 9000"
    },
    noPeople: "No people added",
    noTasks: "No tasks added",
    unassigned: "Unassigned",
    remove: "Remove",
    edit: "Edit",
    chartLabels: {
      unfinishedTasks: "Unfinished Tasks",
      completedTasks: "Completed Tasks",
      avgCompletionTime: "Avg Completion Time (days)",
      weekendTasksCompleted: "Weekend Tasks Completed",
      oldestOpenTaskAge: "Oldest Open Task Age (days)"
    },
    weekLabel: "Week",
    monthLabel: "Month",
    footer: "Built with Bootstrap & Chart.js • MMM-Chores by Pierre Gode"
  },
  sv: {
    title: "MMM-Chores Admin  ",
    subtitle: "Hantera uppgifter, personer & analys",
    tabs: ["Dashboard", "Analys"],
    peopleTitle: "Personer",
    newPersonPlaceholder: "Ny person…",
    addPersonBtnTitle: "Lägg till",
    taskTitle: "Uppgifter",
    taskDoneLabel: "klar",
    taskPendingLabel: "pågående",
    taskNamePlaceholder: "Uppgiftsnamn…",
    taskAddButton: "Lägg till",
    aiGenerateButton: "AI-generera",
    aiGenerateTitle: "Generera uppgifter med AI",
    analyticsTitle: "Analys",
    addChartOption: "Lägg till diagram...",
    chartOptions: {
      weekly: "Uppgifter utförda per vecka",
      weekdays: "Mest aktiva veckodagar",
      perPerson: "Sysslor per person",
      taskmaster: "Månadens mästare",
      lazyLegends: "Latmaskarna",
      speedDemons: "Snabbisarna",
      weekendWarriors: "Helghjältarna",
      slacker9000: "Slacker Detektor 9000"
    },
    noPeople: "Inga personer tillagda",
    noTasks: "Inga uppgifter tillagda",
    unassigned: "Ej tilldelad",
    remove: "Ta bort",
    edit: "Redigera",
    chartLabels: {
      unfinishedTasks: "Ej färdiga uppgifter",
      completedTasks: "Färdiga uppgifter",
      avgCompletionTime: "Genomsnittlig slutförandetid (dagar)",
      weekendTasksCompleted: "Helguppgifter slutförda",
      oldestOpenTaskAge: "Äldsta öppna uppgiftens ålder (dagar)"
    },
    weekLabel: "Vecka",
    monthLabel: "Månad",
    footer: "Byggt med Bootstrap & Chart.js • MMM-Chores av Pierre Gode"
  },
  fr: {
    title: "MMM-Chores Admin  ",
    subtitle: "Gérer les tâches, les personnes et les analyses",
    tabs: ["Tableau de bord", "Analytique"],
    peopleTitle: "Personnes",
    newPersonPlaceholder: "Nouvelle personne…",
    addPersonBtnTitle: "Ajouter",
    taskTitle: "Tâches",
    taskDoneLabel: "fait",
    taskPendingLabel: "en attente",
    taskNamePlaceholder: "Nom de la tâche…",
    taskAddButton: "Ajouter",
    aiGenerateButton: "Génération IA",
    aiGenerateTitle: "Générer des tâches avec l'IA",
    analyticsTitle: "Analytique",
    addChartOption: "Ajouter un graphique...",
    chartOptions: {
      weekly: "Tâches terminées par semaine",
      weekdays: "Jours de semaine les plus occupés",
      perPerson: "Corvées par personne",
      taskmaster: "Meilleur ouvrier du mois",
      lazyLegends: "Les paresseux",
      speedDemons: "Démons de la vitesse",
      weekendWarriors: "Guerriers du week-end",
      slacker9000: "Détecteur de paresse 9000"
    },
    noPeople: "Aucune personne ajoutée",
    noTasks: "Aucune tâche ajoutée",
    unassigned: "Non assigné",
    remove: "Supprimer",
    edit: "Modifier",
    chartLabels: {
      unfinishedTasks: "Tâches non terminées",
      completedTasks: "Tâches terminées",
      avgCompletionTime: "Temps moyen d'achèvement (jours)",
      weekendTasksCompleted: "Tâches du week-end terminées",
      oldestOpenTaskAge: "Âge de la plus vieille tâche ouverte (jours)"
    },
    weekLabel: "Semaine",
    monthLabel: "Mois",
    footer: "Construit avec Bootstrap & Chart.js • MMM-Chores par Pierre Gode"
  },
  es: {
    title: "MMM-Chores Admin  ",
    subtitle: "Gestionar tareas, personas y análisis",
    tabs: ["Panel", "Analítica"],
    peopleTitle: "Personas",
    newPersonPlaceholder: "Nueva persona…",
    addPersonBtnTitle: "Agregar",
    taskTitle: "Tareas",
    taskDoneLabel: "completadas",
    taskPendingLabel: "pendientes",
    taskNamePlaceholder: "Nombre de tarea…",
    taskAddButton: "Agregar",
    aiGenerateButton: "Generar con IA",
    aiGenerateTitle: "Generar tareas con IA",
    analyticsTitle: "Analítica",
    addChartOption: "Agregar gráfico...",
    chartOptions: {
      weekly: "Tareas completadas por semana",
      weekdays: "Días laborables más ocupados",
      perPerson: "Tareas por persona",
      taskmaster: "Maestro del mes",
      lazyLegends: "Leyendas perezosas",
      speedDemons: "Demonios de la velocidad",
      weekendWarriors: "Guerreros del fin de semana",
      slacker9000: "Detector de flojos 9000"
    },
    noPeople: "No hay personas agregadas",
    noTasks: "No hay tareas agregadas",
    unassigned: "Sin asignar",
    remove: "Eliminar",
    edit: "Editar",
    chartLabels: {
      unfinishedTasks: "Tareas sin terminar",
      completedTasks: "Tareas completadas",
      avgCompletionTime: "Tiempo promedio de finalización (días)",
      weekendTasksCompleted: "Tareas completadas el fin de semana",
      oldestOpenTaskAge: "Edad de la tarea abierta más antigua (días)"
    },
    weekLabel: "Semana",
    monthLabel: "Mes",
    footer: "Construido con Bootstrap y Chart.js • MMM-Chores por Pierre Gode"
  },
  de: {
    title: "MMM-Chores Admin  ",
    subtitle: "Aufgaben, Personen & Analysen verwalten",
    tabs: ["Übersicht", "Analytik"],
    peopleTitle: "Personen",
    newPersonPlaceholder: "Neue Person…",
    addPersonBtnTitle: "Hinzufügen",
    taskTitle: "Aufgaben",
    taskDoneLabel: "erledigt",
    taskPendingLabel: "offen",
    taskNamePlaceholder: "Aufgabenname…",
    taskAddButton: "Hinzufügen",
    aiGenerateButton: "Mit KI generieren",
    aiGenerateTitle: "Aufgaben mit KI generieren",
    analyticsTitle: "Analytik",
    addChartOption: "Diagramm hinzufügen...",
    chartOptions: {
      weekly: "Abgeschlossene Aufgaben pro Woche",
      weekdays: "Beschäftigste Wochentage",
      perPerson: "Hausarbeiten pro Person",
      taskmaster: "Aufgabenmeister des Monats",
      lazyLegends: "Faule Legenden",
      speedDemons: "Geschwindigkeitsdämonen",
      weekendWarriors: "Wochenendkrieger",
      slacker9000: "Faulenzer-Detektor 9000"
    },
    noPeople: "Keine Personen hinzugefügt",
    noTasks: "Keine Aufgaben hinzugefügt",
    unassigned: "Nicht zugeordnet",
    remove: "Entfernen",
    edit: "Bearbeiten",
    chartLabels: {
      unfinishedTasks: "Unfertige Aufgaben",
      completedTasks: "Abgeschlossene Aufgaben",
      avgCompletionTime: "Durchschnittliche Abschlusszeit (Tage)",
      weekendTasksCompleted: "Wochenendaufgaben abgeschlossen",
      oldestOpenTaskAge: "Alter der ältesten offenen Aufgabe (Tage)"
    },
    weekLabel: "Woche",
    monthLabel: "Monat",
    footer: "Erstellt mit Bootstrap & Chart.js • MMM-Chores von Pierre Gode"
  },
  it: {
    title: "MMM-Chores Admin  ",
    subtitle: "Gestisci compiti, persone e analisi",
    tabs: ["Dashboard", "Analisi"],
    peopleTitle: "Persone",
    newPersonPlaceholder: "Nuova persona…",
    addPersonBtnTitle: "Aggiungi",
    taskTitle: "Compiti",
    taskDoneLabel: "completati",
    taskPendingLabel: "in sospeso",
    taskNamePlaceholder: "Nome del compito…",
    taskAddButton: "Aggiungi",
    aiGenerateButton: "Genera con IA",
    aiGenerateTitle: "Genera compiti con IA",
    analyticsTitle: "Analisi",
    addChartOption: "Aggiungi grafico...",
    chartOptions: {
      weekly: "Compiti completati a settimana",
      weekdays: "Giorni feriali più impegnativi",
      perPerson: "Faccende per persona",
      taskmaster: "Miglior lavoratore del mese",
      lazyLegends: "Leggende pigre",
      speedDemons: "Demoni della velocità",
      weekendWarriors: "Guerrieri del weekend",
      slacker9000: "Rilevatore di fannulloni 9000"
    },
    noPeople: "Nessuna persona aggiunta",
    noTasks: "Nessun compito aggiunto",
    unassigned: "Non assegnato",
    remove: "Rimuovi",
    edit: "Modifica",
    chartLabels: {
      unfinishedTasks: "Compiti non completati",
      completedTasks: "Compiti completati",
      avgCompletionTime: "Tempo medio di completamento (giorni)",
      weekendTasksCompleted: "Compiti completati nel weekend",
      oldestOpenTaskAge: "Età del compito aperto più vecchio (giorni)"
    },
    weekLabel: "Settimana",
    monthLabel: "Mese",
    footer: "Realizzato con Bootstrap & Chart.js • MMM-Chores di Pierre Gode"
  },
  nl: {
    title: "MMM-Chores Admin  ",
    subtitle: "Beheer taken, mensen & analyses",
    tabs: ["Dashboard", "Analyse"],
    peopleTitle: "Mensen",
    newPersonPlaceholder: "Nieuwe persoon…",
    addPersonBtnTitle: "Toevoegen",
    taskTitle: "Taken",
    taskDoneLabel: "klaar",
    taskPendingLabel: "in behandeling",
    taskNamePlaceholder: "Taaknaam…",
    taskAddButton: "Toevoegen",
    aiGenerateButton: "AI genereren",
    aiGenerateTitle: "Genereer taken met AI",
    analyticsTitle: "Analyse",
    addChartOption: "Grafiek toevoegen...",
    chartOptions: {
      weekly: "Taken voltooid per week",
      weekdays: "Drukste weekdagen",
      perPerson: "Klussen per persoon",
      taskmaster: "Taakmeester van deze maand",
      lazyLegends: "Lui Legenden",
      speedDemons: "Snelheidsduivels",
      weekendWarriors: "Weekendstrijders",
      slacker9000: "Luilak Detector 9000"
    },
    noPeople: "Geen personen toegevoegd",
    noTasks: "Geen taken toegevoegd",
    unassigned: "Niet toegewezen",
    remove: "Verwijderen",
    edit: "Bewerken",
    chartLabels: {
      unfinishedTasks: "Onvoltooide taken",
      completedTasks: "Voltooide taken",
      avgCompletionTime: "Gemiddelde voltooiingstijd (dagen)",
      weekendTasksCompleted: "Weekendtaken voltooid",
      oldestOpenTaskAge: "Leeftijd van oudste open taak (dagen)"
    },
    weekLabel: "Week",
    monthLabel: "Maand",
    footer: "Gemaakt met Bootstrap & Chart.js • MMM-Chores door Pierre Gode"
  },
  pl: {
    title: "MMM-Chores Admin  ",
    subtitle: "Zarządzaj zadaniami, ludźmi i analizami",
    tabs: ["Panel", "Analityka"],
    peopleTitle: "Osoby",
    newPersonPlaceholder: "Nowa osoba…",
    addPersonBtnTitle: "Dodaj",
    taskTitle: "Zadania",
    taskDoneLabel: "ukończone",
    taskPendingLabel: "oczekujące",
    taskNamePlaceholder: "Nazwa zadania…",
    taskAddButton: "Dodaj",
    aiGenerateButton: "Generuj AI",
    aiGenerateTitle: "Generuj zadania za pomocą AI",
    analyticsTitle: "Analityka",
    addChartOption: "Dodaj wykres...",
    chartOptions: {
      weekly: "Zadania ukończone w tygodniu",
      weekdays: "Najbardziej pracowite dni tygodnia",
      perPerson: "Obowiązki na osobę",
      taskmaster: "Mistrz miesiąca",
      lazyLegends: "Lenie",
      speedDemons: "Szybcy wykonawcy",
      weekendWarriors: "Wojownicy weekendowi",
      slacker9000: "Detektor leni 9000"
    },
    noPeople: "Brak dodanych osób",
    noTasks: "Brak dodanych zadań",
    unassigned: "Nieprzypisane",
    remove: "Usuń",
    edit: "Edytuj",
    chartLabels: {
      unfinishedTasks: "Niewykonane zadania",
      completedTasks: "Wykonane zadania",
      avgCompletionTime: "Średni czas realizacji (dni)",
      weekendTasksCompleted: "Wykonane zadania weekendowe",
      oldestOpenTaskAge: "Wiek najstarszego otwartego zadania (dni)"
    },
    weekLabel: "Tydzień",
    monthLabel: "Miesiąc",
    footer: "Zbudowane z Bootstrap i Chart.js • MMM-Chores przez Pierre Gode"
  },
  zh: {
    title: "MMM-Chores 管理  ",
    subtitle: "管理任务、人员和分析",
    tabs: ["仪表板", "分析"],
    peopleTitle: "人员",
    newPersonPlaceholder: "新人员…",
    addPersonBtnTitle: "添加",
    taskTitle: "任务",
    taskDoneLabel: "已完成",
    taskPendingLabel: "待处理",
    taskNamePlaceholder: "任务名称…",
    taskAddButton: "添加",
    aiGenerateButton: "AI生成",
    aiGenerateTitle: "使用AI生成任务",
    analyticsTitle: "分析",
    addChartOption: "添加图表...",
    chartOptions: {
      weekly: "每周完成的任务",
      weekdays: "最忙的工作日",
      perPerson: "每人家务",
      taskmaster: "本月任务高手",
      lazyLegends: "懒人传说",
      speedDemons: "速度达人",
      weekendWarriors: "周末勇士",
      slacker9000: "懒散探测器 9000"
    },
    noPeople: "未添加人员",
    noTasks: "未添加任务",
    unassigned: "未分配",
    remove: "删除",
    edit: "编辑",
    chartLabels: {
      unfinishedTasks: "未完成的任务",
      completedTasks: "已完成的任务",
      avgCompletionTime: "平均完成时间 (天)",
      weekendTasksCompleted: "周末完成的任务",
      oldestOpenTaskAge: "最旧未完成任务时间 (天)"
    },
    weekLabel: "周",
    monthLabel: "月",
    footer: "由 Bootstrap 和 Chart.js 构建 • MMM-Chores 由 Pierre Gode 创建"
  },
  ar: {
    title: "إدارة MMM-Chores  ",
    subtitle: "إدارة المهام، الأشخاص والتحليلات",
    tabs: ["لوحة التحكم", "تحليلات"],
    peopleTitle: "الأشخاص",
    newPersonPlaceholder: "شخص جديد…",
    addPersonBtnTitle: "إضافة",
    taskTitle: "المهام",
    taskDoneLabel: "منجز",
    taskPendingLabel: "قيد الانتظار",
    taskNamePlaceholder: "اسم المهمة…",
    taskAddButton: "إضافة",
    aiGenerateButton: "إنشاء بالذكاء الاصطناعي",
    aiGenerateTitle: "إنشاء مهام بالذكاء الاصطناعي",
    analyticsTitle: "تحليلات",
    addChartOption: "إضافة مخطط...",
    chartOptions: {
      weekly: "المهام المكتملة في الأسبوع",
      weekdays: "أكثر أيام الأسبوع نشاطًا",
      perPerson: "الأعمال المنزلية لكل شخص",
      taskmaster: "سيد المهام هذا الشهر",
      lazyLegends: "الكسالى الأسطوريون",
      speedDemons: "شياطين السرعة",
      weekendWarriors: "محاربو عطلة نهاية الأسبوع",
      slacker9000: "كاشف الكسالى 9000"
    },
    noPeople: "لم يتم إضافة أي أشخاص",
    noTasks: "لم يتم إضافة أي مهام",
    unassigned: "غير معين",
    remove: "إزالة",
    edit: "تحرير",
    chartLabels: {
      unfinishedTasks: "المهام غير المكتملة",
      completedTasks: "المهام المكتملة",
      avgCompletionTime: "متوسط وقت الإكمال (أيام)",
      weekendTasksCompleted: "المهام المكتملة في عطلة نهاية الأسبوع",
      oldestOpenTaskAge: "عمر أقدم مهمة مفتوحة (أيام)"
    },
    weekLabel: "أسبوع",
    monthLabel: "شهر",
    footer: "تم الإنشاء باستخدام Bootstrap و Chart.js • MMM-Chores بواسطة Pierre Gode"
  }
};

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
  renderTasks();
  renderCalendar();
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
    li.textContent = person.name;

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
    span.innerHTML += ` <span class="badge bg-info text-dark">${task.recurring}</span>`;
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
    del.className = "btn btn-sm btn-outline-danger";
    del.title = LANGUAGES[currentLang].remove;
    del.innerHTML = '<i class="bi bi-trash"></i>';
    del.addEventListener("click", () => deleteTask(task.id));

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
      li.append(left, select, edit, del);
    } else {
      li.append(left, select, del);
    }

    list.appendChild(li);
  }
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

  setLanguage(currentLang);
  await fetchPeople();
  await fetchTasks();

  const savedBoards = await fetchSavedBoards();
  if (savedBoards.length) {
    savedBoards.forEach(type => addChart(type));
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
