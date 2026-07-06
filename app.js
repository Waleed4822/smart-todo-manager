/**
 * app.js
 * Business logic (TaskManager) + UI logic (UIController).
 * Encapsulated with IIFEs / modules to avoid global pollution.
 */

/* ===================== BUSINESS LOGIC ===================== */
const TaskManager = (() => {
  let tasks = Storage.getTasks();

  function generateId() {
    return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getAll() {
    return [...tasks];
  }

  function getById(id) {
    return tasks.find((t) => t.id === id);
  }

  function add({ title, dueDate, dueTime, priority }) {
    const task = {
      id: generateId(),
      title: title.trim(),
      dueDate: dueDate || "",
      dueTime: dueTime || "",
      priority: priority || "medium",
      completed: false,
      createdAt: Date.now(),
    };
    tasks.push(task);
    persist();
    return task;
  }

  function update(id, changes) {
    const task = getById(id);
    if (!task) return null;
    Object.assign(task, changes);
    persist();
    return task;
  }

  function remove(id) {
    tasks = tasks.filter((t) => t.id !== id);
    persist();
  }

  function toggleComplete(id) {
    const task = getById(id);
    if (!task) return;
    task.completed = !task.completed;
    persist();
  }

  function getDueDateTime(task) {
    if (!task.dueDate) return null;
    const time = task.dueTime || "23:59";
    return new Date(`${task.dueDate}T${time}`);
  }

  function isOverdue(task) {
    if (task.completed) return false;
    const due = getDueDateTime(task);
    return due ? due.getTime() < Date.now() : false;
  }

  function getStats() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    const pending = total - completed;
    return { total, completed, pending, overdue };
  }

  function filterTasks({ searchText = "", filter = "all" }) {
    return tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchText.toLowerCase());

      let matchesFilter = true;
      if (filter === "completed") matchesFilter = task.completed;
      else if (filter === "pending") matchesFilter = !task.completed;
      else if (filter === "overdue") matchesFilter = isOverdue(task);

      return matchesSearch && matchesFilter;
    });
  }

  function persist() {
    Storage.saveTasks(tasks);
  }

  return {
    getAll,
    getById,
    add,
    update,
    remove,
    toggleComplete,
    getDueDateTime,
    isOverdue,
    getStats,
    filterTasks,
  };
})();

/* ===================== UI CONTROLLER ===================== */
const UIController = (() => {
  // DOM references
  const dom = {
    form: document.getElementById("taskForm"),
    taskId: document.getElementById("taskId"),
    title: document.getElementById("taskTitle"),
    date: document.getElementById("taskDate"),
    time: document.getElementById("taskTime"),
    priority: document.getElementById("taskPriority"),
    submitBtn: document.getElementById("submitBtn"),
    list: document.getElementById("taskList"),
    emptyState: document.getElementById("emptyState"),
    search: document.getElementById("searchInput"),
    filterButtons: document.getElementById("filterButtons"),
    themeToggle: document.getElementById("themeToggle"),
    stats: {
      total: document.getElementById("statTotal"),
      completed: document.getElementById("statCompleted"),
      pending: document.getElementById("statPending"),
      overdue: document.getElementById("statOverdue"),
    },
  };

  let state = { searchText: "", filter: "all" };
  let countdownTimer = null;

  function init() {
    applyStoredTheme();
    bindEvents();
    render();
    startCountdownLoop();
  }

  function bindEvents() {
    dom.form.addEventListener("submit", handleFormSubmit);
    dom.search.addEventListener("input", (e) => {
      state.searchText = e.target.value;
      render();
    });
    dom.filterButtons.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      state.filter = btn.dataset.filter;
      [...dom.filterButtons.children].forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      render();
    });
    dom.themeToggle.addEventListener("click", toggleTheme);

    dom.list.addEventListener("click", (e) => {
      const item = e.target.closest(".task-item");
      if (!item) return;
      const id = item.dataset.id;

      if (e.target.classList.contains("task-checkbox")) {
        TaskManager.toggleComplete(id);
        render();
      } else if (e.target.closest(".edit-btn")) {
        loadTaskIntoForm(id);
      } else if (e.target.closest(".delete-btn")) {
        TaskManager.remove(id);
        render();
      }
    });
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const title = dom.title.value.trim();
    if (!title) return;

    const payload = {
      title,
      dueDate: dom.date.value,
      dueTime: dom.time.value,
      priority: dom.priority.value,
    };

    const editingId = dom.taskId.value;
    if (editingId) {
      TaskManager.update(editingId, payload);
    } else {
      TaskManager.add(payload);
    }

    resetForm();
    render();
  }

  function loadTaskIntoForm(id) {
    const task = TaskManager.getById(id);
    if (!task) return;
    dom.taskId.value = task.id;
    dom.title.value = task.title;
    dom.date.value = task.dueDate;
    dom.time.value = task.dueTime;
    dom.priority.value = task.priority;
    dom.submitBtn.textContent = "Update Task";
    dom.title.focus();
  }

  function resetForm() {
    dom.form.reset();
    dom.taskId.value = "";
    dom.submitBtn.textContent = "Add Task";
    dom.priority.value = "medium";
  }

  function formatCountdown(task) {
    const due = TaskManager.getDueDateTime(task);
    if (!due) return { text: "No due date", overdue: false };

    const diff = due.getTime() - Date.now();
    if (diff <= 0) return { text: "Overdue", overdue: true };

    const mins = Math.floor(diff / 60000);
    const days = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const remMins = mins % 60;

    let text = "";
    if (days > 0) text = `${days}d ${hours}h left`;
    else if (hours > 0) text = `${hours}h ${remMins}m left`;
    else text = `${remMins}m left`;

    return { text, overdue: false };
  }

  function render() {
    const filtered = TaskManager.filterTasks(state);
    renderStats();
    renderList(filtered);
  }

  function renderStats() {
    const { total, completed, pending, overdue } = TaskManager.getStats();
    dom.stats.total.textContent = total;
    dom.stats.completed.textContent = completed;
    dom.stats.pending.textContent = pending;
    dom.stats.overdue.textContent = overdue;
  }

  function renderList(tasks) {
    dom.list.innerHTML = "";
    dom.emptyState.hidden = tasks.length !== 0;

    tasks
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((task) => dom.list.appendChild(buildTaskElement(task)));
  }

  function buildTaskElement(task) {
    const li = document.createElement("li");
    const overdue = TaskManager.isOverdue(task);
    const countdown = formatCountdown(task);

    li.className = `task-item priority-${task.priority} ${
      task.completed ? "completed" : ""
    } ${overdue ? "overdue-flag" : ""}`;
    li.dataset.id = task.id;

    const dueLabel = task.dueDate
      ? `${task.dueDate}${task.dueTime ? " " + task.dueTime : ""}`
      : "No due date";

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${
        task.completed ? "checked" : ""
      } aria-label="Toggle complete">
      <div class="task-content">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="badge ${task.priority}">${task.priority}</span>
          <span>📅 ${dueLabel}</span>
          <span class="countdown ${
            countdown.overdue ? "overdue-text" : ""
          }">⏱ ${countdown.text}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit-btn" title="Edit">✏️</button>
        <button class="icon-btn delete-btn" title="Delete">🗑️</button>
      </div>
    `;
    return li;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function startCountdownLoop() {
    // Refresh countdown + overdue status every 30 seconds
    countdownTimer = setInterval(render, 30000);
  }

  function applyStoredTheme() {
    const theme = Storage.getTheme();
    document.documentElement.setAttribute("data-theme", theme);
    dom.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    Storage.saveTheme(next);
    dom.themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", UIController.init);
