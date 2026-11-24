import {
  House,
  CheckCheck,
  GraduationCap,
  Sprout,
  CalendarDays,
  NotebookPen,
  Flag,
  ChartNoAxesCombined,
  Timer,
  Wallet,
  Sparkles,
  BookOpen,
  Folder,
  Settings,
} from 'lucide-react';
import type { AppId } from '@/types/desktop';

export const apps = [
  { id: 'home', name: 'Overview', icon: House, tone: 'violet', description: 'Your day, at a glance', available: true },
  { id: 'tasks', name: 'Tasks', icon: CheckCheck, tone: 'blue', description: 'Make room for what matters', available: true },
  { id: 'study', name: 'Study Planner', icon: GraduationCap, tone: 'violet', description: 'Subjects, timetables and exams', available: true },
  { id: 'finance', name: 'Expenses', icon: Wallet, tone: 'mint', description: 'Income, budgets and spending', available: true },
  { id: 'habits', name: 'Habits', icon: Sprout, tone: 'mint', description: 'Small steps, every day', available: true },
  { id: 'calendar', name: 'Calendar', icon: CalendarDays, tone: 'rose', description: 'A little space for your plans', available: true },
  { id: 'assistant', name: 'AI Assistant', icon: Sparkles, tone: 'violet', description: 'Plan, summarize and reflect', available: true },
  { id: 'analytics', name: 'Analytics', icon: ChartNoAxesCombined, tone: 'blue', description: 'Find your rhythm', available: true },
  { id: 'notes', name: 'Notes', icon: NotebookPen, tone: 'yellow', description: 'Capture a thought', available: true },
  { id: 'focus', name: 'Focus', icon: Timer, tone: 'violet', description: 'One thing at a time', available: true },
  { id: 'goals', name: 'Goals', icon: Flag, tone: 'orange', description: 'Keep the bigger picture in sight', available: true },
  { id: 'journal', name: 'Journal', icon: BookOpen, tone: 'rose', description: 'Make a little time to reflect', available: false },
  { id: 'files', name: 'Files', icon: Folder, tone: 'blue', description: 'Everything in its place', available: false },
  { id: 'settings', name: 'Settings', icon: Settings, tone: 'neutral', description: 'Make this space yours', available: true },
] satisfies { id: AppId; name: string; icon: typeof House; tone: string; description: string; available: boolean }[];

export type AppMeta = (typeof apps)[number];

export const validAppIds: AppId[] = apps.map(app => app.id);

export const getApp = (id: AppId): AppMeta => apps.find(app => app.id === id) ?? (apps[0] as AppMeta);

export const pinned: AppId[] = ['home', 'tasks', 'study', 'finance', 'habits', 'calendar', 'assistant', 'analytics', 'notes', 'focus'];
