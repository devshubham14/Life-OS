import { useState } from 'react';
import { Sparkles, Send, ArrowUpRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePersonalData } from '@/stores/personal-data';
import { useWindows } from '@/stores/window-manager';
import { formatCurrency, formatShortDate, toIsoDate } from '@/lib/date';
import type { AppId, LocalData } from '@/types/desktop';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actionApp?: AppId;
  actionLabel?: string;
}

const PROMPTS = [
  'Organize my day',
  'Summarize my tasks',
  'Plan my study sessions',
  'Understand my spending',
  'Review my goals & habits',
];

/**
 * Modular workspace analysis generator.
 * Runs locally on user state until an external AI backend/edge function is configured.
 */
function buildLocalWorkspaceReply(prompt: string, data: LocalData, now: Date): Omit<AssistantMessage, 'id' | 'role'> {
  const q = prompt.toLowerCase();
  const todayIso = toIsoDate(now);
  const openTasks = data.tasks.filter(t => !t.done);
  const highTasks = openTasks.filter(t => t.priority === 'High');
  const pendingAssignments = data.assignments.filter(a => a.status !== 'completed');
  const todayEvents = data.events.filter(e => e.date === todayIso);
  const totalExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const incompleteHabits = data.habits.filter(h => !h.done);

  if (q.includes('spend') || q.includes('expense') || q.includes('budget') || q.includes('money')) {
    const overBudgets = data.budgets.filter(b => {
      const spent = data.transactions
        .filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((s, t) => s + t.amount, 0);
      return spent > b.limit;
    });
    return {
      text: `You have recorded ${formatCurrency(totalIncome)} in income and ${formatCurrency(totalExpenses)} in expenses (net ${formatCurrency(totalIncome - totalExpenses)}). ${
        overBudgets.length
          ? `Heads up: ${overBudgets.map(b => b.category).join(', ')} exceeded its monthly budget.`
          : 'All tracked categories are currently within your monthly budget limits.'
      }`,
      actionApp: 'finance',
      actionLabel: 'Open Expenses',
    };
  }

  if (q.includes('study') || q.includes('exam') || q.includes('assignment') || q.includes('subject')) {
    const nextDue = [...pendingAssignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const remainingSessions = data.studySessions.filter(s => !s.completed);
    return {
      text: `You have ${data.subjects.length} active subjects and ${pendingAssignments.length} pending academic items.${
        nextDue ? ` Priority deadline: "${nextDue.title}" (${nextDue.type}) due ${formatShortDate(nextDue.dueDate)}.` : ''
      } There are ${remainingSessions.length} scheduled study blocks left in your weekly timetable.`,
      actionApp: 'study',
      actionLabel: 'Open Study Planner',
    };
  }

  if (q.includes('task') || q.includes('todo')) {
    return {
      text: `You have ${openTasks.length} open tasks (${highTasks.length} high priority). ${
        highTasks.length
          ? `Start with: ${highTasks.map(t => `"${t.title}"`).join(', ')}.`
          : openTasks[0]
            ? `Next up: "${openTasks[0].title}".`
            : 'Everything on your task list is checked off!'
      }`,
      actionApp: 'tasks',
      actionLabel: 'Open Tasks',
    };
  }

  if (q.includes('goal') || q.includes('habit') || q.includes('productivity')) {
    const avgGoal = data.goals.length
      ? Math.round(data.goals.reduce((s, g) => s + g.progress, 0) / data.goals.length)
      : 0;
    return {
      text: `Habits remaining today: ${incompleteHabits.length} of ${data.habits.length}${
        incompleteHabits.length ? ` (${incompleteHabits.map(h => h.name).join(', ')})` : ''
      }. Average goal progress is ${avgGoal}% across ${data.goals.length} active goals, with ${data.focusSessions} focus sessions logged today.`,
      actionApp: 'analytics',
      actionLabel: 'View Analytics',
    };
  }

  return {
    text: `Here is your daily briefing for ${data.preferences.name}: ${openTasks.length} open tasks (${highTasks.length} high priority), ${todayEvents.length} events today, ${pendingAssignments.length} upcoming study deadlines, and ${incompleteHabits.length} daily habits left to check off. Suggested flow: tackle your top task in a 25-minute Focus block, then review your next scheduled study session.`,
    actionApp: 'home',
    actionLabel: 'Go to Overview',
  };
}

export function AssistantApp() {
  const { data, now } = usePersonalData();
  const { open } = useWindows();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${data.preferences.name}. I can summarize your live tasks, study deadlines, habits, calendar, and expenses directly from your workspace.`,
    },
  ]);

  function sendPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = buildLocalWorkspaceReply(trimmed, data, now);
    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: trimmed },
      { id: crypto.randomUUID(), role: 'assistant', ...reply },
    ]);
    setInput('');
  }

  return (
    <div className="app-page flex flex-col h-full">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h1 className="flex items-center gap-2">
            <Sparkles className="text-primary" size={22} />
            AI Assistant
          </h1>
          <p className="subtitle mb-0">Workspace intelligence for planning, summaries, and reflection.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground">
          <Info size={12} className="text-warning" />
          Local workspace mode · External AI API not configured
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {PROMPTS.map(prompt => (
          <Button key={prompt} variant="glass" size="sm" onClick={() => sendPrompt(prompt)}>
            {prompt}
          </Button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-auto pr-1 mb-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-3.5 rounded-xl border ${
              msg.role === 'user'
                ? 'ml-8 bg-primary/15 border-primary/30'
                : 'mr-4 bg-card border-border'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {msg.role === 'user' ? data.preferences.name : 'LIFEOS Assistant (Local Summary)'}
            </div>
            <p className="text-xs leading-relaxed">{msg.text}</p>
            {msg.actionApp && (
              <Button
                variant="desktop"
                size="sm"
                className="mt-2 h-7 text-[11px]"
                onClick={() => {
                  if (msg.actionApp) open(msg.actionApp);
                }}
              >
                {msg.actionLabel ?? 'Open app'}
                <ArrowUpRight />
              </Button>
            )}
          </div>
        ))}
      </div>

      <form
        className="flex gap-2 pt-2 border-t border-border"
        onSubmit={e => {
          e.preventDefault();
          sendPrompt(input);
        }}
      >
        <input
          aria-label="Ask LIFEOS Assistant"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about today’s tasks, study schedule, spending, or goals…"
          className="field flex-1"
        />
        <Button type="submit">
          <Send />
          Send
        </Button>
      </form>
    </div>
  );
}
