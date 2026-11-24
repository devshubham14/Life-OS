export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDate(iso: string): string {
  if (!iso) return 'No date';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export function getLastNDaysIso(days: number, anchor = new Date()): string[] {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    list.push(toIsoDate(d));
  }
  return list;
}
