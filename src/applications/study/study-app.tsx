import { useState } from 'react';
import {
  Plus,
  GraduationCap,
  BookOpen,
  Clock,
  Check,
  Trash2,
  BellPlus,
  CalendarClock,
  FileCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePersonalData } from '@/stores/personal-data';
import { formatShortDate } from '@/lib/date';
import type { StudyAssignment, StudySession, Subject } from '@/types/desktop';

type StudyTab = 'overview' | 'subjects' | 'timetable' | 'assignments';
const DAYS: StudySession['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StudyPlannerApp() {
  const { data, setData, addNotification } = usePersonalData();
  const [tab, setTab] = useState<StudyTab>('overview');
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);

  const totalTargetHours = data.subjects.reduce((s, sub) => s + sub.targetHours, 0);
  const totalCompletedHours = data.subjects.reduce((s, sub) => s + sub.completedHours, 0);
  const pendingAssignments = data.assignments.filter(a => a.status !== 'completed');
  const examsCount = pendingAssignments.filter(a => a.type === 'Exam').length;
  const studyProgressPct = totalTargetHours > 0 ? Math.min(100, Math.round((totalCompletedHours / totalTargetHours) * 100)) : 0;

  function addSubject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
    const subject: Subject = {
      id: crypto.randomUUID(),
      name,
      code: String(form.get('code') ?? '').trim() || 'COURSE',
      color: String(form.get('color') ?? 'violet') as Subject['color'],
      instructor: String(form.get('instructor') ?? '').trim() || 'Self-study',
      targetHours: Math.max(1, Number(form.get('targetHours') ?? 5) || 5),
      completedHours: 0,
    };
    setData(d => ({ ...d, subjects: [...d.subjects, subject] }));
    setShowSubjectForm(false);
  }

  function addAssignment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    const item: StudyAssignment = {
      id: crypto.randomUUID(),
      subjectId: String(form.get('subjectId') ?? data.subjects[0]?.id ?? ''),
      title,
      type: String(form.get('type') ?? 'Assignment') as StudyAssignment['type'],
      dueDate: String(form.get('dueDate') ?? ''),
      priority: String(form.get('priority') ?? 'Medium') as StudyAssignment['priority'],
      status: 'pending',
      notes: String(form.get('notes') ?? '').trim(),
    };
    setData(d => ({ ...d, assignments: [...d.assignments, item] }));
    setShowAssignmentForm(false);
  }

  function addSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const topic = String(form.get('topic') ?? '').trim();
    if (!topic) return;
    const session: StudySession = {
      id: crypto.randomUUID(),
      subjectId: String(form.get('subjectId') ?? data.subjects[0]?.id ?? ''),
      topic,
      day: String(form.get('day') ?? 'Mon') as StudySession['day'],
      startTime: String(form.get('startTime') ?? '15:00'),
      durationMinutes: Math.max(15, Number(form.get('duration') ?? 60) || 60),
      completed: false,
    };
    setData(d => ({ ...d, studySessions: [...d.studySessions, session] }));
    setShowSessionForm(false);
  }

  function toggleSession(session: StudySession) {
    const nextCompleted = !session.completed;
    const deltaHours = (session.durationMinutes / 60) * (nextCompleted ? 1 : -1);
    setData(d => ({
      ...d,
      studySessions: d.studySessions.map(s => (s.id === session.id ? { ...s, completed: nextCompleted } : s)),
      subjects: d.subjects.map(sub =>
        sub.id === session.subjectId
          ? { ...sub, completedHours: Math.max(0, Number((sub.completedHours + deltaHours).toFixed(2))) }
          : sub,
      ),
    }));
  }

  function cycleAssignmentStatus(item: StudyAssignment) {
    const order: StudyAssignment['status'][] = ['pending', 'in-progress', 'completed'];
    const nextStatus = order[(order.indexOf(item.status) + 1) % order.length] ?? 'pending';
    setData(d => ({
      ...d,
      assignments: d.assignments.map(a => (a.id === item.id ? { ...a, status: nextStatus } : a)),
    }));
  }

  return (
    <div className="app-page">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1>Study Planner</h1>
          <p className="subtitle mb-0">Organize subjects, weekly study blocks, assignments, and exam revision.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['overview', 'Overview'],
            ['subjects', 'Subjects'],
            ['timetable', 'Timetable'],
            ['assignments', 'Assignments & Exams'],
          ] as const).map(([key, label]) => (
            <Button key={key} variant={tab === key ? 'glass' : 'desktop'} size="sm" onClick={() => setTab(key)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="stat-grid mt-5 mb-6">
        <div className="stat-card">
          <div className="stat-label"><BookOpen className="text-primary" />Subjects</div>
          <div className="stat-value">{data.subjects.length}</div>
          <div className="stat-bottom">Active courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Clock className="text-blue" />Study hours</div>
          <div className="stat-value">{totalCompletedHours.toFixed(1)}<small> / {totalTargetHours}h</small></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${studyProgressPct}%` }} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><FileCheck2 className="text-warning" />Pending items</div>
          <div className="stat-value">{pendingAssignments.length}</div>
          <div className="stat-bottom">Assignments & revision</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><GraduationCap className="text-destructive" />Upcoming exams</div>
          <div className="stat-value">{examsCount}</div>
          <div className="stat-bottom">Scheduled assessments</div>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className="form-panel mb-0">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium">Subject-wise progress</h2>
              <Button variant="desktop" size="sm" onClick={() => setTab('subjects')}>Manage</Button>
            </div>
            <div className="space-y-4">
              {data.subjects.map(sub => {
                const pct = Math.min(100, Math.round((sub.completedHours / Math.max(1, sub.targetHours)) * 100));
                return (
                  <div key={sub.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{sub.code} · {sub.name}</span>
                      <span className="text-muted-foreground">{sub.completedHours}h / {sub.targetHours}h ({pct}%)</span>
                    </div>
                    <div className="progress-track mt-1">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="form-panel mb-0">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium">Upcoming deadlines & revision</h2>
              <Button variant="desktop" size="sm" onClick={() => setTab('assignments')}>View all</Button>
            </div>
            <div className="space-y-2.5">
              {pendingAssignments.map(a => {
                const sub = data.subjects.find(s => s.id === a.subjectId);
                return (
                  <div key={a.id} className="p-2.5 rounded-md bg-muted/40 border border-border flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {sub?.code ?? 'Study'} · {a.type} · Due {formatShortDate(a.dueDate)}
                      </div>
                    </div>
                    <Button
                      variant="desktop"
                      size="icon"
                      title="Add study reminder"
                      aria-label={`Remind me about ${a.title}`}
                      onClick={() =>
                        addNotification({
                          title: `Study reminder: ${a.title}`,
                          text: `${a.type} for ${sub?.name ?? 'your course'} is due ${formatShortDate(a.dueDate)}.`,
                          category: 'Study Planner',
                        })
                      }
                    >
                      <BellPlus />
                    </Button>
                  </div>
                );
              })}
              {!pendingAssignments.length && (
                <p className="text-xs text-muted-foreground py-4">All assignments and exams are completed.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'subjects' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowSubjectForm(s => !s)}>
              <Plus />
              Add subject
            </Button>
          </div>
          {showSubjectForm && (
            <form className="form-panel" onSubmit={addSubject}>
              <div className="form-grid">
                <label>
                  <span className="field-label">Subject name</span>
                  <input name="name" required autoFocus placeholder="e.g. Data Structures" className="field w-full" />
                </label>
                <label>
                  <span className="field-label">Course code</span>
                  <input name="code" placeholder="CS-202" className="field w-full" />
                </label>
                <label>
                  <span className="field-label">Instructor</span>
                  <input name="instructor" placeholder="Prof. Kim" className="field w-full" />
                </label>
                <label>
                  <span className="field-label">Weekly target (hours)</span>
                  <input name="targetHours" type="number" min={1} max={40} defaultValue={6} className="field w-full" />
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit"><Check />Create subject</Button>
                <Button type="button" variant="desktop" onClick={() => setShowSubjectForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.subjects.map(sub => {
              const pct = Math.min(100, Math.round((sub.completedHours / Math.max(1, sub.targetHours)) * 100));
              return (
                <div key={sub.id} className="form-panel mb-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="tag">{sub.code}</span>
                      <h3 className="text-sm font-medium mt-2">{sub.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{sub.instructor}</p>
                    </div>
                    <Button
                      variant="desktop"
                      size="icon"
                      aria-label={`Delete ${sub.name}`}
                      onClick={() => setData(d => ({ ...d, subjects: d.subjects.filter(s => s.id !== sub.id) }))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-4">
                    <span>Weekly progress</span>
                    <span>{sub.completedHours}h / {sub.targetHours}h</span>
                  </div>
                  <div className="progress-track mt-1.5">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'timetable' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowSessionForm(s => !s)}>
              <Plus />
              Schedule study block
            </Button>
          </div>
          {showSessionForm && (
            <form className="form-panel" onSubmit={addSession}>
              <div className="form-grid">
                <label>
                  <span className="field-label">Topic</span>
                  <input name="topic" required autoFocus placeholder="e.g. Past paper revision" className="field w-full" />
                </label>
                <label>
                  <span className="field-label">Subject</span>
                  <select name="subjectId" className="field w-full">
                    {data.subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="field-label">Day</span>
                  <select name="day" className="field w-full">
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                <label>
                  <span className="field-label">Start time & duration (min)</span>
                  <div className="flex gap-2">
                    <input name="startTime" type="time" defaultValue="16:00" className="field flex-1" />
                    <input name="duration" type="number" min={15} max={240} defaultValue={60} className="field w-24" />
                  </div>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit"><Check />Add to timetable</Button>
                <Button type="button" variant="desktop" onClick={() => setShowSessionForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
          <div className="space-y-2.5">
            {data.studySessions.map(session => {
              const sub = data.subjects.find(s => s.id === session.subjectId);
              return (
                <div key={session.id} className="form-panel mb-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button
                      variant="desktop"
                      className={`task-check ${session.completed ? 'done' : ''}`}
                      aria-label={`Complete study session ${session.topic}`}
                      onClick={() => toggleSession(session)}
                    >
                      {session.completed && <Check />}
                    </Button>
                    <div className="min-w-0">
                      <div className={`text-xs font-medium truncate ${session.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {session.topic}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="tag">{sub?.code ?? 'Study'}</span>
                        <span className="flex items-center gap-1"><CalendarClock size={10} />{session.day} · {session.startTime}</span>
                        <span>· {session.durationMinutes} min</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="desktop"
                    size="icon"
                    aria-label={`Delete ${session.topic}`}
                    onClick={() => setData(d => ({ ...d, studySessions: d.studySessions.filter(s => s.id !== session.id) }))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowAssignmentForm(s => !s)}>
              <Plus />
              Add assignment or exam
            </Button>
          </div>
          {showAssignmentForm && (
            <form className="form-panel" onSubmit={addAssignment}>
              <label className="field-label">Title</label>
              <input name="title" required autoFocus placeholder="e.g. Midterm Revision Sheet" className="field w-full mb-3" />
              <div className="form-grid">
                <label>
                  <span className="field-label">Subject</span>
                  <select name="subjectId" className="field w-full">
                    {data.subjects.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="field-label">Type</span>
                  <select name="type" className="field w-full">
                    <option>Assignment</option>
                    <option>Exam</option>
                    <option>Revision</option>
                    <option>Reading</option>
                  </select>
                </label>
                <label>
                  <span className="field-label">Due date</span>
                  <input name="dueDate" type="date" required className="field w-full" />
                </label>
                <label>
                  <span className="field-label">Priority</span>
                  <select name="priority" className="field w-full" defaultValue="Medium">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>
              </div>
              <label className="block mt-3">
                <span className="field-label">Revision / prep notes</span>
                <input name="notes" placeholder="Chapters or key concepts to review" className="field w-full" />
              </label>
              <div className="flex gap-2 mt-4">
                <Button type="submit"><Check />Save item</Button>
                <Button type="button" variant="desktop" onClick={() => setShowAssignmentForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
          <div className="space-y-2.5">
            {data.assignments.map(item => {
              const sub = data.subjects.find(s => s.id === item.subjectId);
              return (
                <div key={item.id} className="form-panel mb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tag">{sub?.code ?? 'Course'}</span>
                      <span className="tag">{item.type}</span>
                      <span className="text-[10px] text-muted-foreground">Due {formatShortDate(item.dueDate)}</span>
                    </div>
                    <div className={`text-sm font-medium mt-1.5 ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                    </div>
                    {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="glass" size="sm" onClick={() => cycleAssignmentStatus(item)} className="capitalize">
                      {item.status}
                    </Button>
                    <Button
                      variant="desktop"
                      size="icon"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => setData(d => ({ ...d, assignments: d.assignments.filter(a => a.id !== item.id) }))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
