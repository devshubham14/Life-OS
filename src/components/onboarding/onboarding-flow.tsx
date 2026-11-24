import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  GraduationCap,
  Moon,
  NotebookPen,
  Sparkles,
  Sprout,
  Sun,
  Timer,
  Wallet,
} from 'lucide-react';
import { BrandMark } from '@/components/desktop/app-icon';
import { Button } from '@/components/ui/button';
import type { Preferences } from '@/types/desktop';

const WORKSPACE_MODULES = [
  { name: 'Tasks', icon: CheckCheck, tone: 'blue', note: 'Priorities & boards' },
  { name: 'Study Planner', icon: GraduationCap, tone: 'violet', note: 'Subjects & exams' },
  { name: 'Expenses', icon: Wallet, tone: 'mint', note: 'Budgets & cashflow' },
  { name: 'Habits', icon: Sprout, tone: 'mint', note: 'Daily consistency' },
  { name: 'Calendar', icon: CalendarDays, tone: 'rose', note: 'Schedule & events' },
  { name: 'AI Assistant', icon: Sparkles, tone: 'violet', note: 'Workspace insights' },
  { name: 'Notes', icon: NotebookPen, tone: 'yellow', note: 'Focused writing' },
  { name: 'Focus', icon: Timer, tone: 'violet', note: 'Deep work timer' },
  { name: 'Analytics', icon: ChartNoAxesCombined, tone: 'blue', note: 'Personal trends' },
];

const PURPOSES = [
  'Daily productivity',
  'Study & academics',
  'Habits & routines',
  'All-in-one workspace',
];

export interface OnboardingResult {
  name: string;
  theme: Preferences['theme'];
  purpose: string;
}

export function OnboardingFlow({
  onComplete,
}: {
  onComplete: (result: OnboardingResult) => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState<Preferences['theme']>('dark');
  const [purpose, setPurpose] = useState(PURPOSES[3] ?? 'All-in-one workspace');

  const finish = () => {
    onComplete({
      name: name.trim(),
      theme,
      purpose,
    });
  };

  return (
    <div className={`onboarding-shell ${theme === 'light' ? 'light-theme' : 'dark'}`}>
      <img
        className="onboarding-backdrop"
        src="/images/alpine-twilight.png"
        alt=""
        aria-hidden="true"
      />
      <div className="onboarding-scrim" aria-hidden="true" />

      <header className="onboarding-header">
        <div className="brand">
          <BrandMark />
          <span>LIFEOS</span>
        </div>
        <div className="onboarding-dots" aria-label={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map(idx => (
            <span
              key={idx}
              className={`onboarding-dot ${idx === step ? 'active' : idx < step ? 'done' : ''}`}
            />
          ))}
        </div>
      </header>

      <main className="onboarding-stage">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section
              key="welcome"
              className="onboarding-panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="onboarding-badge">
                <BrandMark />
                <span>PERSONAL WORKSPACE</span>
              </div>
              <h1 className="onboarding-title">Your life. One workspace.</h1>
              <p className="onboarding-copy">
                Everything you need to organize, understand and improve your everyday life.
              </p>
              <div className="onboarding-actions">
                <Button size="lg" className="px-6" onClick={() => setStep(1)}>
                  Get started
                  <ArrowRight size={15} />
                </Button>
                <Button variant="ghost" size="lg" onClick={finish}>
                  Skip introduction
                </Button>
              </div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="workspace"
              className="onboarding-panel wide"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="onboarding-kicker">YOUR WORKSPACE</span>
              <h2 className="onboarding-subtitle-heading">Nine integrated tools, one calm desktop.</h2>
              <div className="onboarding-modules-grid">
                {WORKSPACE_MODULES.map((mod, idx) => {
                  const Icon = mod.icon;
                  return (
                    <motion.div
                      key={mod.name}
                      className="onboarding-module-item"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.22 }}
                    >
                      <span className={`app-icon small ${mod.tone}`}>
                        <Icon />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground">{mod.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{mod.note}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="onboarding-actions">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button onClick={() => setStep(2)}>
                  Continue
                  <ArrowRight size={14} />
                </Button>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="personalization"
              className="onboarding-panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="onboarding-kicker">PERSONALIZATION</span>
              <h2 className="onboarding-subtitle-heading">Make this space feel like yours.</h2>

              <div className="onboarding-form">
                <label className="block text-left">
                  <span className="field-label">Display name (optional)</span>
                  <input
                    className="field w-full"
                    placeholder="How should LIFEOS greet you?"
                    value={name}
                    maxLength={32}
                    onChange={e => setName(e.target.value)}
                  />
                </label>

                <div className="text-left">
                  <span className="field-label">Preferred theme</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      className={`onboarding-choice ${theme === 'dark' ? 'selected' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      <Moon size={14} />
                      <span>Spatial Dark</span>
                    </button>
                    <button
                      type="button"
                      className={`onboarding-choice ${theme === 'light' ? 'selected' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      <Sun size={14} />
                      <span>Light</span>
                    </button>
                  </div>
                </div>

                <div className="text-left">
                  <span className="field-label">Main focus</span>
                  <div className="grid grid-cols-2 gap-2">
                    {PURPOSES.map(item => (
                      <button
                        key={item}
                        type="button"
                        className={`onboarding-choice compact ${purpose === item ? 'selected' : ''}`}
                        onClick={() => setPurpose(item)}
                      >
                        {purpose === item && <Check size={12} className="text-primary shrink-0" />}
                        <span className="truncate">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="onboarding-actions">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  Skip preferences
                </Button>
                <Button onClick={() => setStep(3)}>
                  Continue
                  <ArrowRight size={14} />
                </Button>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="ready"
              className="onboarding-panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="onboarding-ready-mark">
                <Check size={20} />
              </div>
              <h1 className="onboarding-title">Your space is ready.</h1>
              <p className="onboarding-copy">A little better, every day.</p>
              <div className="onboarding-actions">
                <Button size="lg" className="px-7" onClick={finish}>
                  Enter LIFEOS
                  <ArrowRight size={15} />
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
