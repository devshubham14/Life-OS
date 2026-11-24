import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  localAuth,
  type LocalSession,
  type OnboardingState,
} from '@/services/local-auth';
import { repository } from '@/services/local-repository';

interface AuthSessionContextValue {
  ready: boolean;
  onboarding: OnboardingState;
  session: LocalSession | null;
  hasProfiles: boolean;
  completeOnboarding: (purpose?: string) => void;
  signUp: (input: { fullName: string; email: string; password: string; remember: boolean }) => Promise<LocalSession>;
  signIn: (input: { email: string; password: string; remember: boolean }) => Promise<LocalSession>;
  signOut: () => void;
  clearWorkspaceAndReset: () => void;
}

const AuthContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingState>({ completed: false });
  const [session, setSession] = useState<LocalSession | null>(null);
  const [hasProfiles, setHasProfiles] = useState(false);

  useEffect(() => {
    setOnboarding(localAuth.getOnboarding());
    setSession(localAuth.getSession());
    setHasProfiles(localAuth.hasAnyProfile());
    setReady(true);
  }, []);

  const completeOnboarding = (purpose?: string) => {
    setOnboarding(localAuth.completeOnboarding(purpose));
  };

  const signUp = async (input: { fullName: string; email: string; password: string; remember: boolean }) => {
    const nextSession = await localAuth.signUp(input);
    setSession(nextSession);
    setHasProfiles(true);
    return nextSession;
  };

  const signIn = async (input: { email: string; password: string; remember: boolean }) => {
    const nextSession = await localAuth.signIn(input);
    setSession(nextSession);
    return nextSession;
  };

  const signOut = () => {
    localAuth.signOut();
    setSession(null);
  };

  const clearWorkspaceAndReset = () => {
    repository.clearAll();
    localAuth.clearAll();
    setSession(null);
    setHasProfiles(false);
    setOnboarding({ completed: false });
  };

  return (
    <AuthContext.Provider
      value={{
        ready,
        onboarding,
        session,
        hasProfiles,
        completeOnboarding,
        signUp,
        signIn,
        signOut,
        clearWorkspaceAndReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useOptionalAuthSession() {
  return useContext(AuthContext);
}

export function useAuthSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthSessionProvider is required');
  return ctx;
}
