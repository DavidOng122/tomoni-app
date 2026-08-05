import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { ProfileOnboardingView } from '@/features/profiles/components/ProfileOnboardingView';

export default function ProfileOnboardingPage() {
  return (
    <AppShell>
      <PageContainer bottomInset="action">
        <ProfileOnboardingView />
      </PageContainer>
    </AppShell>
  );
}
