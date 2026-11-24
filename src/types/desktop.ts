export type AppId =
  | 'home'
  | 'tasks'
  | 'study'
  | 'finance'
  | 'habits'
  | 'calendar'
  | 'assistant'
  | 'analytics'
  | 'notes'
  | 'goals'
  | 'focus'
  | 'journal'
  | 'files'
  | 'settings';

export type WindowMode = 'normal' | 'maximized' | 'left' | 'right';
export interface Geometry { x: number; y: number; width: number; height: number }
export interface DesktopWindow { id: AppId; geometry: Geometry; mode: WindowMode; minimized: boolean; z: number }
export interface WindowState { windows: DesktopWindow[]; active: AppId | null; nextZ: number }

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  done: boolean;
  time: string;
  dueDate?: string;
  tags?: string[];
}

export interface Note { id: string; title: string; body: string; pinned: boolean }

export interface Habit {
  id: string;
  name: string;
  streak: number;
  done: boolean;
  category?: string;
  targetDaysPerWeek?: number;
  history?: string[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: 'violet' | 'blue' | 'mint' | 'rose' | 'warning';
  instructor: string;
  targetHours: number;
  completedHours: number;
}

export interface StudyAssignment {
  id: string;
  subjectId: string;
  title: string;
  type: 'Assignment' | 'Exam' | 'Revision' | 'Reading';
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'in-progress' | 'completed';
  notes: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  topic: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  startTime: string;
  durationMinutes: number;
  completed: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note?: string;
}

export interface BudgetLimit {
  id: string;
  category: string;
  limit: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: 'Work' | 'Study' | 'Personal' | 'Health' | 'Deadline';
  location: string;
  description?: string;
}

export interface Goal {
  id: string;
  title: string;
  category: string;
  progress: number;
  completedSteps: number;
  totalSteps: number;
  targetDate: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  text: string;
  category: string;
  read: boolean;
  timestamp: string;
}

export interface Preferences {
  name: string;
  theme: 'dark' | 'light';
  wallpaper: 'alpine' | 'dusk' | 'aurora' | 'midnight';
  accent: 'violet' | 'mint' | 'rose';
  sound: boolean;
  notifications: boolean;
  focusMode: boolean;
  widgets: boolean;
  taskbarLabels: boolean;
}

export interface LocalData {
  tasks: Task[];
  notes: Note[];
  habits: Habit[];
  subjects: Subject[];
  assignments: StudyAssignment[];
  studySessions: StudySession[];
  transactions: Transaction[];
  budgets: BudgetLimit[];
  events: CalendarEvent[];
  goals: Goal[];
  notifications: NotificationItem[];
  preferences: Preferences;
  focusSeconds: number;
  focusRunning: boolean;
  focusSessions: number;
}
