import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialData, repository } from '@/services/local-repository';
import type { LocalData, NotificationItem, Preferences } from '@/types/desktop';

interface PersonalDataContextValue {
  data: LocalData;
  setData: React.Dispatch<React.SetStateAction<LocalData>>;
  updatePreferences: (p: Partial<Preferences>) => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'read' | 'timestamp'>) => void;
  resetData: () => void;
  now: Date;
}

const Context = createContext<PersonalDataContextValue | null>(null);

export function PersonalDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LocalData>(initialData);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(new Date('2026-11-24T16:48:00Z'));

  useEffect(() => {
    let active = true;
    const stored = repository.read();
    if (stored) {
      setData(stored);
      setReady(true);
    } else {
      void repository.readAsync().then(idbStored => {
        if (!active) return;
        if (idbStored) setData(idbStored);
        setReady(true);
      });
    }
    setNow(new Date());
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      active = false;
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (ready) repository.write(data);
  }, [data, ready]);

  useEffect(() => {
    if (!data.focusRunning) return;
    const tick = window.setInterval(
      () =>
        setData(d =>
          d.focusSeconds <= 1
            ? { ...d, focusSeconds: 0, focusRunning: false, focusSessions: d.focusSessions + 1 }
            : { ...d, focusSeconds: d.focusSeconds - 1 },
        ),
      1000,
    );
    return () => window.clearInterval(tick);
  }, [data.focusRunning]);

  const updatePreferences = (p: Partial<Preferences>) =>
    setData(d => ({ ...d, preferences: { ...d.preferences, ...p } }));

  const addNotification = (item: Omit<NotificationItem, 'id' | 'read' | 'timestamp'>) =>
    setData(d => ({
      ...d,
      notifications: [
        { ...item, id: crypto.randomUUID(), read: false, timestamp: 'Just now' },
        ...d.notifications,
      ].slice(0, 20),
    }));

  const resetData = () => {
    const fresh = repository.reset();
    setData(fresh);
  };

  return (
    <Context.Provider value={{ data, setData, now, updatePreferences, addNotification, resetData }}>
      {children}
    </Context.Provider>
  );
}

export function usePersonalData() {
  const value = useContext(Context);
  if (!value) throw new Error('PersonalDataProvider is required');
  return value;
}
