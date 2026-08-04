import React from 'react';
import { OnboardingScheduleProvider } from '@/features/fixed-schedules/onboarding/OnboardingScheduleProvider';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingScheduleProvider>
      {children}
    </OnboardingScheduleProvider>
  );
}
