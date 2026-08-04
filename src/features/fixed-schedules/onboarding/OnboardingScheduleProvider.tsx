"use client";

import React, { createContext, useState, ReactNode } from 'react';
import { FixedScheduleDraft, FixedScheduleDraftItem } from '../types';

export interface OnboardingScheduleContextType {
  schedules: FixedScheduleDraftItem[];
  editingScheduleId: string | null;
  addSchedule: (draft: FixedScheduleDraft) => void;
  updateSchedule: (clientId: string, draft: FixedScheduleDraft) => void;
  deleteSchedule: (clientId: string) => void;
  beginEditing: (clientId: string) => void;
  clearEditing: () => void;
}

export const OnboardingScheduleContext = createContext<OnboardingScheduleContextType | null>(null);

export const OnboardingScheduleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [schedules, setSchedules] = useState<FixedScheduleDraftItem[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const addSchedule = (draft: FixedScheduleDraft) => {
    setSchedules((current) => [
      ...current,
      { ...draft, clientId: crypto.randomUUID() },
    ]);
  };

  const updateSchedule = (clientId: string, draft: FixedScheduleDraft) => {
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
      }}
    >
      {children}
    </OnboardingScheduleContext.Provider>
  );
};
