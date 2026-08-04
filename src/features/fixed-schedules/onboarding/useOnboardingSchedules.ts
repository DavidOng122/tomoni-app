import { useContext } from 'react';
import { OnboardingScheduleContext } from './OnboardingScheduleProvider';

export const useOnboardingSchedules = () => {
  const context = useContext(OnboardingScheduleContext);
  if (!context) {
    throw new Error('useOnboardingSchedules must be used within OnboardingScheduleProvider');
  }
  return context;
};
