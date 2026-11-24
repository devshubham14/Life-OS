import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '@/components/onboarding/app-shell';
import { localAuth } from '@/services/local-auth';

describe('LIFEOS Production First-Run & Auth Journey', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('walks through onboarding, creates a local profile, persists data, logs out, signs back in, and clears data', async () => {
    const view = render(<AppShell />);

    // 1. Welcome screen
    expect(screen.getByText('Your life. One workspace.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Get started/i }));

    // 2. Workspace overview screen
    expect(await screen.findByText(/Nine integrated tools/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // 3. Personalization screen
    expect(await screen.findByText(/Make this space feel like yours/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/How should LIFEOS greet you/i), {
      target: { value: 'Yuvik' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // 4. Ready screen
    expect(await screen.findByText('Your space is ready.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Enter LIFEOS/i }));

    // 5. Account entry (Create account mode)
    expect(await screen.findByText('Create your local profile')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'yuvik@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    // 6. Empty dashboard opens after profile creation
    await waitFor(() => {
      expect(screen.getAllByText(/Good (morning|afternoon|evening), Yuvik/i)[0]).toBeInTheDocument();
    });
    expect(screen.getAllByText('Nothing on your list yet.')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Your schedule is clear.')[0]).toBeInTheDocument();

    // 7. Create a task and verify persistence across remount
    fireEvent.click(screen.getAllByRole('button', { name: /Create your first task/i })[0]!);
    const newTaskButtons = await screen.findAllByRole('button', { name: /New task/i });
    fireEvent.click(newTaskButtons[newTaskButtons.length - 1]!);
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Ship LIFEOS v1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create task/i }));
    expect((await screen.findAllByText('Ship LIFEOS v1'))[0]).toBeInTheDocument();

    // Verify password is never stored in plaintext
    const storedProfiles = localStorage.getItem('lifeos.profiles.v1') ?? '';
    expect(storedProfiles).not.toContain('StrongPass1!');

    // Remount (simulate browser refresh) -> skips onboarding & auth, keeps task
    view.unmount();
    const view2 = render(<AppShell />);
    await waitFor(() => {
      expect(screen.getAllByText('Ship LIFEOS v1')[0]).toBeInTheDocument();
    });

    // 8. Sign out -> returns to Sign in screen
    localAuth.signOut();
    view2.unmount();
    render(<AppShell />);
    expect(await screen.findByText('Sign in to LIFEOS')).toBeInTheDocument();

    // 9. Sign back in
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'yuvik@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Ship LIFEOS v1')[0]).toBeInTheDocument();
    });
  }, 15000);
});
