Module.register("MMM-Chores", {
  defaults: {
    updateInterval: 60 * 1000,
    adminPort: 5003,
    showDays: 1,
    showPast: false,
    dateFormatting: "yyyy-mm-dd", // Standardformat, kan ändras i config
    textMirrorSize: "small",     // small, medium or large
    useAI: true,                  // hide AI features when false
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
    this.sendSocketNotification("INIT_SERVER", this.config);
    this.scheduleUpdate();
  },

  getStyles() {
    return ["MMM-Chores.css"];
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
    const visible = this.tasks.filter(t => !t.deleted && this.shouldShowTask(t));

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
    return wrapper;
  }
});
