import { useState } from 'react';
import { LifeDesktop } from '@/components/desktop/desktop';
import { AuthSessionProvider, useAuthSession } from '@/stores/auth-session';
import { initialData, repository } from '@/services/local-repository';
import { AuthScreen } from './auth-screen';
import { OnboardingFlow, type OnboardingResult } from './onboarding-flow';

function AppGate() {
  const { ready, onboarding, session, hasProfiles, completeOnboarding, signUp, signIn } = useAuthSession();
  const [preferredName, setPreferredName] = useState('');

  if (!ready) {
    return <div className="onboarding-shell dark" aria-busy="true" />;
  }

  if (session) {
    return <LifeDesktop />;
  }

  if (!onboarding.completed) {
    const handleOnboardingComplete = (result: OnboardingResult) => {
      if (result.name) setPreferredName(result.name);
      const existing = repository.read() ?? initialData;
      repository.write({
        ...existing,
        preferences: {
          ...existing.preferences,
          ...(result.name ? { name: result.name } : {}),
          theme: result.theme,
        },
      });
      completeOnboarding(result.purpose);
    };

    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <AuthScreen
      initialMode={hasProfiles ? 'signin' : 'signup'}
      initialName={preferredName}
      onSignIn={async input => {
        const nextSession = await signIn(input);
        const existing = repository.read() ?? initialData;
        const firstName = nextSession.fullName.split(/\s+/)[0] || nextSession.fullName;
        if (existing.preferences.name === 'there' && firstName) {
          repository.write({
            ...existing,
            preferences: { ...existing.preferences, name: firstName },
          });
        }
      }}
      onSignUp={async input => {
        const nextSession = await signUp(input);
        const existing = repository.read() ?? initialData;
        const firstName = nextSession.fullName.split(/\s+/)[0] || nextSession.fullName;
        repository.write({
          ...existing,
          preferences: {
            ...existing.preferences,
            name: firstName || existing.preferences.name,
          },
        });
      }}
    />
  );
}

export function AppShell() {
  return (
    <AuthSessionProvider>
      <AppGate />
    </AuthSessionProvider>
  );
}
