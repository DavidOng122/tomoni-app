import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { WelcomeAuthView } from '@/features/auth/components/WelcomeAuthView';

export default function WelcomePage() {
  return (
    <AppShell>
      <WelcomeAuthView />
    </AppShell>
  );
}
