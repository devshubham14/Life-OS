import { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowRight,
  Settings,
  Power,
  CheckCheck,
  FileText,
  CalendarDays,
  Flag,
  GraduationCap,
  Wallet,
  Sprout,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AppIcon } from './app-icon';
import { apps } from '@/lib/apps';
import { formatCurrency, formatShortDate } from '@/lib/date';
import { useWindows } from '@/stores/window-manager';
import { usePersonalData } from '@/stores/personal-data';
import type { AppId } from '@/types/desktop';

export function Launcher({
  searchOnly,
  onClose,
  onLock,
}: {
  searchOnly: boolean;
  onClose: () => void;
  onLock: () => void;
}) {
  const { open, state } = useWindows();
  const { data } = usePersonalData();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [all, setAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const term = query.toLowerCase();
  const results: { id: string; app: AppId; title: string; subtitle: string; group: string; icon: typeof Search }[] = [
    ...apps
      .filter(a => `${a.name} ${a.description}`.toLowerCase().includes(term))
      .map(a => ({ id: a.id, app: a.id, title: a.name, subtitle: a.description, group: 'Applications', icon: a.icon })),
    ...(query
      ? data.tasks
          .filter(t => t.title.toLowerCase().includes(term))
          .map(t => ({
            id: t.id,
            app: 'tasks' as const,
            title: t.title,
            subtitle: `${t.category} · ${t.done ? 'Completed' : t.dueDate ? formatShortDate(t.dueDate) : t.time}`,
            group: 'Tasks',
            icon: CheckCheck,
          }))
      : []),
    ...(query
      ? data.subjects
          .filter(s => `${s.name} ${s.code}`.toLowerCase().includes(term))
          .map(s => ({
            id: s.id,
            app: 'study' as const,
            title: `${s.code} · ${s.name}`,
            subtitle: `${s.completedHours}h / ${s.targetHours}h studied`,
            group: 'Study Planner',
            icon: GraduationCap,
          }))
      : []),
    ...(query
      ? data.assignments
          .filter(a => a.title.toLowerCase().includes(term))
          .map(a => ({
            id: a.id,
            app: 'study' as const,
            title: a.title,
            subtitle: `${a.type} · Due ${formatShortDate(a.dueDate)}`,
            group: 'Study Planner',
            icon: GraduationCap,
          }))
      : []),
    ...(query
      ? data.habits
          .filter(h => h.name.toLowerCase().includes(term))
          .map(h => ({
            id: h.id,
            app: 'habits' as const,
            title: h.name,
            subtitle: `${h.streak} day streak`,
            group: 'Habits',
            icon: Sprout,
          }))
      : []),
    ...(query
      ? data.events
          .filter(e => `${e.title} ${e.location}`.toLowerCase().includes(term))
          .map(e => ({
            id: e.id,
            app: 'calendar' as const,
            title: e.title,
            subtitle: `${formatShortDate(e.date)} · ${e.startTime} · ${e.location}`,
            group: 'Calendar',
            icon: CalendarDays,
          }))
      : []),
    ...(query
      ? data.transactions
          .filter(t => `${t.title} ${t.category}`.toLowerCase().includes(term))
          .map(t => ({
            id: t.id,
            app: 'finance' as const,
            title: t.title,
            subtitle: `${t.category} · ${formatCurrency(t.amount)}`,
            group: 'Expenses',
            icon: Wallet,
          }))
      : []),
    ...(query
      ? data.notes
          .filter(n => `${n.title} ${n.body}`.toLowerCase().includes(term))
          .map(n => ({
            id: n.id,
            app: 'notes' as const,
            title: n.title,
            subtitle: n.body.slice(0, 60),
            group: 'Notes',
            icon: FileText,
          }))
      : []),
    ...(query
      ? data.goals
          .filter(g => g.title.toLowerCase().includes(term))
          .map(g => ({
            id: g.id,
            app: 'goals' as const,
            title: g.title,
            subtitle: `${g.category} · ${g.progress}% complete`,
            group: 'Goals',
            icon: Flag,
          }))
      : []),
  ];

  const launch = (id: AppId) => {
    open(id);
    onClose();
  };

  return (
    <motion.div
      className="launcher glass-panel"
      role="dialog"
      aria-label={searchOnly ? 'Global search' : 'Start menu'}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
    >
      <div className="search-input">
        <Search />
        <input
          ref={input}
          aria-label="Search LIFEOS"
          placeholder="Search apps, tasks, study, events, expenses, notes…"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelected(s => Math.min(s + 1, results.length - 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelected(s => Math.max(0, s - 1));
            }
            if (e.key === 'Enter') {
              const item = results[selected];
              if (item) launch(item.app);
            }
            if (e.key === 'Escape') onClose();
          }}
        />
        <kbd>Ctrl K</kbd>
      </div>

      {query || searchOnly ? (
        <div className="search-results">
          {results.map((r, i) => (
            <div key={`${r.group}-${r.id}`}>
              {i === 0 || results[i - 1]?.group !== r.group ? <p className="search-group">{r.group}</p> : null}
              <Button
                variant="desktop"
                className={`search-result ${i === selected ? 'highlighted' : ''}`}
                onClick={() => launch(r.app)}
              >
                <r.icon />
                <span>
                  {r.title}
                  <small>{r.subtitle}</small>
                </span>
                <ArrowRight className="ml-auto" />
              </Button>
            </div>
          ))}
          {!results.length && <p className="text-muted-foreground text-center py-9 text-xs">No results for “{query}”</p>}
        </div>
      ) : (
        <>
          <section className="launcher-section">
            <div className="section-heading">
              <h2>{all ? 'All applications' : 'Pinned'}</h2>
              <Button variant="glass" size="sm" onClick={() => setAll(s => !s)}>
                {all ? 'Pinned apps' : 'All apps'}
                <ArrowRight />
              </Button>
            </div>
            <div className="launcher-grid">
              {(all ? apps : apps.slice(0, 12)).map(app => (
                <Button variant="desktop" className="launcher-app" key={app.id} onClick={() => launch(app.id)}>
                  <AppIcon id={app.id} />
                  {app.name}
                </Button>
              ))}
            </div>
          </section>

          <section className="launcher-section">
            <h2>{state.windows.length ? 'Recently opened' : 'Recommended'}</h2>
            <div className="recent-list">
              {(state.windows.length
                ? [...state.windows].sort((a, b) => b.z - a.z).slice(0, 4).map(w => w.id)
                : (['home', 'study', 'tasks', 'notes'] as AppId[])
              ).map(id => (
                <Button variant="desktop" className="recent-item" key={id} onClick={() => launch(id)}>
                  <AppIcon id={id} small />
                  <span className="text-left">
                    {apps.find(a => a.id === id)?.name}
                    <small>Pick up where you left off</small>
                  </span>
                </Button>
              ))}
            </div>
          </section>

          <div className="launcher-footer">
            <div className="flex items-center gap-3">
              <span className="avatar">{data.preferences.name.slice(0, 2).toUpperCase()}</span>
              <span className="text-xs">{data.preferences.name} Morgan</span>
            </div>
            <div className="flex gap-1">
              <Button variant="desktop" size="icon" title="Settings" aria-label="Open settings" onClick={() => launch('settings')}>
                <Settings />
              </Button>
              <Button variant="desktop" size="icon" title="Lock workspace" aria-label="Lock workspace" onClick={onLock}>
                <Power />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
