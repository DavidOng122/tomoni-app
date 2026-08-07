import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { WelcomeAuthView } from '@/features/auth/components/WelcomeAuthView';
import { getAuthDestination } from '@/features/auth/server/getAuthDestination';
import { redirect } from 'next/navigation';

export default async function WelcomePage() {
  const destination = await getAuthDestination();
  
  if (destination !== '/welcome') {
    redirect(destination);
  }

  return (
    <AppShell>
      <WelcomeAuthView />
    </AppShell>
  );
}
