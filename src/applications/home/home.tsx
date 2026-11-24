import {
  Sun,
  ArrowUpRight,
  Check,
  CheckCheck,
  Flame,
  Timer,
  Flag,
  Plus,
  ArrowRight,
  Sprout,
  Droplets,
  BookOpen,
  CalendarDays,
  Sparkles,
  Settings,
  Coffee,
  GraduationCap,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/desktop/app-icon';
import { apps, getApp } from '@/lib/apps';
import { formatCurrency, formatShortDate, toIsoDate } from '@/lib/date';
import { useWindows } from '@/stores/window-manager';
import { usePersonalData } from '@/stores/personal-data';
import type { AppId, Task } from '@/types/desktop';

const WORKSPACE_APPS: AppId[] = ['tasks', 'study', 'calendar', 'notes', 'focus'];
const LIFE_APPS: AppId[] = ['habits', 'finance', 'goals', 'analytics', 'assistant'];

export function TaskRow({ task }: { task: Task }) {
  const { setData } = usePersonalData();
  return (
    <div className="task-row">
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
        {task.done && <Check />}
      </Button>
      <div className="task-info">
        <div className={`task-title ${task.done ? 'completed' : ''}`}>{task.title}</div>
        <div className="task-meta">
          <span className="tag">{task.category}</span>
          <span>·</span>
          <span>{task.dueDate ? formatShortDate(task.dueDate) : task.time}</span>
          {task.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>
      </div>
      {!task.done && <span className="task-priority" title={`${task.priority} priority`} />}
    </div>
  );
}

export function Home() {
  const { open } = useWindows();
  const { data, setData, now } = usePersonalData();

  const todayIso = toIsoDate(now);
  const done = data.tasks.filter(t => t.done).length;
  const habitDone = data.habits.filter(h => h.done).length;
  const bestStreak = data.habits.reduce((m, h) => Math.max(m, h.streak), 0);
  const hour = now.getHours();

  const totalStudyHours = data.subjects.reduce((s, sub) => s + sub.completedHours, 0);
  const targetStudyHours = data.subjects.reduce((s, sub) => s + sub.targetHours, 0);
  const studyPct = targetStudyHours > 0 ? Math.min(100, Math.round((totalStudyHours / targetStudyHours) * 100)) : 0;

  const totalExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const upcomingEvents = data.events
    .filter(e => e.date >= todayIso)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .slice(0, 2);

  return (
    <div className="home-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <BrandMark />
          LIFEOS
        </div>
        <Button variant="desktop" className="sidebar-nav selected" onClick={() => open('home')}>
          {(() => {
            const HomeIcon = getApp('home').icon;
            return <HomeIcon />;
          })()}
          Overview
        </Button>

        <p className="sidebar-section">Your workspace</p>
        {WORKSPACE_APPS.map(id => {
          const app = apps.find(a => a.id === id);
          if (!app) return null;
          return (
            <Button variant="desktop" className="sidebar-nav" key={app.id} onClick={() => open(app.id)}>
              <app.icon />
              {app.name}
            </Button>
          );
        })}

        <p className="sidebar-section">Your life</p>
        {LIFE_APPS.map(id => {
          const app = apps.find(a => a.id === id);
          if (!app) return null;
          return (
            <Button variant="desktop" className="sidebar-nav" key={app.id} onClick={() => open(app.id)}>
              <app.icon />
              {app.name}
            </Button>
          );
        })}

        <Button variant="desktop" className="sidebar-nav mt-4" onClick={() => open('settings')}>
          <Settings />
          Settings
        </Button>

        <div className="sidebar-profile">
          <span className="avatar">{data.preferences.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <div className="profile-name">{data.preferences.name}</div>
            <div className="profile-sub">Local workspace</div>
          </div>
        </div>
      </aside>

      <main className="home-main">
        <div className="home-heading">
          <div>
            <div className="overline">
              <Sun size={12} className="text-warning" />
              YOUR DAILY OVERVIEW
            </div>
            <h1 className="greeting">
              Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {data.preferences.name}{' '}
              <span className="text-warning">☀</span>
            </h1>
            <p className="home-subtitle">A fresh perspective. A little progress. A day that’s yours.</p>
          </div>
          <span className="day-badge">
            <CalendarDays size={11} />
            {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">
              <CheckCheck className="text-blue" />
              Tasks completed
            </div>
            <div className="stat-value">
              {done}
              <small> / {data.tasks.length}</small>
            </div>
            <div className="stat-bottom">
              <ArrowUpRight size={10} className="text-success" />
              {data.tasks.length - done} left for today
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(done / Math.max(1, data.tasks.length)) * 100}%` }} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <Flame className="text-warning" />
              Habit streak
            </div>
            <div className="stat-value">
              {bestStreak} <small>days</small>
            </div>
            <div className="stat-bottom">
              <Flame size={10} className="text-warning" />
              {habitDone} of {data.habits.length} done today
            </div>
            <div className="progress-track">
              <div
                className="progress-fill bg-warning"
                style={{ width: `${(habitDone / Math.max(1, data.habits.length)) * 100}%` }}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <GraduationCap className="text-violet" />
              Study progress
            </div>
            <div className="stat-value">
              {totalStudyHours.toFixed(1)}
              <small> / {targetStudyHours}h</small>
            </div>
            <div className="stat-bottom">
              <ArrowUpRight size={10} className="text-success" />
              {data.assignments.filter(a => a.status !== 'completed').length} deadlines pending
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${studyPct}%` }} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <Wallet className="text-success" />
              Expenses summary
            </div>
            <div className="stat-value">{formatCurrency(totalExpenses)}</div>
            <div className="stat-bottom">
              <Sparkles size={10} className="text-success" />
              Net {formatCurrency(totalIncome - totalExpenses)}
            </div>
            <div className="progress-track">
              <div
                className="progress-fill bg-success"
                style={{ width: `${Math.min(100, Math.round((totalExpenses / Math.max(1, totalIncome)) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="home-columns">
          <section>
            <div className="section-heading">
              <h2>
                Today’s tasks <span className="text-muted-foreground text-[9px] ml-1">{data.tasks.length}</span>
              </h2>
              <Button variant="desktop" onClick={() => open('tasks')}>
                View all <ArrowRight />
              </Button>
            </div>
            {data.tasks.slice(0, 4).map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
            {!data.tasks.length && (
              <div className="py-4 text-xs text-muted-foreground space-y-2">
                <p>Nothing on your list yet.</p>
                <Button variant="glass" size="sm" onClick={() => open('tasks')}>
                  <Plus size={12} />
                  Create your first task
                </Button>
              </div>
            )}

            <div className="section-heading mt-5">
              <h2>Coming up</h2>
              <Button variant="desktop" onClick={() => open('calendar')}>
                Calendar <ArrowRight />
              </Button>
            </div>
            {upcomingEvents.map((ev, idx) => (
              <div key={ev.id} className={`event ${idx % 2 === 1 ? 'mint' : ''}`}>
                <div className="event-time">
                  {formatShortDate(ev.date)} · {ev.startTime} – {ev.endTime}
                </div>
                <div className="event-title">{ev.title}</div>
                <div className="event-meta">
                  {ev.category} · {ev.location}
                </div>
              </div>
            ))}
            {!upcomingEvents.length && (
              <div className="py-3 text-xs text-muted-foreground space-y-2">
                <p>Your schedule is clear.</p>
                <Button variant="glass" size="sm" onClick={() => open('calendar')}>
                  <Plus size={12} />
                  Add your first event
                </Button>
              </div>
            )}
          </section>

          <section>
            <div className="section-heading">
              <h2>Daily habits</h2>
              <Button variant="desktop" onClick={() => open('habits')}>
                {habitDone} of {data.habits.length} <ArrowRight />
              </Button>
            </div>
            {data.habits.slice(0, 4).map((habit, i) => {
              const Icon = [Sprout, BookOpen, Droplets][i % 3] ?? Sprout;
              return (
                <div className="habit-row" key={habit.id}>
                  <span className="habit-symbol">
                    <Icon />
                  </span>
                  <div className="flex-1">
                    <div className="habit-name">{habit.name}</div>
                    <div className="habit-streak">
                      <Flame size={9} />
                      {habit.streak} day streak
                    </div>
                  </div>
                  <div className="week-dots" aria-label="Recent habit history">
                    {Array.from({ length: 5 }, (_, j) => {
                      const filled = (habit.history?.length ?? 0) >= 5 - j || (j === 4 && habit.done);
                      return <span key={j} className={`week-dot ${filled ? 'filled' : ''}`} />;
                    })}
                  </div>
                  <Button
                    variant="desktop"
                    className={`task-check ${habit.done ? 'done' : ''}`}
                    aria-label={`${habit.done ? 'Undo' : 'Complete'} ${habit.name}`}
                    onClick={() =>
                      setData(d => ({
                        ...d,
                        habits: d.habits.map(h =>
                          h.id === habit.id
                            ? {
                                ...h,
                                done: !h.done,
                                streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1),
                              }
                            : h,
                        ),
                      }))
                    }
                  >
                    {habit.done && <Check />}
                  </Button>
                </div>
              );
            })}

            {!data.habits.length && (
              <div className="py-3 text-xs text-muted-foreground space-y-2">
                <p>Start building a better routine.</p>
                <Button variant="glass" size="sm" onClick={() => open('habits')}>
                  <Plus size={12} />
                  Create your first habit
                </Button>
              </div>
            )}

            <div className="section-heading mt-5">
              <h2>A bigger picture</h2>
              <Button variant="desktop" onClick={() => open('goals')}>
                Goals <ArrowRight />
              </Button>
            </div>
            {data.goals.slice(0, 2).map((goal, idx) => (
              <div className="goal-item" key={goal.id}>
                <div className="goal-top">
                  <span>{goal.title}</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${idx % 2 === 1 ? 'bg-success' : ''}`} style={{ width: `${goal.progress}%` }} />
                </div>
                <p>
                  {goal.completedSteps} of {goal.totalSteps} milestones completed
                </p>
              </div>
            ))}
            {!data.goals.length && (
              <div className="py-3 text-xs text-muted-foreground space-y-2">
                <p>Every achievement starts somewhere.</p>
                <Button variant="glass" size="sm" onClick={() => open('goals')}>
                  <Plus size={12} />
                  Set your first goal
                </Button>
              </div>
            )}
          </section>
        </div>

        <div className="quick-actions">
          <Button variant="glass" onClick={() => open('tasks')}>
            <Plus />
            Add task
          </Button>
          <Button variant="glass" onClick={() => open('study')}>
            <GraduationCap />
            Study plan
          </Button>
          <Button variant="glass" onClick={() => open('finance')}>
            <Wallet />
            Log expense
          </Button>
          <Button variant="glass" onClick={() => open('assistant')}>
            <Sparkles />
            Ask AI
          </Button>
          <Button
            variant="glass"
            onClick={() => {
              open('focus');
              setData(d => ({ ...d, focusRunning: true, focusSeconds: d.focusSeconds || 1500 }));
            }}
          >
            <Timer />
            Start focus
          </Button>
          <span className="ml-auto hidden xl:flex items-center gap-1 text-muted-foreground text-[9px]">
            <Coffee size={11} />
            Make today a good one.
          </span>
        </div>
      </main>
    </div>
  );
}
