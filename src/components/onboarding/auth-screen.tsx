import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { BrandMark } from '@/components/desktop/app-icon';
import { Button } from '@/components/ui/button';
import { evaluatePasswordStrength } from '@/services/local-auth';

interface AuthScreenProps {
  initialMode: 'signin' | 'signup';
  initialName?: string;
  onSignIn: (input: { email: string; password: string; remember: boolean }) => Promise<void>;
  onSignUp: (input: { fullName: string; email: string; password: string; remember: boolean }) => Promise<void>;
}

export function AuthScreen({
  initialMode,
  initialName = '',
  onSignIn,
  onSignUp,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = evaluatePasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await onSignUp({ fullName, email, password, remember });
      } else {
        await onSignIn({ email, password, remember });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="onboarding-shell dark">
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
        <span className="text-[11px] text-muted-foreground">Local workspace profile</span>
      </header>

      <main className="onboarding-stage">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {mode === 'signin' ? 'Sign in to LIFEOS' : 'Create your local profile'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'signin'
                ? 'Open your workspace stored on this device.'
                : 'Set up a personal profile on this browser to get started.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === 'signup' && (
              <label className="block">
                <span className="field-label">Full name</span>
                <input
                  type="text"
                  className="field w-full"
                  placeholder="Alex Rivera"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </label>
            )}

            <label className="block">
              <span className="field-label">Email address</span>
              <input
                type="email"
                className="field w-full"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="field w-full pr-10"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(s => !s)}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>

            {mode === 'signup' && password.length > 0 && (
              <div className="space-y-1" aria-live="polite">
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map(level => (
                    <span
                      key={level}
                      className={`h-1 rounded-full transition-colors ${
                        strength.score >= level
                          ? strength.score <= 1
                            ? 'bg-destructive'
                            : strength.score === 2
                              ? 'bg-warning'
                              : 'bg-success'
                          : 'bg-accent'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Password strength: <span className="text-foreground">{strength.label}</span>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <label className="block">
                <span className="field-label">Confirm password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="field w-full"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
            )}

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              <span>Remember this device</span>
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-10 mt-1" disabled={submitting}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {mode === 'signin' ? 'Continue' : 'Create account'}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-border/70 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {mode === 'signin' ? 'New to LIFEOS?' : 'Already have a local profile?'}
            </span>
            <button
              type="button"
              className="text-primary hover:underline font-medium cursor-pointer"
              onClick={() => {
                setError(null);
                setMode(m => (m === 'signin' ? 'signup' : 'signin'));
              }}
            >
              {mode === 'signin' ? 'Create account' : 'Sign in'}
            </button>
          </div>

          <div className="auth-local-notice">
            <Info size={12} className="shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              Local browser profile only — data and credentials are stored in this browser without an external authentication server.
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
