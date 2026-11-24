import { useState } from 'react';
import { Plus, Flame, Check, Pencil, Trash2, Sprout, Award, CalendarCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePersonalData } from '@/stores/personal-data';
import { getLastNDaysIso, toIsoDate } from '@/lib/date';
import type { Habit } from '@/types/desktop';

const CATEGORIES = ['All', 'Mindfulness', 'Learning', 'Health', 'Productivity', 'Fitness'];

export function HabitsApp() {
  const { data, setData, now } = usePersonalData();
  const [category, setCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const today = toIsoDate(now);
  const weekDays = getLastNDaysIso(7, now);

  const visibleHabits = data.habits.filter(
    h => category === 'All' || (h.category ?? 'Productivity') === category,
  );

  const completedToday = data.habits.filter(h => h.done).length;
  const bestStreak = data.habits.reduce((max, h) => Math.max(max, h.streak), 0);
  const weeklyDoneCount = data.habits.reduce((acc, h) => {
    const history = h.history ?? (h.done ? [today] : []);
    return acc + weekDays.filter(d => history.includes(d)).length;
  }, 0);
  const weeklyTarget = data.habits.reduce((acc, h) => acc + (h.targetDaysPerWeek ?? 7), 0);
  const weeklyRate = weeklyTarget > 0 ? Math.min(100, Math.round((weeklyDoneCount / weeklyTarget) * 100)) : 0;

  function toggleHabitToday(habit: Habit) {
    const nextDone = !habit.done;
    const prevHistory = habit.history ?? [];
    const nextHistory = nextDone
      ? Array.from(new Set([...prevHistory, today]))
      : prevHistory.filter(d => d !== today);
    const nextStreak = nextDone ? habit.streak + 1 : Math.max(0, habit.streak - 1);

    setData(d => ({
      ...d,
      habits: d.habits.map(h =>
        h.id === habit.id
          ? { ...h, done: nextDone, streak: nextStreak, history: nextHistory }
          : h,
      ),
    }));
  }

  function toggleHistoryDay(habit: Habit, dayIso: string) {
    if (dayIso === today) {
      toggleHabitToday(habit);
      return;
    }
    const prevHistory = habit.history ?? [];
    const exists = prevHistory.includes(dayIso);
    const nextHistory = exists ? prevHistory.filter(d => d !== dayIso) : [...prevHistory, dayIso];
    setData(d => ({
      ...d,
      habits: d.habits.map(h => (h.id === habit.id ? { ...h, history: nextHistory } : h)),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
    const habitCategory = String(form.get('category') ?? 'Productivity');
    const targetDaysPerWeek = Math.max(1, Math.min(7, Number(form.get('target') ?? 7) || 7));

    if (editing) {
      setData(d => ({
        ...d,
        habits: d.habits.map(h =>
          h.id === editing.id
            ? { ...h, name, category: habitCategory, targetDaysPerWeek }
            : h,
        ),
      }));
    } else {
      const next: Habit = {
        id: crypto.randomUUID(),
        name,
        streak: 0,
        done: false,
        category: habitCategory,
        targetDaysPerWeek,
        history: [],
      };
      setData(d => ({ ...d, habits: [...d.habits, next] }));
    }
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div className="app-page">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1>Habits</h1>
          <p className="subtitle mb-0">Small steps, compounded daily.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(s => !s);
          }}
        >
          <Plus />
          New habit
        </Button>
      </div>

      <div className="stat-grid mt-5 mb-6">
        <div className="stat-card">
          <div className="stat-label"><Check className="text-success" />Today</div>
          <div className="stat-value">{completedToday}<small> / {data.habits.length}</small></div>
          <div className="stat-bottom">Completed today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Flame className="text-warning" />Best streak</div>
          <div className="stat-value">{bestStreak}<small> days</small></div>
          <div className="stat-bottom">Personal record</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CalendarCheck2 className="text-blue" />7-day rate</div>
          <div className="stat-value">{weeklyRate}<small>%</small></div>
          <div className="stat-bottom">{weeklyDoneCount} check-ins this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Award className="text-primary" />Active habits</div>
          <div className="stat-value">{data.habits.length}</div>
          <div className="stat-bottom">Across routines</div>
        </div>
      </div>

      {showForm && (
        <form className="form-panel" onSubmit={handleSubmit}>
          <label className="field-label">Habit name</label>
          <input
            name="name"
            required
            autoFocus
            defaultValue={editing?.name ?? ''}
            placeholder="e.g. Evening stretch for 10 minutes"
            className="field w-full mb-3"
          />
          <div className="form-grid">
            <label>
              <span className="field-label">Category</span>
              <select name="category" className="field w-full" defaultValue={editing?.category ?? 'Productivity'}>
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Weekly target (days)</span>
              <input
                name="target"
                type="number"
                min={1}
                max={7}
                defaultValue={editing?.targetDaysPerWeek ?? 7}
                className="field w-full"
              />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit">
              <Check />
              {editing ? 'Save habit' : 'Create habit'}
            </Button>
            <Button type="button" variant="desktop" onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map(c => (
          <Button
            key={c}
            variant={category === c ? 'glass' : 'desktop'}
            size="sm"
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleHabits.map(habit => {
          const history = habit.history ?? (habit.done ? [today] : []);
          const weekHits = weekDays.filter(d => history.includes(d)).length;
          const target = habit.targetDaysPerWeek ?? 7;
          const pct = Math.min(100, Math.round((weekHits / target) * 100));

          return (
            <div key={habit.id} className="form-panel mb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="desktop"
                    className={`task-check ${habit.done ? 'done' : ''}`}
                    aria-label={`${habit.done ? 'Undo' : 'Complete'} ${habit.name}`}
                    onClick={() => toggleHabitToday(habit)}
                  >
                    {habit.done && <Check />}
                  </Button>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{habit.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="tag">{habit.category ?? 'Productivity'}</span>
                      <span className="flex items-center gap-1 text-warning">
                        <Flame size={11} />
                        {habit.streak} day streak
                      </span>
                      <span>· {weekHits}/{target} this week</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2" aria-label={`7-day completion history for ${habit.name}`}>
                    {weekDays.map(dayIso => {
                      const active = history.includes(dayIso);
                      const label = new Date(`${dayIso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' });
                      return (
                        <button
                          key={dayIso}
                          type="button"
                          title={`${dayIso}${active ? ' (completed)' : ''}`}
                          onClick={() => toggleHistoryDay(habit, dayIso)}
                          className={`w-6 h-6 rounded text-[10px] font-medium border transition-colors ${
                            active
                              ? 'bg-success/25 border-success text-success'
                              : 'bg-muted/40 border-border text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="desktop"
                    size="icon"
                    aria-label={`Edit ${habit.name}`}
                    onClick={() => {
                      setEditing(habit);
                      setShowForm(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="desktop"
                    size="icon"
                    aria-label={`Delete ${habit.name}`}
                    onClick={() =>
                      setData(d => ({ ...d, habits: d.habits.filter(h => h.id !== habit.id) }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="progress-track mt-3">
                <div className="progress-fill bg-success" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}

        {!visibleHabits.length && (
          <div className="text-center py-10 text-muted-foreground">
            <Sprout className="mx-auto mb-2 opacity-60" size={24} />
            <p>No habits in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
