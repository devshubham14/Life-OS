import { useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Pin,
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  List,
  Columns3,
  Check,
  Bell,
  Volume2,
  Eye,
  LayoutGrid,
  Sun,
  Moon,
  Download,
  Upload,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/desktop/app-icon';
import { Home, TaskRow } from '@/applications/home/home';
import { HabitsApp } from '@/applications/habits/habits-app';
import { CalendarApp } from '@/applications/calendar/calendar-app';
import { StudyPlannerApp } from '@/applications/study/study-app';
import { ExpensesApp } from '@/applications/finance/expenses-app';
import { AnalyticsApp } from '@/applications/analytics/analytics-app';
import { AssistantApp } from '@/applications/assistant/assistant-app';
import { GoalsApp } from '@/applications/goals/goals-app';
import { getApp } from '@/lib/apps';
import { toIsoDate } from '@/lib/date';
import { normalizeLocalData } from '@/services/local-repository';
import { useOptionalAuthSession } from '@/stores/auth-session';
import { usePersonalData } from '@/stores/personal-data';
import { useWindows } from '@/stores/window-manager';
import type { AppId, Preferences, Task } from '@/types/desktop';

export function AppContent({ id }: { id: AppId }) {
  if (id === 'home') return <Home />;
  if (id === 'tasks') return <Tasks />;
  if (id === 'study') return <StudyPlannerApp />;
  if (id === 'finance') return <ExpensesApp />;
  if (id === 'habits') return <HabitsApp />;
  if (id === 'calendar') return <CalendarApp />;
  if (id === 'assistant') return <AssistantApp />;
  if (id === 'analytics') return <AnalyticsApp />;
  if (id === 'notes') return <Notes />;
  if (id === 'focus') return <Focus />;
  if (id === 'goals') return <GoalsApp />;
  if (id === 'settings') return <Settings />;
  return <FutureApp id={id} />;
}

function FutureApp({ id }: { id: AppId }) {
  const app = getApp(id);
  const { open } = useWindows();
  return (
    <div className="future-app">
      <AppIcon id={id} />
      <h1>{app.name}</h1>
      <p>
        {app.description}.<br />
        This module is preserved for the next LIFEOS milestone.
      </p>
      <Button variant="glass" onClick={() => open('home')}>
        <ArrowLeft />
        Back to Overview
      </Button>
    </div>
  );
}

function Tasks() {
  const { data, setData, now } = usePersonalData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'upcoming' | 'overdue'>('all');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(false);

  const todayIso = toIsoDate(now);

  const tasks = data.tasks.filter(t => {
    const matchesQuery =
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.category.toLowerCase().includes(query.toLowerCase()) ||
      (t.tags ?? []).some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    if (!matchesQuery) return false;
    if (filter === 'active') return !t.done;
    if (filter === 'completed') return t.done;
    if (filter === 'overdue') return !t.done && Boolean(t.dueDate && t.dueDate < todayIso);
    if (filter === 'upcoming') return !t.done && Boolean(t.dueDate && t.dueDate >= todayIso);
    return true;
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get('title') ?? '').trim();
    if (!title) return;
    const dueDate = String(fields.get('due') ?? '').trim();
    const rawTags = String(fields.get('tags') ?? '');
    const tags = rawTags
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const task: Task = {
      id: editing?.id ?? crypto.randomUUID(),
      title,
      category: String(fields.get('category') ?? 'Personal'),
      priority: String(fields.get('priority') ?? 'Medium') as Task['priority'],
      time: dueDate || editing?.time || 'Today',
      done: editing?.done ?? false,
      ...(dueDate ? { dueDate } : editing?.dueDate ? { dueDate: editing.dueDate } : {}),
      ...(tags.length ? { tags } : {}),
    };

    setData(d => ({
      ...d,
      tasks: editing ? d.tasks.map(t => (t.id === editing.id ? task : t)) : [...d.tasks, task],
    }));
    setForm(false);
    setEditing(null);
  }

  return (
    <div className="app-page">
      <div className="flex justify-between items-center">
        <h1>Tasks</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(s => !s);
          }}
        >
          <Plus />
          New task
        </Button>
      </div>
      <p className="subtitle">A little clarity for the day ahead.</p>

      <div className="app-toolbar">
        <div className="search-input flex-1">
          <Search />
          <input
            aria-label="Search tasks"
            placeholder="Search tasks or tags…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter tasks"
          className="field"
          value={filter}
          onChange={e => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All tasks</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
        </select>
        <Button
          variant={view === 'list' ? 'glass' : 'desktop'}
          size="icon"
          title="List view"
          aria-label="List view"
          onClick={() => setView('list')}
        >
          <List />
        </Button>
        <Button
          variant={view === 'board' ? 'glass' : 'desktop'}
          size="icon"
          title="Board view"
          aria-label="Board view"
          onClick={() => setView('board')}
        >
          <Columns3 />
        </Button>
      </div>

      {form && (
        <form className="form-panel" onSubmit={submit}>
          <label className="field-label">Task</label>
          <input
            name="title"
            aria-label="Task title"
            required
            autoFocus
            defaultValue={editing?.title ?? ''}
            className="field w-full mb-3"
            placeholder="What would you like to do?"
          />
          <div className="form-grid">
            <label>
              <span className="field-label">Category</span>
              <select name="category" className="field w-full" defaultValue={editing?.category ?? 'Personal'}>
                <option>Personal</option>
                <option>Work</option>
                <option>Study</option>
                <option>Health</option>
              </select>
            </label>
            <label>
              <span className="field-label">Priority</span>
              <select name="priority" className="field w-full" defaultValue={editing?.priority ?? 'Medium'}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label>
              <span className="field-label">Due date</span>
              <input name="due" aria-label="Task due date" type="date" defaultValue={editing?.dueDate ?? ''} className="field w-full" />
            </label>
            <label>
              <span className="field-label">Tags (comma separated)</span>
              <input name="tags" placeholder="design, urgent" defaultValue={editing?.tags?.join(', ') ?? ''} className="field w-full" />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit">
              <Check />
              {editing ? 'Save changes' : 'Create task'}
            </Button>
            <Button
              type="button"
              variant="desktop"
              onClick={() => {
                setForm(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {view === 'list' ? (
        tasks.map(task => (
          <div key={task.id} className="flex items-center gap-2">
            <div className="flex-1">
              <TaskRow task={task} />
            </div>
            <Button
              variant="desktop"
              size="icon"
              aria-label={`Edit ${task.title}`}
              title="Edit task"
              onClick={() => {
                setEditing(task);
                setForm(true);
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="desktop"
              size="icon"
              aria-label={`Delete ${task.title}`}
              title="Delete task"
              onClick={() => setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== task.id) }))}
            >
              <Trash2 />
            </Button>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[false, true].map(done => (
            <section key={String(done)}>
              <h2 className="text-sm mb-3 text-muted-foreground">{done ? 'Completed' : 'To do'}</h2>
              {tasks
                .filter(t => t.done === done)
                .map(t => (
                  <div key={t.id} className="form-panel">
                    <TaskRow task={t} />
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="desktop"
                        size="sm"
                        onClick={() => {
                          setEditing(t);
                          setForm(true);
                        }}
                      >
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        variant="desktop"
                        size="icon"
                        title="Delete task"
                        aria-label={`Delete ${t.title}`}
                        onClick={() => setData(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== t.id) }))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
            </section>
          ))}
        </div>
      )}

      {!tasks.length && (
        <div className="text-center py-10 space-y-3">
          <p className="text-muted-foreground">Nothing on your list yet.</p>
          {!form && (
            <Button
              variant="glass"
              size="sm"
              onClick={() => {
                setEditing(null);
                setForm(true);
              }}
            >
              <Plus size={13} />
              Create your first task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Notes() {
  const { data, setData } = usePersonalData();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(data.notes[0]?.id ?? '');
  const note = data.notes.find(n => n.id === selected);
  const update = (value: { title?: string; body?: string; pinned?: boolean }) =>
    setData(d => ({ ...d, notes: d.notes.map(n => (n.id === selected ? { ...n, ...value } : n)) }));

  return (
    <div className="app-page">
      <div className="flex justify-between items-center">
        <h1>Notes</h1>
        <Button
          onClick={() => {
            const id = crypto.randomUUID();
            setData(d => ({ ...d, notes: [{ id, title: 'Untitled note', body: '', pinned: false }, ...d.notes] }));
            setSelected(id);
          }}
        >
          <Plus />
          New note
        </Button>
      </div>
      <p className="subtitle">A home for your thoughts.</p>
      <div className="search-input mb-5">
        <Search />
        <input aria-label="Search notes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a thought…" />
      </div>
      <div className="notes-layout">
        <div className="note-list">
          {[...data.notes]
            .sort((a, b) => Number(b.pinned) - Number(a.pinned))
            .filter(n => `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()))
            .map(n => (
              <Button variant={n.id === selected ? 'glass' : 'desktop'} className="note-choice" key={n.id} onClick={() => setSelected(n.id)}>
                {n.pinned && <Pin size={12} />}
                {n.title}
              </Button>
            ))}
        </div>
        {note ? (
          <div className="note-editor">
            <div className="flex justify-end gap-1">
              <Button
                variant={note.pinned ? 'glass' : 'desktop'}
                size="icon"
                aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                title={note.pinned ? 'Unpin note' : 'Pin note'}
                onClick={() => update({ pinned: !note.pinned })}
              >
                <Pin />
              </Button>
              <Button
                variant="desktop"
                size="icon"
                aria-label="Delete note"
                title="Delete note"
                onClick={() => {
                  setData(d => ({ ...d, notes: d.notes.filter(n => n.id !== selected) }));
                  setSelected(data.notes.find(n => n.id !== selected)?.id ?? '');
                }}
              >
                <Trash2 />
              </Button>
            </div>
            <input aria-label="Note title" value={note.title} onChange={e => update({ title: e.target.value })} />
            <textarea
              aria-label="Note content"
              placeholder="Let your thoughts find their way here…"
              value={note.body}
              onChange={e => update({ body: e.target.value })}
            />
            <p className="text-muted-foreground text-[10px]">
              Saved on this device · {note.body.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        ) : (
          <div className="py-10 space-y-3">
            <p className="text-muted-foreground">Your ideas deserve a space.</p>
            <Button
              variant="glass"
              size="sm"
              onClick={() => {
                const id = crypto.randomUUID();
                setData(d => ({ ...d, notes: [{ id, title: 'Untitled note', body: '', pinned: false }, ...d.notes] }));
                setSelected(id);
              }}
            >
              <Plus size={13} />
              Create your first note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Focus() {
  const { data, setData } = usePersonalData();
  const [mode, setMode] = useState(25);
  return (
    <div className="focus-page">
      <span className="text-primary text-xs flex items-center justify-center gap-2">
        <span className="status-dot" />A LITTLE SPACE TO FOCUS
      </span>
      <h1 className="text-2xl mt-5 font-medium">One thing at a time.</h1>
      <p className="text-muted-foreground text-xs mt-2">Let the rest of the world wait a while.</p>
      <div className="focus-modes">
        {[
          { minutes: 25, name: 'Focus' },
          { minutes: 5, name: 'Short break' },
          { minutes: 15, name: 'Long break' },
        ].map(item => (
          <Button
            key={item.minutes}
            variant={mode === item.minutes ? 'glass' : 'desktop'}
            onClick={() => {
              setMode(item.minutes);
              setData(d => ({ ...d, focusSeconds: item.minutes * 60, focusRunning: false }));
            }}
          >
            {item.name}
          </Button>
        ))}
      </div>
      <div className="focus-display">{formatTimer(data.focusSeconds)}</div>
      <div className="focus-controls">
        <Button
          size="lg"
          onClick={() => setData(d => ({ ...d, focusRunning: !d.focusRunning, focusSeconds: d.focusSeconds || mode * 60 }))}
        >
          {data.focusRunning ? <Pause /> : <Play />}
          {data.focusRunning ? 'Pause' : 'Start session'}
        </Button>
        <Button
          variant="glass"
          size="icon"
          aria-label="Reset focus timer"
          title="Reset timer"
          onClick={() => setData(d => ({ ...d, focusRunning: false, focusSeconds: mode * 60 }))}
        >
          <RotateCcw />
        </Button>
      </div>
      <p className="text-muted-foreground text-xs mt-9">
        {data.focusSessions} sessions · {data.focusSessions * 25} minutes of focus today
      </p>
    </div>
  );
}

export function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <Button
      variant="desktop"
      role="switch"
      aria-label={label}
      aria-checked={on}
      className={`toggle ${on ? 'on' : ''}`}
      onClick={onChange}
    >
      <span />
    </Button>
  );
}

function Settings() {
  const { data, setData, updatePreferences, resetData } = usePersonalData();
  const auth = useOptionalAuthSession();
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const p = data.preferences;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-backup-${toIsoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = normalizeLocalData(JSON.parse(text));
      if (!parsed) {
        setImportMessage('Invalid LIFEOS backup file.');
        return;
      }
      setData(parsed);
      setImportMessage('Workspace backup imported.');
    } catch {
      setImportMessage('Unable to read backup file.');
    } finally {
      e.target.value = '';
    }
  };
  const toggles: { key: keyof Preferences; name: string; description: string; icon: typeof Bell }[] = [
    { key: 'sound', name: 'Sound preference', description: 'Remember your preferred sound setting.', icon: Volume2 },
    { key: 'notifications', name: 'Notifications', description: 'Show notifications in your workspace.', icon: Bell },
    { key: 'focusMode', name: 'Focus mode', description: 'Keep notifications out of the way.', icon: Eye },
    { key: 'widgets', name: 'Desktop widgets', description: 'Clock, weather placeholder and focus timer.', icon: LayoutGrid },
    { key: 'taskbarLabels', name: 'Application names', description: 'Show application names in taskbar tooltips.', icon: List },
  ];

  const wallpapers: { id: Preferences['wallpaper']; label: string }[] = [
    { id: 'alpine', label: 'Alpine twilight' },
    { id: 'dusk', label: 'Quiet dusk' },
    { id: 'aurora', label: 'Spatial aurora' },
    { id: 'midnight', label: 'Architectural midnight' },
  ];

  return (
    <div className="app-page">
      <h1>Make yourself at home.</h1>
      <p className="subtitle">A workspace that feels a little more like you.</p>

      <section className="settings-section">
        <h2>Profile</h2>
        <label className="settings-row">
          <span>
            First name
            <small>Used in your daily greeting.</small>
          </span>
          <input
            className="field"
            aria-label="First name"
            value={p.name}
            maxLength={24}
            onChange={e => updatePreferences({ name: e.target.value })}
          />
        </label>
      </section>

      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-row">
          <span>
            Theme
            <small>Switch between Spatial Dark and Original Light.</small>
          </span>
          <div className="flex gap-2">
            <Button
              variant={p.theme === 'dark' ? 'glass' : 'desktop'}
              size="sm"
              aria-pressed={p.theme === 'dark'}
              onClick={() => updatePreferences({ theme: 'dark' })}
            >
              <Moon size={13} />
              Spatial Dark
            </Button>
            <Button
              variant={p.theme === 'light' ? 'glass' : 'desktop'}
              size="sm"
              aria-pressed={p.theme === 'light'}
              onClick={() => updatePreferences({ theme: 'light' })}
            >
              <Sun size={13} />
              Light
            </Button>
          </div>
        </div>

        <div className="settings-row">
          <span>Wallpaper</span>
          <div className="flex flex-wrap gap-2">
            {wallpapers.map(w => (
              <Button
                key={w.id}
                variant="desktop"
                className={`wallpaper-choice ${w.id} ${p.wallpaper === w.id ? 'selected' : ''}`}
                aria-label={`${w.label} wallpaper`}
                title={w.label}
                onClick={() => updatePreferences({ wallpaper: w.id })}
              >
                {w.id === 'alpine' || w.id === 'dusk' ? (
                  <img src="/images/alpine-twilight.png" alt={w.label} />
                ) : (
                  <span className={`wallpaper-swatch ${w.id}`} />
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span>Accent color</span>
          <div className="flex gap-3">
            {(['violet', 'mint', 'rose'] as const).map(c => (
              <Button
                variant="desktop"
                key={c}
                className={`swatch ${c} ${p.accent === c ? 'selected' : ''}`}
                aria-label={`${c} accent`}
                onClick={() => updatePreferences({ accent: c })}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Workspace preferences</h2>
        {toggles.map(t => (
          <div className="settings-row" key={t.key}>
            <span>
              {t.name}
              <small>{t.description}</small>
            </span>
            <Toggle label={t.name} on={Boolean(p[t.key])} onChange={() => updatePreferences({ [t.key]: !p[t.key] })} />
          </div>
        ))}
      </section>

      <section className="settings-section">
        <h2>Data & Privacy</h2>
        <div className="settings-row">
          <span>
            Local workspace storage
            <small>All records are stored locally in this browser. Export backups anytime.</small>
          </span>
          <div className="flex flex-wrap gap-2">
            <Button variant="glass" size="sm" onClick={handleExport}>
              <Download size={13} />
              Export JSON
            </Button>
            <label className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium bg-card border border-border hover:bg-accent cursor-pointer">
              <Upload size={13} />
              Import JSON
              <input type="file" accept="application/json" className="sr-only" onChange={handleImport} />
            </label>
          </div>
        </div>
        {importMessage && <p className="text-[11px] text-muted-foreground mt-1">{importMessage}</p>}

        {auth?.session && (
          <div className="settings-row">
            <span>
              Local profile session
              <small>Signed in locally as {auth.session.email}</small>
            </span>
            <Button variant="glass" size="sm" onClick={auth.signOut}>
              <LogOut size={13} />
              Sign out
            </Button>
          </div>
        )}

        <div className="settings-row">
          <span>
            Clear local application data
            <small>Removes all tasks, notes, habits, study plans, expenses, and local profile data.</small>
          </span>
          {!confirmClear ? (
            <Button variant="glass" size="sm" onClick={() => setConfirmClear(true)}>
              <RotateCcw size={13} />
              Clear all data
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setConfirmClear(false);
                  if (auth) auth.clearWorkspaceAndReset();
                  else resetData();
                }}
              >
                Confirm clear
              </Button>
              <Button variant="desktop" size="sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </section>

      <p className="text-muted-foreground text-[10px] mt-6">
        LIFEOS · Desktop workspace · Preferences saved on this device
      </p>
    </div>
  );
}
