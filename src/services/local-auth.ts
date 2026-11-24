export interface LocalProfile {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface LocalSession {
  profileId: string;
  fullName: string;
  email: string;
  remember: boolean;
  signedInAt: string;
}

export interface OnboardingState {
  completed: boolean;
  purpose?: string;
  completedAt?: string;
}

const ONBOARDING_KEY = 'lifeos.onboarding.v1';
const PROFILES_KEY = 'lifeos.profiles.v1';
const SESSION_KEY = 'lifeos.session.v1';

function createSalt(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback hash for non-secure contexts where crypto.subtle is unavailable
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return `fnv-${(h1 >>> 0).toString(16)}`;
}

export function evaluatePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
} {
  if (password.length < 6) return { score: 0, label: 'Too short' };
  let points = 1;
  if (password.length >= 10) points++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) points++;
  const score = Math.min(4, points) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  return { score, label: labels[score] };
}

function readProfiles(): LocalProfile[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? (raw as LocalProfile[]) : [];
  } catch {
    return [];
  }
}

function writeProfiles(profiles: LocalProfile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    throw new Error('Unable to save local profile. Browser storage may be full or disabled.');
  }
}

function writeSession(session: LocalSession): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    const target = session.remember ? localStorage : sessionStorage;
    target.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    throw new Error('Unable to save local session.');
  }
}

export const localAuth = {
  getOnboarding(): OnboardingState {
    try {
      const raw = JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? 'null') as Partial<OnboardingState> | null;
      if (!raw || typeof raw !== 'object') return { completed: false };
      return {
        completed: Boolean(raw.completed),
        ...(typeof raw.purpose === 'string' ? { purpose: raw.purpose } : {}),
        ...(typeof raw.completedAt === 'string' ? { completedAt: raw.completedAt } : {}),
      };
    } catch {
      return { completed: false };
    }
  },

  completeOnboarding(purpose?: string): OnboardingState {
    const next: OnboardingState = {
      completed: true,
      completedAt: new Date().toISOString(),
      ...(purpose ? { purpose } : {}),
    };
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    return next;
  },

  getSession(): LocalSession | null {
    try {
      const raw =
        sessionStorage.getItem(SESSION_KEY) ??
        localStorage.getItem(SESSION_KEY) ??
        'null';
      const parsed = JSON.parse(raw) as Partial<LocalSession> | null;
      if (!parsed || typeof parsed.profileId !== 'string' || typeof parsed.email !== 'string') {
        return null;
      }
      return {
        profileId: parsed.profileId,
        fullName: parsed.fullName ?? 'User',
        email: parsed.email,
        remember: Boolean(parsed.remember),
        signedInAt: parsed.signedInAt ?? new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  hasAnyProfile(): boolean {
    return readProfiles().length > 0;
  },

  async signUp(input: {
    fullName: string;
    email: string;
    password: string;
    remember: boolean;
  }): Promise<LocalSession> {
    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();
    if (!fullName) throw new Error('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
    if (input.password.length < 6) throw new Error('Password must be at least 6 characters.');

    const profiles = readProfiles();
    if (profiles.some(p => p.email === email)) {
      throw new Error('A local profile with this email already exists on this browser. Please sign in instead.');
    }

    const salt = createSalt();
    const passwordHash = await hashPassword(input.password, salt);
    const profile: LocalProfile = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prof-${Date.now()}`,
      fullName,
      email,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    writeProfiles([...profiles, profile]);

    const session: LocalSession = {
      profileId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      remember: input.remember,
      signedInAt: new Date().toISOString(),
    };
    writeSession(session);
    return session;
  },

  async signIn(input: {
    email: string;
    password: string;
    remember: boolean;
  }): Promise<LocalSession> {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
    if (!input.password) throw new Error('Please enter your password.');

    const profiles = readProfiles();
    const profile = profiles.find(p => p.email === email);
    if (!profile) {
      throw new Error('No local profile found for this email in this browser.');
    }

    const candidateHash = await hashPassword(input.password, profile.salt);
    if (candidateHash !== profile.passwordHash) {
      throw new Error('Incorrect password for this local profile.');
    }

    const session: LocalSession = {
      profileId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      remember: input.remember,
      signedInAt: new Date().toISOString(),
    };
    writeSession(session);
    return session;
  },

  signOut(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
      localStorage.removeItem(PROFILES_KEY);
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
  },
};
