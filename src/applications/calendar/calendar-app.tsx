import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin, Pencil, Trash2, Check, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePersonalData } from '@/stores/personal-data';
import { formatShortDate, toIsoDate } from '@/lib/date';
import type { CalendarEvent } from '@/types/desktop';

type ViewMode = 'month' | 'week' | 'day';
const EVENT_CATEGORIES: CalendarEvent['category'][] = ['Work', 'Study', 'Personal', 'Health', 'Deadline'];

const CATEGORY_BORDER: Record<CalendarEvent['category'], string> = {
  Work: 'border-l-primary',
  Study: 'border-l-blue',
  Personal: 'border-l-success',
  Health: 'border-l-warning',
  Deadline: 'border-l-destructive',
};

export function CalendarApp() {
  const { data, setData, now } = usePersonalData();
  const [view, setView] = useState<ViewMode>('month');
  const [cursorDate, setCursorDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [selectedIso, setSelectedIso] = useState(() => toIsoDate(now));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const todayIso = toIsoDate(now);

  // Merge user events with Study Planner assignment deadlines for visibility
  const deadlineEvents: (CalendarEvent & { readonly?: boolean })[] = data.assignments
    .filter(a => a.status !== 'completed')
    .map(a => {
      const subject = data.subjects.find(s => s.id === a.subjectId);
      return {
        id: `deadline-${a.id}`,
        title: `${subject ? `${subject.code}: ` : ''}${a.title}`,
        date: a.dueDate,
        startTime: '23:59',
        endTime: '23:59',
        category: 'Deadline',
        location: `${a.type} deadline`,
        description: a.notes,
        readonly: true,
      };
    });

  const allItems: (CalendarEvent & { readonly?: boolean })[] = [...data.events, ...deadlineEvents].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
  );

  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthCells: (string | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toIsoDate(new Date(year, month, i + 1))),
  ];

  // Week days around selectedIso
  const selectedObj = new Date(`${selectedIso}T12:00:00`);
  const weekStart = new Date(selectedObj);
  weekStart.setDate(selectedObj.getDate() - selectedObj.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return toIsoDate(d);
  });

  const selectedEvents = allItems.filter(ev => ev.date === selectedIso);
  const upcomingEvents = allItems.filter(ev => ev.date >= todayIso).slice(0, 6);

  function shiftMonth(delta: number) {
    setCursorDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  function submitEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;

    const eventItem: CalendarEvent = {
      id: editing?.id ?? crypto.randomUUID(),
      title,
      date: String(form.get('date') ?? selectedIso),
      startTime: String(form.get('startTime') ?? '09:00'),
      endTime: String(form.get('endTime') ?? '10:00'),
      category: String(form.get('category') ?? 'Personal') as CalendarEvent['category'],
      location: String(form.get('location') ?? '').trim() || 'Workspace',
      description: String(form.get('description') ?? '').trim(),
    };

    setData(d => ({
      ...d,
      events: editing
        ? d.events.map(ev => (ev.id === editing.id ? eventItem : ev))
        : [...d.events, eventItem],
    }));
    setSelectedIso(eventItem.date);
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div className="app-page">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <div>
          <h1>Calendar</h1>
          <p className="subtitle mb-0">Plan your schedule, milestones, and study deadlines.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-card border border-border rounded-md p-1">
            {(['month', 'week', 'day'] as const).map(v => (
              <Button
                key={v}
                variant={view === v ? 'glass' : 'desktop'}
                size="sm"
                onClick={() => setView(v)}
                className="capitalize h-7 px-2.5 text-xs"
              >
                {v}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(s => !s);
            }}
          >
            <Plus />
            New event
          </Button>
        </div>
      </div>

      {showForm && (
        <form className="form-panel mt-4" onSubmit={submitEvent}>
          <label className="field-label">Event title</label>
          <input
            name="title"
            required
            autoFocus
            defaultValue={editing?.title ?? ''}
            placeholder="e.g. Project review or study block"
            className="field w-full mb-3"
          />
          <div className="form-grid">
            <label>
              <span className="field-label">Date</span>
              <input name="date" type="date" defaultValue={editing?.date ?? selectedIso} className="field w-full" required />
            </label>
            <label>
              <span className="field-label">Category</span>
              <select name="category" defaultValue={editing?.category ?? 'Personal'} className="field w-full">
                {EVENT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Start time</span>
              <input name="startTime" type="time" defaultValue={editing?.startTime ?? '10:00'} className="field w-full" />
            </label>
            <label>
              <span className="field-label">End time</span>
              <input name="endTime" type="time" defaultValue={editing?.endTime ?? '11:00'} className="field w-full" />
            </label>
          </div>
          <label className="block mt-3">
            <span className="field-label">Location or link</span>
            <input name="location" defaultValue={editing?.location ?? ''} placeholder="Google Meet, Library, etc." className="field w-full" />
          </label>
          <div className="flex gap-2 mt-4">
            <Button type="submit">
              <Check />
              {editing ? 'Save changes' : 'Create event'}
            </Button>
            <Button type="button" variant="desktop" onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <div className="lg:col-span-2">
          {view === 'month' && (
            <div className="form-panel mb-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">
                  {cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-1">
                  <Button variant="desktop" size="icon" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      setCursorDate(new Date(now.getFullYear(), now.getMonth(), 1));
                      setSelectedIso(todayIso);
                    }}
                  >
                    Today
                  </Button>
                  <Button variant="desktop" size="icon" aria-label="Next month" onClick={() => shiftMonth(1)}>
                    <ChevronRight />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-1">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCells.map((iso, idx) => {
                  if (!iso) return <div key={`empty-${idx}`} className="h-16 rounded-md bg-muted/10" />;
                  const dayItems = allItems.filter(ev => ev.date === iso);
                  const isToday = iso === todayIso;
                  const isSelected = iso === selectedIso;
                  const dayNum = Number(iso.split('-')[2]);

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedIso(iso)}
                      className={`h-16 p-1.5 rounded-md border text-left flex flex-col justify-between transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/15'
                          : isToday
                            ? 'border-success/60 bg-success/10'
                            : 'border-border/60 bg-card hover:bg-accent'
                      }`}
                    >
                      <span className={`text-[11px] font-medium ${isToday ? 'text-success' : ''}`}>{dayNum}</span>
                      <div className="flex flex-wrap gap-1">
                        {dayItems.slice(0, 3).map(item => (
                          <span
                            key={item.id}
                            title={item.title}
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.category === 'Deadline'
                                ? 'bg-destructive'
                                : item.category === 'Study'
                                  ? 'bg-blue'
                                  : item.category === 'Health'
                                    ? 'bg-warning'
                                    : 'bg-primary'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="form-panel mb-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  Week of {formatShortDate(weekDays[0] ?? selectedIso)}
                </h2>
                <Button variant="glass" size="sm" onClick={() => setSelectedIso(todayIso)}>Today</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {weekDays.map(dayIso => {
                  const items = allItems.filter(ev => ev.date === dayIso);
                  return (
                    <div
                      key={dayIso}
                      onClick={() => setSelectedIso(dayIso)}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        dayIso === selectedIso ? 'border-primary bg-primary/10' : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-medium mb-2">
                        <span>{new Date(`${dayIso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        {dayIso === todayIso && <span className="tag text-success">Today</span>}
                      </div>
                      {items.length ? (
                        <div className="space-y-1.5">
                          {items.map(ev => (
                            <div key={ev.id} className={`text-[11px] pl-2 border-l-2 ${CATEGORY_BORDER[ev.category]}`}>
                              <div className="truncate font-medium">{ev.title}</div>
                              <div className="text-muted-foreground text-[10px]">{ev.startTime}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">No events</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'day' && (
            <div className="form-panel mb-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">
                  {new Date(`${selectedIso}T12:00:00`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h2>
                <div className="flex gap-1">
                  <Button
                    variant="desktop"
                    size="icon"
                    aria-label="Previous day"
                    onClick={() => {
                      const d = new Date(`${selectedIso}T12:00:00`);
                      d.setDate(d.getDate() - 1);
                      setSelectedIso(toIsoDate(d));
                    }}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => setSelectedIso(todayIso)}>Today</Button>
                  <Button
                    variant="desktop"
                    size="icon"
                    aria-label="Next day"
                    onClick={() => {
                      const d = new Date(`${selectedIso}T12:00:00`);
                      d.setDate(d.getDate() + 1);
                      setSelectedIso(toIsoDate(d));
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {selectedEvents.map(ev => (
                  <div key={ev.id} className={`p-3 rounded-lg bg-card border border-border border-l-4 ${CATEGORY_BORDER[ev.category]}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-sm font-medium">{ev.title}</div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock size={11} />{ev.startTime} – {ev.endTime}</span>
                          <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>
                          <span className="tag">{ev.category}</span>
                        </div>
                      </div>
                      {!ev.readonly && (
                        <div className="flex gap-1">
                          <Button variant="desktop" size="icon" aria-label={`Edit ${ev.title}`} onClick={() => { setEditing(ev); setShowForm(true); }}>
                            <Pencil />
                          </Button>
                          <Button
                            variant="desktop"
                            size="icon"
                            aria-label={`Delete ${ev.title}`}
                            onClick={() => setData(d => ({ ...d, events: d.events.filter(x => x.id !== ev.id) }))}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!selectedEvents.length && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nothing scheduled for this day.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="form-panel mb-0">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <CalendarDays size={13} />
              {formatShortDate(selectedIso)}
            </h2>
            <div className="space-y-2.5">
              {selectedEvents.map(ev => (
                <div key={ev.id} className={`p-2.5 rounded-md bg-muted/40 border border-border border-l-2 ${CATEGORY_BORDER[ev.category]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{ev.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {ev.startTime} · {ev.location}
                      </div>
                    </div>
                    {!ev.readonly && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="desktop" size="icon" className="h-6 w-6" aria-label={`Edit ${ev.title}`} onClick={() => { setEditing(ev); setShowForm(true); }}>
                          <Pencil />
                        </Button>
                        <Button variant="desktop" size="icon" className="h-6 w-6" aria-label={`Delete ${ev.title}`} onClick={() => setData(d => ({ ...d, events: d.events.filter(x => x.id !== ev.id) }))}>
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!selectedEvents.length && (
                <p className="text-xs text-muted-foreground py-3">Free day. Click “New event” to schedule.</p>
              )}
            </div>
          </div>

          <div className="form-panel mb-0">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <GraduationCap size={13} />
              Upcoming & Deadlines
            </h2>
            <div className="space-y-2">
              {upcomingEvents.map(ev => (
                <div key={ev.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 last:border-b-0">
                  <div className="min-w-0">
                    <div className="text-xs truncate">{ev.title}</div>
                    <div className="text-[10px] text-muted-foreground">{formatShortDate(ev.date)} · {ev.category}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{ev.startTime}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
