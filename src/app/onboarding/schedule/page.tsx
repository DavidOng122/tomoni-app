import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { FixedScheduleOnboardingView } from '@/features/fixed-schedules/components/FixedScheduleOnboardingView';

export default function ScheduleOnboardingPage() {
  return (
    <AppShell>
      <PageContainer bottomInset="action">
        <FixedScheduleOnboardingView />
      </PageContainer>
    </AppShell>
  );
}
