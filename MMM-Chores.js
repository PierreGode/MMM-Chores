const BOARD_TITLES = {
  weekly: "Tasks Completed Per Week",
  weekdays: "Busiest Weekdays",
  perPerson: "Chores Per Person",
  perPersonFinished: "Chores Per Person (Finished)",
  perPersonFinishedWeek: "Chores Per Person (Finished This Week)",
  perPersonUnfinished: "Chores Per Person (Unfinished)",
  perPersonUnfinishedWeek: "Chores Per Person (Unfinished This Week)",
  taskmaster: "Taskmaster This Month",
  lazyLegends: "Lazy Legends",
  speedDemons: "Speed Demons",
  weekendWarriors: "Weekend Warriors",
  slacker9000: "Slacker Detector 9000"
};

Module.register("MMM-Chores", {
  defaults: {
    updateInterval: 60 * 1000,
    adminPort: 5003,
    showDays: 1,
    showPast: false,
    dateFormatting: "yyyy-mm-dd", // Standardformat, kan ändras i config
    textMirrorSize: "small",     // small, medium or large
    useAI: true,                  // hide AI features when false
    showAnalyticsOnMirror: false, // display analytics cards on the mirror
    analyticsCards: [],           // board types selected in the admin UI
    leveling: {
      enabled: true,
      yearsToMaxLevel: 3,
      choresPerWeekEstimate: 4,
      maxLevel: 100
    },
    levelTitles: [
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
    ],
    customLevelTitles: {}
  },

  start() {
    this.tasks = [];
    this.people = [];
    this.levelInfo = null;
    this.chartInstances = {};
    this.sendSocketNotification("INIT_SERVER", this.config);
    this.scheduleUpdate();
  },

  getStyles() {
    return ["MMM-Chores.css"];
  },

  getScripts() {
    if (this.config.showAnalyticsOnMirror) {
      return [
        "https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js"
      ];
    }
    return [];
  },

  scheduleUpdate() {
    setInterval(() => this.updateDom(), this.config.updateInterval);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "TASKS_UPDATE") {
      this.tasks = payload;
      this.updateDom();
    }
    if (notification === "CHORES_DATA") {
      this.tasks = payload;
      this.updateDom();
    }
    if (notification === "PEOPLE_UPDATE") {
      this.people = payload;
      this.updateDom();
    }
    if (notification === "SETTINGS_UPDATE") {
      Object.assign(this.config, payload);
      this.updateDom();
    }
    if (notification === "ANALYTICS_UPDATE") {
      if (Array.isArray(payload)) {
        this.config.analyticsCards = payload;
        this.updateDom();
      }
    }
    if (notification === "LEVEL_INFO") {
      const prevTitle = this.levelInfo ? this.levelInfo.title : null;
      this.levelInfo = payload;
      if (prevTitle && prevTitle !== payload.title) {
        this.titleChangeMessage = `Congrats! You advanced from ${prevTitle} to ${payload.title}!`;
        setTimeout(() => { this.titleChangeMessage = null; this.updateDom(); }, 5000);
      }
      this.updateDom();
    }
  },

  shouldShowTask(task) {
    const showDays = parseInt(this.config.showDays, 10);
    const showPast = Boolean(this.config.showPast);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tDate = new Date(task.date);
    tDate.setHours(0, 0, 0, 0);

    const diffMs = tDate - today;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      if (task.done) {
        if (task.finished) {
          const fin = new Date(task.finished);
          fin.setHours(0, 0, 0, 0);
          if (fin.getTime() === today.getTime()) return true;
        }
        return false;
      }
      return showPast;
    }
    return diffDays < showDays;
  },

  getPersonName(id) {
    const p = this.people.find(p => p.id === id);
    return p ? p.name : "";
  },

  getPerson(id) {
    return this.people.find(p => p.id === id) || null;
  },

  toggleDone(task, done) {
    this.sendSocketNotification("USER_TOGGLE_CHORE", { id: task.id, done });
  },

  formatDate(dateStr) {
    if (!dateStr) return "";
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateStr;
    const [ , yyyy, mm, dd ] = match;

    // Use module config for formatting. If set to empty string, hide the date
    // entirely. Only fall back to the default when no value is specified.
    let result =
      this.config.dateFormatting !== undefined &&
      this.config.dateFormatting !== null
        ? this.config.dateFormatting
        : "yyyy-mm-dd";

    if (result === "") return "";

    // Ersätt både små och stora bokstäver för yyyy, mm, dd
    result = result.replace(/yyyy/gi, yyyy);
    result = result.replace(/mm/gi, mm);
    result = result.replace(/dd/gi, dd);

    // Extra stöd för stora bokstäver som kan missas pga regex
    // (Om användaren skriver t.ex "DD" istället för "dd")
    result = result.replace(/YYYY/g, yyyy);
    result = result.replace(/MM/g, mm);
    result = result.replace(/DD/g, dd);

    return result;
  },

  buildChartData(type) {
    const filteredTasks = fn => this.tasks.filter(t => !(t.deleted && !t.done) && fn(t));
    let data = { labels: [], datasets: [] };
    let options = { scales: { y: { beginAtZero: true } } };
    let chartType = "bar";

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
        data = { labels, datasets: [{ label: "Completed Tasks", data: counts, backgroundColor: "rgba(75,192,192,0.5)" }] };
        break;
      }
      case "weekdays": {
        chartType = "pie";
        const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
        const arr = [0,0,0,0,0,0,0];
        filteredTasks(t => true).forEach(t => {
          const idx = (new Date(t.date).getDay() + 6) % 7;
          arr[idx]++;
        });
        data = {
          labels,
          datasets: [{ data: arr, backgroundColor: ["#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF","#FF9F40","#C9CBCF"] }]
        };
        options = {};
        break;
      }
      case "perPerson": {
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p => filteredTasks(t => t.assignedTo === p.id).length);
        data = { labels, datasets: [{ label: "Finished Tasks", data: counts, backgroundColor: "rgba(153,102,255,0.5)" }] };
        break;
      }
      case "perPersonFinished": {
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p => filteredTasks(t => t.assignedTo === p.id && t.done).length);
        data = { labels, datasets: [{ label: BOARD_TITLES.perPersonFinished, data: counts, backgroundColor: "rgba(75,192,192,0.5)" }] };
        break;
      }
      case "perPersonFinishedWeek": {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p =>
          filteredTasks(t => {
            if (!t.done || t.assignedTo !== p.id) return false;
            const d = new Date(t.date);
            return d >= start && d < end;
          }).length
        );
        data = { labels, datasets: [{ label: BOARD_TITLES.perPersonFinishedWeek, data: counts, backgroundColor: "rgba(75,192,192,0.5)" }] };
        break;
      }
      case "perPersonUnfinished": {
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p => filteredTasks(t => t.assignedTo === p.id && !t.done).length);
        data = { labels, datasets: [{ label: BOARD_TITLES.perPersonUnfinished, data: counts, backgroundColor: "rgba(255,99,132,0.5)" }] };
        break;
      }
      case "perPersonUnfinishedWeek": {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p =>
          filteredTasks(t => {
            if (t.done || t.assignedTo !== p.id) return false;
            const d = new Date(t.date);
            return d >= start && d < end;
          }).length
        );
        data = { labels, datasets: [{ label: BOARD_TITLES.perPersonUnfinishedWeek, data: counts, backgroundColor: "rgba(255,99,132,0.5)" }] };
        break;
      }
      case "taskmaster": {
        const now = new Date();
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p => this.tasks.filter(t => {
          const d = new Date(t.date);
          return t.done && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.assignedTo === p.id;
        }).length);
        data = { labels, datasets: [{ label: BOARD_TITLES.taskmaster, data: counts, backgroundColor: "rgba(255,159,64,0.5)" }] };
        break;
      }
      case "lazyLegends": {
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p => filteredTasks(t => t.assignedTo === p.id && !t.done).length);
        data = { labels, datasets: [{ label: BOARD_TITLES.lazyLegends, data: counts, backgroundColor: "rgba(255,99,132,0.5)" }] };
        break;
      }
      case "speedDemons": {
        const labels = this.people.map(p => p.name);
        const avgDays = this.people.map(p => {
          const times = filteredTasks(t => t.assignedTo === p.id && t.done && t.finished && t.assignedDate).map(t => {
            const dDone = new Date(t.finished);
            const dAssigned = new Date(t.assignedDate);
            return (dDone - dAssigned) / (1000*60*60*24);
          });
          if (times.length === 0) return 0;
          return times.reduce((a,b) => a+b, 0) / times.length;
        });
        data = { labels, datasets: [{ label: BOARD_TITLES.speedDemons, data: avgDays, backgroundColor: "rgba(54,162,235,0.5)" }] };
        break;
      }
      case "weekendWarriors": {
        const labels = this.people.map(p => p.name);
        const counts = this.people.map(p => filteredTasks(t => {
          if (!t.done || t.assignedTo !== p.id) return false;
          const d = new Date(t.date);
          return d.getDay() === 0 || d.getDay() === 6;
        }).length);
        data = { labels, datasets: [{ label: BOARD_TITLES.weekendWarriors, data: counts, backgroundColor: "rgba(255,206,86,0.5)" }] };
        break;
      }
      case "slacker9000": {
        const labels = this.people.map(p => p.name);
        const ages = this.people.map(p => {
          const open = filteredTasks(t => t.assignedTo === p.id && !t.done && t.assignedDate);
          if (open.length === 0) return 0;
          const now = new Date();
          return Math.max(...open.map(t => (now - new Date(t.assignedDate)) / (1000*60*60*24)));
        });
        data = { labels, datasets: [{ label: BOARD_TITLES.slacker9000, data: ages, backgroundColor: "rgba(153,102,255,0.5)" }] };
        break;
      }
      default:
        data = { labels: [], datasets: [] };
        break;
    }

    return { chartType, data, options };
  },

  renderCharts() {
    if (!this.config.showAnalyticsOnMirror || typeof Chart === "undefined") return;

    const types = this.config.analyticsCards;
    const currentIds = [];

    types.forEach((type, idx) => {
      const id = `chart-${idx}`;
      currentIds.push(id);
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const { chartType, data, options } = this.buildChartData(type);
      const existing = this.chartInstances[id];
      if (existing) {
        existing.destroy();
      }
      this.chartInstances[id] = new Chart(ctx, { type: chartType, data, options });
    });

    // destroy charts that are no longer configured
    Object.keys(this.chartInstances).forEach(id => {
      if (!currentIds.includes(id)) {
        this.chartInstances[id].destroy();
        delete this.chartInstances[id];
      }
    });
  },

  getDom() {
    const wrapper = document.createElement("div");

    // Remove the large header showing the global level. Levels are displayed
    // next to each person's name instead.

    if (this.titleChangeMessage) {
      const note = document.createElement("div");
      note.className = "small bright";
      note.innerHTML = this.titleChangeMessage;
      wrapper.appendChild(note);
    }

    // Filtrerar bort raderade tasks
    const visible = this.tasks.filter(t => !(t.deleted && !t.done) && this.shouldShowTask(t));

    if (visible.length === 0) {
      const emptyEl = document.createElement("div");
      emptyEl.className = `${this.config.textMirrorSize} dimmed`;
      emptyEl.innerHTML = "No tasks to show 🎉";
      wrapper.appendChild(emptyEl);
      return wrapper;
    }

    const ul = document.createElement("ul");
    ul.className = "normal";

    visible.forEach(task => {
      const li = document.createElement("li");
      li.className = this.config.textMirrorSize;

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = task.done;
      cb.style.marginRight = "8px";
      cb.addEventListener("change", () => this.toggleDone(task, cb.checked));
      li.appendChild(cb);

      const dateText = this.formatDate(task.date);
      const text = document.createTextNode(`${task.name} ${dateText}`);
      li.appendChild(text);

      if (task.assignedTo) {
        const p = this.getPerson(task.assignedTo);
        const assignedEl = document.createElement("span");
        assignedEl.className = "xsmall dimmed";
        assignedEl.style.marginLeft = "6px";
        let html = ` — ${p ? p.name : ""}`;
        const lvlEnabled = !(
          this.config.leveling && this.config.leveling.enabled === false
        );
        if (lvlEnabled && p && p.level) {
          html += ` <span class="lvl-badge">lvl${p.level}</span>`;
        }
        assignedEl.innerHTML = html;
        li.appendChild(assignedEl);
      }

      ul.appendChild(li);
    });

    wrapper.appendChild(ul);

    if (this.config.showAnalyticsOnMirror && this.config.analyticsCards.length) {
      const charts = document.createElement("div");
      charts.className = "analytics-wrapper";
      this.config.analyticsCards.forEach((type, idx) => {
        const card = document.createElement("div");
        card.className = "analytics-card";
        const title = document.createElement("div");
        title.className = "small bright";
        title.innerHTML = BOARD_TITLES[type] || type;
        const canvas = document.createElement("canvas");
        const id = `chart-${idx}`;
        canvas.id = id;
        canvas.className = "analytics-chart";
        card.appendChild(title);
        card.appendChild(canvas);
        charts.appendChild(card);
      });
      wrapper.appendChild(charts);
      setTimeout(() => this.renderCharts(), 0);
    }

    return wrapper;
  }
});
