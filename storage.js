/**
 * storage.js
 * Handles ALL persistence concerns (localStorage).
 * No UI or business logic lives here — pure data I/O.
 */
const Storage = (() => {
  const TASKS_KEY = "smart_todo_tasks_v1";
  const THEME_KEY = "smart_todo_theme_v1";

  function getTasks() {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Failed to parse tasks from storage:", err);
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  return { getTasks, saveTasks, getTheme, saveTheme };
})();
