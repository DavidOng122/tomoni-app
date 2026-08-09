"use client";

import React, { createContext, useState, ReactNode } from 'react';
import { FixedPlanDraft } from '../types';
import { ProfileDraft } from '@/features/profiles/types';

export interface OnboardingScheduleContextType {
  schedules: FixedPlanDraft[];
  editingScheduleId: string | null;
  addSchedule: (draft: Omit<FixedPlanDraft, 'clientId'>) => void;
  updateSchedule: (clientId: string, draft: Omit<FixedPlanDraft, 'clientId'>) => void;
  deleteSchedule: (clientId: string) => void;
  beginEditing: (clientId: string) => void;
  clearEditing: () => void;
  profileDraft: ProfileDraft;
  setProfileDraft: React.Dispatch<React.SetStateAction<ProfileDraft>>;
}

export const OnboardingScheduleContext = createContext<OnboardingScheduleContextType | null>(null);

export const OnboardingScheduleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schedules, setSchedules] = useState<FixedPlanDraft[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    nickname: '',
    gender: null,
    ageRange: null,
    avatarUrl: null,
    tags: [],
    bio: '',
  });

  const addSchedule = (draft: Omit<FixedPlanDraft, 'clientId'>) => {
    setSchedules((current) => [
      ...current,
      { ...draft, clientId: crypto.randomUUID() },
    ]);
  };

  const updateSchedule = (clientId: string, draft: Omit<FixedPlanDraft, 'clientId'>) => {
    setSchedules((current) =>
      current.map((item) =>
        item.clientId === clientId ? { ...draft, clientId } : item
      )
    );
  };

  const deleteSchedule = (clientId: string) => {
    setSchedules((current) => current.filter((item) => item.clientId !== clientId));
  };

  const beginEditing = (clientId: string) => {
    setEditingScheduleId(clientId);
  };

  const clearEditing = () => {
    setEditingScheduleId(null);
  };

  return (
    <OnboardingScheduleContext.Provider
      value={{
        schedules,
        editingScheduleId,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        beginEditing,
        clearEditing,
        profileDraft,
        setProfileDraft,
      }}
    >
      {children}
    </OnboardingScheduleContext.Provider>
  );
};
