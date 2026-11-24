import type { LocalData } from '@/types/desktop';

const KEY = 'lifeos.personal.v1';
const IDB_NAME = 'lifeos_workspace_db';
const IDB_STORE = 'workspace';
const IDB_KEY = 'personal_data';

export const initialData: LocalData = {
  tasks: [],
  notes: [],
  habits: [],
  subjects: [],
  assignments: [],
  studySessions: [],
  transactions: [],
  budgets: [],
  events: [],
  goals: [],
  notifications: [],
  preferences: {
    name: 'there',
    theme: 'dark',
    wallpaper: 'alpine',
    accent: 'violet',
    sound: true,
    notifications: true,
    focusMode: false,
    widgets: true,
    taskbarLabels: false,
  },
  focusSeconds: 25 * 60,
  focusRunning: false,
  focusSessions: 0,
};

function openWorkspaceDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeToIndexedDb(data: LocalData): Promise<void> {
  const db = await openWorkspaceDb();
  if (!db) return;
  try {
    await new Promise<void>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(data, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IndexedDB write errors in restricted environments
  } finally {
    db.close();
  }
}

async function readFromIndexedDb(): Promise<LocalData | null> {
  const db = await openWorkspaceDb();
  if (!db) return null;
  try {
    return await new Promise<LocalData | null>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as LocalData | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function clearIndexedDb(): Promise<void> {
  const db = await openWorkspaceDb();
  if (!db) return;
  try {
    await new Promise<void>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IndexedDB clear errors
  } finally {
    db.close();
  }
}

export function normalizeLocalData(raw: unknown): LocalData | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<LocalData>;
  if (!Array.isArray(value.tasks) || !Array.isArray(value.notes) || !Array.isArray(value.habits) || !value.preferences) {
    return null;
  }
  const tasks = value.tasks.filter(t => typeof t?.id === 'string' && typeof t.title === 'string' && typeof t.done === 'boolean');
  const notes = value.notes.filter(n => typeof n?.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string');
  const habits = value.habits.filter(h => typeof h?.id === 'string' && typeof h.name === 'string' && typeof h.done === 'boolean');
  return {
    ...initialData,
    ...value,
    tasks,
    notes,
    habits,
    subjects: Array.isArray(value.subjects) ? value.subjects : [],
    assignments: Array.isArray(value.assignments) ? value.assignments : [],
    studySessions: Array.isArray(value.studySessions) ? value.studySessions : [],
    transactions: Array.isArray(value.transactions) ? value.transactions : [],
    budgets: Array.isArray(value.budgets) ? value.budgets : [],
    events: Array.isArray(value.events) ? value.events : [],
    goals: Array.isArray(value.goals) ? value.goals : [],
    notifications: Array.isArray(value.notifications) ? value.notifications : [],
    preferences: { ...initialData.preferences, ...value.preferences },
    focusRunning: false,
  };
}

export const repository = {
  read(): LocalData | null {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      return normalizeLocalData(raw);
    } catch {
      return null;
    }
  },
  async readAsync(): Promise<LocalData | null> {
    const syncData = this.read();
    if (syncData) return syncData;
    const idbData = await readFromIndexedDb();
    return normalizeLocalData(idbData);
  },
  write(data: LocalData) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* Storage may be unavailable or full in private browsing. */
    }
    void writeToIndexedDb(data);
  },
  reset(): LocalData {
    this.write(initialData);
    return initialData;
  },
  clearAll() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem('lifeos.windows.v1');
    } catch {
      // Ignore storage errors
    }
    void clearIndexedDb();
  },
};
