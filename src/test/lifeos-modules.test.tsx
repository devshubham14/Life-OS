import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LifeDesktop } from '@/components/desktop/desktop';
import { initialWindowState, windowReducer } from '@/stores/window-manager';
import { repository } from '@/services/local-repository';
import { apps } from '@/lib/apps';

describe('LIFEOS Window Manager', () => {
  it('opens, focuses, minimizes, snaps, and closes windows cleanly', () => {
    const opened = windowReducer(initialWindowState, {
      type: 'open',
      id: 'study',
      geometry: { x: 100, y: 100, width: 800, height: 550 },
    });
    expect(opened.active).toBe('study');
    expect(opened.windows.some(w => w.id === 'study')).toBe(true);

    const snapped = windowReducer(opened, { type: 'mode', id: 'study', mode: 'left' });
    expect(snapped.windows.find(w => w.id === 'study')?.mode).toBe('left');

    const minimized = windowReducer(snapped, { type: 'minimize', id: 'study' });
    expect(minimized.windows.find(w => w.id === 'study')?.minimized).toBe(true);
    expect(minimized.active).toBe('home');

    const closed = windowReducer(minimized, { type: 'close', id: 'study' });
    expect(closed.windows.some(w => w.id === 'study')).toBe(false);
  });
});

describe('LIFEOS Local Repository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates legacy localStorage payloads with missing new module arrays', () => {
    localStorage.setItem(
      'lifeos.personal.v1',
      JSON.stringify({
        tasks: [{ id: 't1', title: 'Legacy task', category: 'Work', priority: 'High', done: false, time: 'Today' }],
        notes: [],
        habits: [{ id: 'h1', name: 'Stretch', streak: 3, done: false }],
        preferences: { name: 'Sam', wallpaper: 'alpine', accent: 'violet' },
      }),
    );

    const loaded = repository.read();
    expect(loaded).not.toBeNull();
    expect(loaded?.preferences.name).toBe('Sam');
    expect(loaded?.preferences.theme).toBe('dark');
    expect(Array.isArray(loaded?.subjects)).toBe(true);
    expect(Array.isArray(loaded?.transactions)).toBe(true);
    expect(Array.isArray(loaded?.events)).toBe(true);
  });
});

describe('LIFEOS Core Applications', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registers all nine core modules as available', () => {
    const coreIds = ['home', 'tasks', 'study', 'finance', 'habits', 'calendar', 'assistant', 'analytics', 'settings'];
    for (const id of coreIds) {
      const app = apps.find(a => a.id === id);
      expect(app).toBeDefined();
      expect(app?.available).toBe(true);
    }
  });

  it('renders desktop shell and opens core modules from the taskbar', () => {
    render(<LifeDesktop />);

    expect(screen.getAllByText(/Good (morning|afternoon|evening), (Alex|there)/i)[0]).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Study Planner taskbar'));
    expect(screen.getByRole('heading', { name: 'Study Planner' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Expenses taskbar'));
    expect(screen.getByRole('heading', { name: 'Expenses & Budgets' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Habits taskbar'));
    expect(screen.getByRole('heading', { name: 'Habits' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Calendar taskbar'));
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('AI Assistant taskbar'));
    expect(screen.getByRole('heading', { name: /AI Assistant/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Analytics taskbar'));
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
  }, 15000);
});
