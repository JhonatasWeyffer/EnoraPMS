const STORAGE_KEY = "reports_events_v1";

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export const ReportsAPI = {
  async fetchEvents() {
    return loadLocal();
  },

  async pushEvent(eventObj) {
    const all = loadLocal();
    all.unshift(eventObj);
    saveLocal(all);
    return { ok: true };
  },

  async clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    return { ok: true };
  }
};