import { useState } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, Trash2, Check, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { usePersonalData } from '@/stores/personal-data';
import { formatCurrency, formatShortDate, toIsoDate } from '@/lib/date';
import type { Transaction } from '@/types/desktop';

const EXPENSE_CATEGORIES = ['Food', 'Dining', 'Transport', 'Software', 'Housing', 'Education', 'Health', 'Other'];
const CHART_COLORS = ['#7775F8', '#35C99A', '#F4B860', '#F07183', '#60A5FA', '#A78BFA'];

export function ExpensesApp() {
  const { data, setData, now } = usePersonalData();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showTxForm, setShowTxForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const totalBudgetLimit = data.budgets.reduce((s, b) => s + b.limit, 0);
  const budgetPct = totalBudgetLimit > 0 ? Math.round((totalExpenses / totalBudgetLimit) * 100) : 0;

  const categoryTotals = data.transactions
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, tx) => {
      acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
      return acc;
    }, {});

  const chartData = Object.entries(categoryTotals).map(([category, spent]) => ({
    category,
    spent: Number(spent.toFixed(2)),
  }));

  const filteredTx = data.transactions
    .filter(t => filterType === 'all' || t.type === filterType)
    .sort((a, b) => b.date.localeCompare(a.date));

  function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const amount = Number(form.get('amount') ?? 0);
    if (!title || !Number.isFinite(amount) || amount <= 0) return;

    const tx: Transaction = {
      id: crypto.randomUUID(),
      title,
      amount: Number(amount.toFixed(2)),
      type: String(form.get('type') ?? 'expense') as Transaction['type'],
      category: String(form.get('category') ?? 'Food'),
      date: String(form.get('date') ?? toIsoDate(now)),
      note: String(form.get('note') ?? '').trim(),
    };
    setData(d => ({ ...d, transactions: [tx, ...d.transactions] }));
    setShowTxForm(false);
  }

  function saveBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const category = String(form.get('category') ?? 'Food');
    const limit = Number(form.get('limit') ?? 0);
    if (!Number.isFinite(limit) || limit <= 0) return;

    setData(d => {
      const exists = d.budgets.some(b => b.category === category);
      return {
        ...d,
        budgets: exists
          ? d.budgets.map(b => (b.category === category ? { ...b, limit } : b))
          : [...d.budgets, { id: crypto.randomUUID(), category, limit }],
      };
    });
    setShowBudgetForm(false);
  }

  return (
    <div className="app-page">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1>Expenses & Budgets</h1>
          <p className="subtitle mb-0">Track income, spending categories, and monthly budget limits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" onClick={() => setShowBudgetForm(s => !s)}>Set budget</Button>
          <Button onClick={() => setShowTxForm(s => !s)}><Plus />Add entry</Button>
        </div>
      </div>

      <div className="stat-grid mt-5 mb-6">
        <div className="stat-card">
          <div className="stat-label"><TrendingUp className="text-success" />Income</div>
          <div className="stat-value">{formatCurrency(totalIncome)}</div>
          <div className="stat-bottom">Recorded inflows</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><TrendingDown className="text-destructive" />Expenses</div>
          <div className="stat-value">{formatCurrency(totalExpenses)}</div>
          <div className="stat-bottom">Total spending</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Wallet className="text-primary" />Net balance</div>
          <div className="stat-value">{formatCurrency(netBalance)}</div>
          <div className="stat-bottom">{netBalance >= 0 ? 'Positive cash flow' : 'Over income'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><PiggyBank className="text-warning" />Budget used</div>
          <div className="stat-value">{budgetPct}<small>%</small></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, budgetPct)}%` }} /></div>
        </div>
      </div>

      {showTxForm && (
        <form className="form-panel" onSubmit={addTransaction}>
          <label className="field-label">Description</label>
          <input name="title" required autoFocus placeholder="e.g. Groceries or Freelance payout" className="field w-full mb-3" />
          <div className="form-grid">
            <label>
              <span className="field-label">Type</span>
              <select name="type" defaultValue="expense" className="field w-full">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              <span className="field-label">Amount (₹)</span>
              <input name="amount" type="number" step="0.01" min="0.01" required placeholder="25.00" className="field w-full" />
            </label>
            <label>
              <span className="field-label">Category</span>
              <select name="category" defaultValue="Food" className="field w-full">
                {['Income', ...EXPENSE_CATEGORIES].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">Date</span>
              <input name="date" type="date" defaultValue={toIsoDate(now)} className="field w-full" />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit"><Check />Save transaction</Button>
            <Button type="button" variant="desktop" onClick={() => setShowTxForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {showBudgetForm && (
        <form className="form-panel" onSubmit={saveBudget}>
          <div className="form-grid">
            <label>
              <span className="field-label">Category</span>
              <select name="category" className="field w-full">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span className="field-label">Monthly limit (₹)</span>
              <input name="limit" type="number" min="1" step="1" defaultValue={200} required className="field w-full" />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit"><Check />Update budget</Button>
            <Button type="button" variant="desktop" onClick={() => setShowBudgetForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <section className="form-panel mb-0">
          <h2 className="text-sm font-medium mb-3">Spending by category</h2>
          {chartData.length ? (
            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="category" stroke="#A7B1C5" fontSize={11} />
                  <YAxis stroke="#A7B1C5" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(16, 24, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={entry.category} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-10 text-center">No expenses recorded yet.</p>
          )}
        </section>

        <section className="form-panel mb-0">
          <h2 className="text-sm font-medium mb-3">Monthly budgets</h2>
          <div className="space-y-3.5">
            {data.budgets.map(b => {
              const spent = categoryTotals[b.category] ?? 0;
              const pct = Math.min(100, Math.round((spent / Math.max(1, b.limit)) * 100));
              const over = spent > b.limit;
              return (
                <div key={b.id}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium flex items-center gap-1.5">
                      {b.category}
                      {over && <AlertTriangle size={12} className="text-destructive" />}
                    </span>
                    <span className={over ? 'text-destructive' : 'text-muted-foreground'}>
                      {formatCurrency(spent)} / {formatCurrency(b.limit)}
                    </span>
                  </div>
                  <div className="progress-track mt-1.5">
                    <div
                      className={`progress-fill ${over ? 'bg-destructive' : pct > 80 ? 'bg-warning' : 'bg-success'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="form-panel mb-0">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h2 className="text-sm font-medium">Transaction history</h2>
          <div className="flex gap-1">
            {(['all', 'expense', 'income'] as const).map(f => (
              <Button key={f} variant={filterType === f ? 'glass' : 'desktop'} size="sm" onClick={() => setFilterType(f)} className="capitalize">
                {f}
              </Button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredTx.map(tx => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{tx.title}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="tag">{tx.category}</span>
                  <span>{formatShortDate(tx.date)}</span>
                  {tx.note && <span>· {tx.note}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold ${tx.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
                <Button
                  variant="desktop"
                  size="icon"
                  aria-label={`Delete ${tx.title}`}
                  onClick={() => setData(d => ({ ...d, transactions: d.transactions.filter(x => x.id !== tx.id) }))}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
