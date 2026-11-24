import { useState } from 'react';
import { Plus, Flag, Check, Trash2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePersonalData } from '@/stores/personal-data';
import { formatShortDate, toIsoDate } from '@/lib/date';
import type { Goal } from '@/types/desktop';

export function GoalsApp() {
  const { data, setData, now } = usePersonalData();
  const [showForm, setShowForm] = useState(false);

  function addGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    const totalSteps = Math.max(1, Number(form.get('totalSteps') ?? 4) || 4);
    const goal: Goal = {
      id: crypto.randomUUID(),
      title,
      category: String(form.get('category') ?? 'Personal'),
      completedSteps: 0,
      totalSteps,
      progress: 0,
      targetDate: String(form.get('targetDate') ?? toIsoDate(now)),
    };
    setData(d => ({ ...d, goals: [...d.goals, goal] }));
    setShowForm(false);
  }

  function incrementStep(goal: Goal) {
    const completedSteps = Math.min(goal.totalSteps, goal.completedSteps + 1);
    const progress = Math.round((completedSteps / Math.max(1, goal.totalSteps)) * 100);
    setData(d => ({
      ...d,
      goals: d.goals.map(g => (g.id === goal.id ? { ...g, completedSteps, progress } : g)),
    }));
  }

  return (
    <div className="app-page">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1>Goals</h1>
          <p className="subtitle mb-0">Keep long-term milestones visible and measurable.</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}><Plus />New goal</Button>
      </div>

      {showForm && (
        <form className="form-panel mt-5" onSubmit={addGoal}>
          <label className="field-label">Goal title</label>
          <input name="title" required autoFocus placeholder="e.g. Complete Machine Learning specialization" className="field w-full mb-3" />
          <div className="form-grid">
            <label>
              <span className="field-label">Category</span>
              <select name="category" className="field w-full">
                <option>Career</option>
                <option>Academic</option>
                <option>Growth</option>
                <option>Health</option>
                <option>Finance</option>
              </select>
            </label>
            <label>
              <span className="field-label">Total milestones</span>
              <input name="totalSteps" type="number" min={1} max={100} defaultValue={5} className="field w-full" />
            </label>
            <label>
              <span className="field-label">Target date</span>
              <input name="targetDate" type="date" defaultValue={toIsoDate(now)} className="field w-full" />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit"><Check />Create goal</Button>
            <Button type="button" variant="desktop" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="space-y-3 mt-5">
        {data.goals.map(goal => (
          <div key={goal.id} className="form-panel mb-0">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Flag size={13} className="text-success" />
                  <span className="text-sm font-medium">{goal.title}</span>
                  <span className="tag">{goal.category}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {goal.completedSteps} of {goal.totalSteps} milestones · Target {formatShortDate(goal.targetDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{goal.progress}%</span>
                <Button
                  variant="glass"
                  size="sm"
                  disabled={goal.completedSteps >= goal.totalSteps}
                  onClick={() => incrementStep(goal)}
                >
                  <ArrowUp />
                  Step
                </Button>
                <Button
                  variant="desktop"
                  size="icon"
                  aria-label={`Delete ${goal.title}`}
                  onClick={() => setData(d => ({ ...d, goals: d.goals.filter(g => g.id !== goal.id) }))}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="progress-track mt-3">
              <div className="progress-fill bg-success" style={{ width: `${goal.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
