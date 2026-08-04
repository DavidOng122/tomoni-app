import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { RegisteredSchedulesView } from '@/features/fixed-schedules/components/RegisteredSchedulesView';

export default function SchedulesPage() {
  return (
    <AppShell>
      <PageContainer bottomInset="action">
        <RegisteredSchedulesView />
      </PageContainer>
    </AppShell>
  );
}
