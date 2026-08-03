'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { FixedActionArea } from '@/components/layout/FixedActionArea';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ChatLayout } from '@/components/layout/ChatLayout';

export default function MobileFoundationDemo() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const navItems = [
    { label: 'Home', icon: <span>🏠</span>, isActive: activeTab === 'home', onClick: () => setActiveTab('home') },
    { label: 'Chat', icon: <span>💬</span>, isActive: activeTab === 'chat', onClick: () => setActiveTab('chat') },
    { label: 'Profile', icon: <span>👤</span>, isActive: activeTab === 'profile', onClick: () => setActiveTab('profile') },
  ];

  if (activeTab === 'chat') {
    return (
      <ChatLayout
        header={<MobileHeader title="Chat Demo" leftElement={<Button variant="ghost" onClick={() => setActiveTab('home')}>← Back</Button>} />}
        messageList={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{ padding: '12px', background: i % 2 === 0 ? 'var(--color-surface-hover)' : 'var(--color-primary)', color: i % 2 === 0 ? 'inherit' : '#fff', borderRadius: '8px', alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                Message {i + 1}
              </div>
            ))}
          </div>
        }
        inputArea={
          <div style={{ padding: '12px var(--page-padding-x)', display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="Type a message..." style={{ flex: 1, padding: '12px', borderRadius: '24px', border: '1px solid var(--color-divider)', outline: 'none' }} />
            <Button variant="primary">Send</Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      <MobileHeader title="Mobile Foundation" leftElement={<span style={{ padding: '8px' }}>←</span>} />
      
      <PageContainer bottomInset="nav">
        <div style={{ padding: '24px 0' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Foundation Test (iPhone 17 Base)</h2>
          <p style={{ marginBottom: '24px', lineHeight: 1.5, color: 'var(--color-text)' }}>
            This page tests the safe area insets, max-width layout, and the various sticky components.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Button variant="primary" fullWidth onClick={() => setIsSheetOpen(true)}>
              Open Bottom Sheet
            </Button>
            <Button variant="secondary" fullWidth>
              Secondary Button
            </Button>
            <Button variant="ghost" fullWidth>
              Ghost Button
            </Button>
          </div>
          
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} style={{ padding: '16px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px' }}>
                Scroll Item {i + 1}
              </div>
            ))}
          </div>
        </div>
      </PageContainer>

      {/* For demo purposes, we show FixedActionArea over BottomNavigation here. In real apps, they are usually mutually exclusive on a single page, but we can demonstrate safe areas. */}
      {/* Wait, if we use both, it might look messy. Let's comment out FixedActionArea or conditionally show it. */}
      
      <BottomNavigation items={navItems} />

      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Sample Bottom Sheet"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ lineHeight: 1.5 }}>
            This sheet can take up to 90dvh. It should respect the bottom safe area.
          </p>
          <Button variant="primary" fullWidth onClick={() => setIsSheetOpen(false)}>
            Confirm & Close
          </Button>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ padding: '16px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px' }}>
              Sheet Item {i + 1}
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
