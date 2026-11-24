import { CheckCheck, Clock, Flame, Wallet, Flag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { usePersonalData } from '@/stores/personal-data';
import { formatCurrency, getLastNDaysIso } from '@/lib/date';

export function AnalyticsApp() {
  const { data, now } = usePersonalData();

  const tasksDone = data.tasks.filter(t => t.done).length;
  const taskRate = data.tasks.length ? Math.round((tasksDone / data.tasks.length) * 100) : 0;

  const studyHours = data.subjects.reduce((s, sub) => s + sub.completedHours, 0);
  const studyTarget = data.subjects.reduce((s, sub) => s + sub.targetHours, 0);

  const last7Days = getLastNDaysIso(7, now);
  const habitSeries = last7Days.map(dayIso => {
    const completed = data.habits.filter(h => (h.history ?? []).includes(dayIso)).length;
    const label = new Date(`${dayIso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
    return { day: label, habits: completed };
  });

  const studySeries = data.subjects.map(sub => ({
    subject: sub.code,
    completed: sub.completedHours,
    target: sub.targetHours,
  }));

  const totalSpent = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgGoalProgress = data.goals.length
    ? Math.round(data.goals.reduce((s, g) => s + g.progress, 0) / data.goals.length)
    : 0;

  const habitConsistency = data.habits.length
    ? Math.round(
        (data.habits.reduce((acc, h) => acc + last7Days.filter(d => (h.history ?? []).includes(d)).length, 0) /
          (data.habits.length * 7)) *
          100,
      )
    : 0;

  return (
    <div className="app-page">
      <h1>Analytics</h1>
      <p className="subtitle">Live insights across your tasks, study hours, habits, finances, and goals.</p>

      <div className="stat-grid mb-6">
        <div className="stat-card">
          <div className="stat-label"><CheckCheck className="text-blue" />Task completion</div>
          <div className="stat-value">{taskRate}<small>%</small></div>
          <div className="stat-bottom">{tasksDone} of {data.tasks.length} tasks done</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Clock className="text-primary" />Study hours</div>
          <div className="stat-value">{studyHours.toFixed(1)}<small> / {studyTarget}h</small></div>
          <div className="stat-bottom">{data.focusSessions * 25}m focus today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Flame className="text-success" />Habit consistency</div>
          <div className="stat-value">{habitConsistency}<small>%</small></div>
          <div className="stat-bottom">7-day rolling rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Wallet className="text-warning" />Spending</div>
          <div className="stat-value">{formatCurrency(totalSpent)}</div>
          <div className="stat-bottom">Avg goal progress: {avgGoalProgress}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <section className="form-panel mb-0">
          <h2 className="text-sm font-medium mb-3">7-day habit activity</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={habitSeries}>
                <XAxis dataKey="day" stroke="#A7B1C5" fontSize={11} />
                <YAxis allowDecimals={false} stroke="#A7B1C5" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(16, 24, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="habits" stroke="#35C99A" fill="rgba(53, 201, 154, 0.25)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="form-panel mb-0">
          <h2 className="text-sm font-medium mb-3">Study hours by subject</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studySeries}>
                <XAxis dataKey="subject" stroke="#A7B1C5" fontSize={11} />
                <YAxis stroke="#A7B1C5" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(16, 24, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="completed" name="Completed (h)" fill="#7775F8" radius={[5, 5, 0, 0]} />
                <Bar dataKey="target" name="Target (h)" fill="rgba(255,255,255,0.18)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="form-panel mb-0">
        <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Flag size={14} className="text-success" />
          Goal progress breakdown
        </h2>
        <div className="space-y-3">
          {data.goals.map(goal => (
            <div key={goal.id}>
              <div className="flex justify-between text-xs">
                <span className="font-medium">{goal.title}</span>
                <span className="text-muted-foreground">{goal.completedSteps}/{goal.totalSteps} milestones · {goal.progress}%</span>
              </div>
              <div className="progress-track mt-1.5">
                <div className="progress-fill bg-success" style={{ width: `${goal.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
