import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  BatteryFull,
  Bell,
  Sun,
  Play,
  Pause,
  ArrowUpRight,
  Settings,
  RotateCcw,
  LayoutGrid,
  LockKeyhole,
  Eye,
  BellOff,
  X,
  Check,
  CheckCheck,
  Monitor,
  Palette,
  Plus,
  GraduationCap,
  Wallet,
  Sparkles,
  Timer,
  Flame,
  ArrowRight,
  CalendarDays,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppIcon, BrandMark } from './app-icon';
import { Launcher } from './launcher';
import { DockTabs } from '@/components/ui/dock-tabs';
import { Window } from '@/components/windows/desktop-window';
import { AppContent, formatTimer } from '@/applications/app-content';
import { useWindows, WindowProvider } from '@/stores/window-manager';
import { usePersonalData, PersonalDataProvider } from '@/stores/personal-data';
import { apps, getApp } from '@/lib/apps';
import { formatCurrency, formatShortDate, toIsoDate } from '@/lib/date';
import type { AppId } from '@/types/desktop';



export function LifeDesktop() {
  return (
    <PersonalDataProvider>
      <WindowProvider>
        <Desktop />
      </WindowProvider>
    </PersonalDataProvider>
  );
}

function Desktop() {
  const { state, dispatch, open } = useWindows();
  const { data, setData, now, updatePreferences } = usePersonalData();
  const [panel, setPanel] = useState<'start' | 'search' | 'notifications' | 'quick' | null>(null);
  const [locked, setLocked] = useState(false);
  const [context, setContext] = useState<{ x: number; y: number; app?: AppId } | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const desktop = useRef<HTMLDivElement>(null);

  const unread = data.notifications.filter(n => !n.read).length;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPanel(p => (p === 'search' ? null : 'search'));
      }
      if (e.key === 'Escape') {
        setPanel(null);
        setContext(null);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const togglePanel = (id: typeof panel) => {
    setContext(null);
    setPanel(p => (p === id ? null : id));
  };

  function taskbarClick(id: AppId) {
    setPanel(null);
    const w = state.windows.find(w => w.id === id);
    if (w && state.active === id && !w.minimized) dispatch({ type: 'minimize', id });
    else open(id);
  }

  const showDesktop = () => {
    state.windows.filter(w => !w.minimized).forEach(w => dispatch({ type: 'minimize', id: w.id }));
    setPanel(null);
    setContext(null);
  };

  const clock = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hour = now.getHours();
  const incompleteTasks = data.tasks.filter(t => !t.done);
  const topTasks = data.tasks.slice(0, 3);
  const habitStreak = data.habits.reduce((m, h) => Math.max(m, h.streak), 0);
  const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const upcomingEvents = data.events
    .filter(e => e.date >= toIsoDate(now))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .slice(0, 2);
  const topGoal = data.goals[0];

  const quickSettings = (
    <>
      <div className="settings-grid">
        {[
          {
            name: 'Sound',
            icon: data.preferences.sound ? Volume2 : VolumeX,
            enabled: data.preferences.sound,
            action: () => updatePreferences({ sound: !data.preferences.sound }),
          },
          {
            name: 'Focus mode',
            icon: Eye,
            enabled: data.preferences.focusMode,
            action: () => updatePreferences({ focusMode: !data.preferences.focusMode }),
          },
          {
            name: 'Notifications',
            icon: data.preferences.notifications ? Bell : BellOff,
            enabled: data.preferences.notifications,
            action: () => updatePreferences({ notifications: !data.preferences.notifications }),
          },
          {
            name: 'Desktop widgets',
            icon: LayoutGrid,
            enabled: data.preferences.widgets,
            action: () => updatePreferences({ widgets: !data.preferences.widgets }),
          },
        ].map(item => (
          <Button
            variant="glass"
            className={`quick-setting ${item.enabled ? 'enabled' : ''}`}
            key={item.name}
            aria-pressed={item.enabled}
            onClick={item.action}
          >
            <item.icon />
            {item.name}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-5 text-muted-foreground text-[10px]">
        <span className="flex items-center gap-2">
          <BatteryFull size={15} />
          System indicators · Preview
        </span>
        <Button
          variant="desktop"
          size="icon"
          aria-label="Open settings"
          title="Settings"
          onClick={() => {
            open('settings');
            setPanel(null);
          }}
        >
          <Settings />
        </Button>
      </div>
    </>
  );

  const wallpaperStyle = {
    transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0) scale(1.03)`,
  };

  return (
    <div
      ref={desktop}
      className={`desktop ${data.preferences.theme === 'light' ? 'light-theme' : 'dark'}`}
      data-accent={data.preferences.accent}
      onPointerMove={e => {
        if (window.innerWidth <= 700) return;
        const nx = (e.clientX / window.innerWidth - 0.5) * -10;
        const ny = (e.clientY / window.innerHeight - 0.5) * -10;
        setParallax({ x: Number(nx.toFixed(1)), y: Number(ny.toFixed(1)) });
      }}
      onPointerDown={e => {
        const target = e.target as HTMLElement;
        if (!target.closest('.launcher,.side-panel,.taskbar,.context-menu,.os-window')) {
          setPanel(null);
          setContext(null);
        }
      }}
      onContextMenu={e => {
        if ((e.target as HTMLElement).closest('.os-window,.taskbar,.launcher,.side-panel')) return;
        e.preventDefault();
        setPanel(null);
        setContext({
          x: Math.max(8, Math.min(e.clientX, window.innerWidth - 220)),
          y: Math.max(8, Math.min(e.clientY, window.innerHeight - 230)),
        });
      }}
    >
      {data.preferences.wallpaper === 'aurora' || data.preferences.wallpaper === 'midnight' ? (
        <div className={`wallpaper wallpaper-scene ${data.preferences.wallpaper}`} style={wallpaperStyle} aria-hidden="true" />
      ) : (
        <img
          className={`wallpaper ${data.preferences.wallpaper === 'dusk' ? 'dusk' : ''}`}
          style={wallpaperStyle}
          src="/images/alpine-twilight.png"
          alt="Alpine mountains reflected in a lake at twilight"
        />
      )}

      <header className="topbar">
        <div className="brand">
          <BrandMark />
          LIFEOS<span className="brand-sub">Your life. One workspace.</span>
        </div>
        <div className="top-status">
          <span className="status-dot" />
          {data.preferences.focusMode ? 'Focus mode' : 'A little better, every day'}
          <Button variant="desktop" size="icon" title="Show desktop" aria-label="Show desktop" onClick={showDesktop}>
            <Monitor className="size-3.5" />
          </Button>
        </div>
      </header>

      <main className="desktop-layout" aria-label="Desktop workspace">

        {/* Central Desktop Workspace — Premium 2-col layout */}
        <section className="desktop-workspace" aria-label="Productivity overview">
          {/* Compact welcome hero */}
          <div className="workspace-hero">
            <div className="workspace-overline">
              <Sun size={12} className="text-warning" />
              <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span>
            </div>
            <h1 className="greeting">
              Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {data.preferences.name}
            </h1>
            <p className="tagline">Calm, intentional progress for today.</p>
          </div>

          {/* Daily Summary — 4 stat pills */}
          <div className="workspace-stats">
            <button type="button" className="stat-pill" onClick={() => open('tasks')}>
              <CheckCheck size={15} className="stat-pill-icon text-blue" />
              <div className="stat-pill-body">
                <div className="stat-pill-value">{incompleteTasks.length}</div>
                <div className="stat-pill-label">Tasks left</div>
              </div>
            </button>
            <button type="button" className="stat-pill" onClick={() => open('habits')}>
              <Flame size={15} className="stat-pill-icon text-warning" />
              <div className="stat-pill-body">
                <div className="stat-pill-value">{habitStreak}</div>
                <div className="stat-pill-label">Day streak</div>
              </div>
            </button>
            <button type="button" className="stat-pill" onClick={() => open('study')}>
              <GraduationCap size={15} className="stat-pill-icon text-violet" />
              <div className="stat-pill-body">
                <div className="stat-pill-value">{data.assignments.filter(a => a.status !== 'completed').length}</div>
                <div className="stat-pill-label">Assignments</div>
              </div>
            </button>
            <button type="button" className="stat-pill" onClick={() => open('finance')}>
              <Wallet size={15} className="stat-pill-icon text-success" />
              <div className="stat-pill-body">
                <div className="stat-pill-value">{formatCurrency(netBalance)}</div>
                <div className="stat-pill-label">Net balance</div>
              </div>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="workspace-actions">
            <Button variant="glass" size="sm" onClick={() => open('tasks')}><Plus size={12} />New task</Button>
            <Button variant="glass" size="sm" onClick={() => open('study')}><GraduationCap size={12} />Study plan</Button>
            <Button variant="glass" size="sm" onClick={() => open('finance')}><Wallet size={12} />Log expense</Button>
            <Button variant="glass" size="sm" onClick={() => open('assistant')}><Sparkles size={12} />Ask AI</Button>
            <Button variant="glass" size="sm" onClick={() => { open('focus'); setData(d => ({ ...d, focusRunning: true, focusSeconds: d.focusSeconds || 1500 })); }}>
              <Timer size={12} />Start focus
            </Button>
          </div>

          <div className="workspace-grid">
            {/* Today's Priorities Card */}
            <div className="workspace-card">
              <div className="workspace-card-head">
                <span className="workspace-card-title">
                  <CheckCheck size={14} className="text-blue" />
                  Today’s Priorities
                </span>
                <Button variant="desktop" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => open('tasks')}>
                  Open Tasks <ArrowRight size={11} />
                </Button>
              </div>
              <div className="space-y-2">
                {topTasks.map(task => (
                  <div key={task.id} className="task-row py-1.5 border-b border-border/50 last:border-b-0 min-h-0">
                    <Button
                      variant="desktop"
                      className={`task-check ${task.done ? 'done' : ''}`}
                      aria-label={`${task.done ? 'Uncomplete' : 'Complete'} ${task.title}`}
                      onClick={() =>
                        setData(d => ({
                          ...d,
                          tasks: d.tasks.map(t => (t.id === task.id ? { ...t, done: !t.done } : t)),
                        }))
                      }
                    >
                      {task.done && <Check size={10} />}
                    </Button>
                    <div className="task-info min-w-0">
                      <div className={`text-xs truncate ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </div>
                      <div className="task-meta text-[9px]">
                        <span className="tag">{task.category}</span>
                        <span>{task.dueDate ? formatShortDate(task.dueDate) : task.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!topTasks.length && (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">Nothing on your list yet.</p>
                    <Button variant="glass" size="sm" className="h-7 text-[10px]" onClick={() => open('tasks')}>
                      <Plus size={11} />
                      Create your first task
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming & Academic Milestones Card */}
            <div className="workspace-card">
              <div className="workspace-card-head">
                <span className="workspace-card-title">
                  <CalendarDays size={14} className="text-rose" />
                  Upcoming & Milestones
                </span>
                <Button variant="desktop" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => open('calendar')}>
                  Calendar <ArrowRight size={11} />
                </Button>
              </div>
              <div className="space-y-2.5">
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className="p-2 rounded-lg bg-card/40 border border-border/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium truncate">{ev.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{ev.startTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                      <span className="tag">{ev.category}</span>
                      <span>{formatShortDate(ev.date)} · {ev.location}</span>
                    </div>
                  </div>
                ))}
                {!upcomingEvents.length && !topGoal && (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">Your schedule is clear.</p>
                    <Button variant="glass" size="sm" className="h-7 text-[10px]" onClick={() => open('calendar')}>
                      <Plus size={11} />
                      Add your first event
                    </Button>
                  </div>
                )}
                {topGoal && (
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <Flag size={11} className="text-success" />
                        {topGoal.title}
                      </span>
                      <span className="text-[11px] font-medium">{topGoal.progress}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill bg-success" style={{ width: `${topGoal.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Region 3: Right-Side Widgets (approx 340-370px, independently scrollable, clears dock) */}
        {data.preferences.widgets && (
          <aside className="desktop-widgets" aria-label="Desktop widgets">
            <div className="glass-panel clock-widget">
              <div className="date">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
              <div className="time">{clock}</div>
              <div className="location">
                <Sun size={12} className="text-warning" />
                Make time for what matters
              </div>
            </div>

            <div className="glass-panel widget focus-widget">
              <div className="widget-head">
                <span className="flex items-center gap-2">
                  <span className="text-primary">
                    <Play size={12} />
                  </span>
                  Time to focus
                </span>
                <Button
                  variant="desktop"
                  size="icon"
                  className="size-5"
                  title="Open Focus"
                  aria-label="Open Focus"
                  onClick={() => open('focus')}
                >
                  <ArrowUpRight size={13} />
                </Button>
              </div>
              <div className="timer">{formatTimer(data.focusSeconds)}</div>
              <div className="timer-sub">One thing at a time.</div>
              <Button
                variant="glass"
                className="w-full h-8 text-[11px]"
                onClick={() =>
                  setData(d => ({ ...d, focusRunning: !d.focusRunning, focusSeconds: d.focusSeconds || 1500 }))
                }
              >
                {data.focusRunning ? <Pause size={13} /> : <Play size={13} />}
                {data.focusRunning ? 'Pause session' : 'Start a focus session'}
              </Button>
            </div>

            <div className="glass-panel widget quote-widget">
              <div className="quote">
                “Almost everything will work again if you
                <br />
                unplug it for a few minutes, including you.”
                <small>— Anne Lamott</small>
              </div>
            </div>
          </aside>
        )}
      </main>

      <AnimatePresence>
        {state.windows
          .filter(w => !w.minimized)
          .map(w => (
            <Window key={w.id} window={w}>
              <AppContent id={w.id} />
            </Window>
          ))}
      </AnimatePresence>

      <DockTabs
        windows={state.windows}
        activeId={state.active}
        panel={panel}
        now={now}
        preferences={data.preferences}
        unreadCount={unread}
        onAppClick={taskbarClick}
        onAppContextMenu={(e, id) => {
          e.preventDefault();
          setContext({ x: Math.min(e.clientX, window.innerWidth - 220), y: window.innerHeight - 200, app: id });
        }}
        onTogglePanel={togglePanel}
      />

      <AnimatePresence>
        {(panel === 'start' || panel === 'search') && (
          <Launcher
            key={panel}
            searchOnly={panel === 'search'}
            onClose={() => setPanel(null)}
            onLock={() => {
              setPanel(null);
              setLocked(true);
            }}
          />
        )}
        {(panel === 'notifications' || panel === 'quick') && (
          <motion.aside
            className="side-panel glass-panel"
            role="dialog"
            aria-label={panel === 'quick' ? 'Quick settings' : 'Notification center'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="panel-header">
              <h2>{panel === 'quick' ? 'Quick settings' : 'Notifications'}</h2>
              <Button variant="desktop" size="icon" aria-label="Close panel" title="Close" onClick={() => setPanel(null)}>
                <X />
              </Button>
            </div>
            {panel === 'notifications' && (
              <>
                <div className="flex justify-between text-xs">
                  <Button
                    variant="desktop"
                    size="sm"
                    onClick={() =>
                      setData(d => ({ ...d, notifications: d.notifications.map(item => ({ ...item, read: true })) }))
                    }
                  >
                    <Check />
                    Mark all read
                  </Button>
                  <Button variant="desktop" size="sm" onClick={() => setData(d => ({ ...d, notifications: [] }))}>
                    Clear all
                  </Button>
                </div>
                {data.notifications.map(n => (
                  <div key={n.id} className={`notification ${n.read ? 'opacity-60' : ''}`}>
                    <div className="notification-title">
                      {!n.read && <span className="status-dot" />}
                      {n.title}
                    </div>
                    <p>{n.text}</p>
                    <small>
                      {n.category} · {n.timestamp}
                    </small>
                  </div>
                ))}
                {!data.notifications.length && <p className="text-muted-foreground text-xs text-center py-5">All caught up.</p>}
              </>
            )}
            {quickSettings}
          </motion.aside>
        )}
      </AnimatePresence>

      {context && (
        <div className="context-menu glass-panel" style={{ left: context.x, top: context.y }} role="menu" aria-label="Desktop actions">
          {context.app ? (
            <>
              <Button
                variant="desktop"
                role="menuitem"
                onClick={() => {
                  if (context.app) open(context.app);
                  setContext(null);
                }}
              >
                <ArrowUpRight />
                Open {getApp(context.app).name}
              </Button>
              <Button
                variant="desktop"
                role="menuitem"
                onClick={() => {
                  if (context.app) dispatch({ type: 'close', id: context.app });
                  setContext(null);
                }}
              >
                <X />
                Close window
              </Button>
            </>
          ) : (
            <>
              <Button variant="desktop" role="menuitem" onClick={showDesktop}>
                <Monitor />
                Show desktop
              </Button>
              <Button
                variant="desktop"
                role="menuitem"
                onClick={() => {
                  updatePreferences({ widgets: !data.preferences.widgets });
                  setContext(null);
                }}
              >
                <LayoutGrid />
                {data.preferences.widgets ? 'Hide' : 'Show'} widgets
              </Button>
              <Button
                variant="desktop"
                role="menuitem"
                onClick={() => {
                  open('settings');
                  setContext(null);
                }}
              >
                <Palette />
                Personalize desktop
              </Button>
              <Button
                variant="desktop"
                role="menuitem"
                onClick={() => {
                  dispatch({ type: 'restore', state: { windows: [], active: null, nextZ: 1 } });
                  open('home');
                  setContext(null);
                }}
              >
                <RotateCcw />
                Reset workspace
              </Button>
            </>
          )}
        </div>
      )}

      {locked && (
        <div className="session-overlay">
          <BrandMark />
          <h1>{clock}</h1>
          <p>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <div className="avatar mt-8">{data.preferences.name.slice(0, 2).toUpperCase()}</div>
          <p>{data.preferences.name}’s workspace</p>
          <Button variant="glass" onClick={() => setLocked(false)}>
            <LockKeyhole />
            Resume workspace
          </Button>
          <span className="text-muted-foreground text-[10px]">Workspace paused · Not a security lock</span>
        </div>
      )}
    </div>
  );
}
