'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

export default function Loading() {
  const navItems = [
    { 
      label: 'みつける', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>, 
      isActive: false, 
      onClick: () => {} 
    },
    { 
      label: 'つながり', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, 
      isActive: false, 
      onClick: () => {} 
    },
    { 
      label: 'マイページ', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, 
      isActive: true,
      activeColor: '#FF8861',
      activeIconBgColor: '#E8E8E8',
      onClick: () => {} 
    },
  ];

  return (
    <div style={{ backgroundColor: '#FCFCFC', minHeight: '100dvh' }}>
      <PageContainer bottomInset="nav">
        <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center', color: '#666' }}>
          読み込み中...
        </div>
      </PageContainer>
      <BottomNavigation items={navItems} />
    </div>
  );
}
