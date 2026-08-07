'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useRouter } from 'next/navigation';

export default function MyPage() {
  const router = useRouter();

  const navItems = [
    { 
      label: 'みつける', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>, 
      isActive: false, 
      onClick: () => router.push('/discover') 
    },
    { 
      label: 'つながり', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, 
      isActive: false, 
      onClick: () => router.push('/connections') 
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

  const avatars = [
    'https://i.pravatar.cc/150?u=1',
    'https://i.pravatar.cc/150?u=2',
    'https://i.pravatar.cc/150?u=3',
  ];

  return (
    <div style={{ backgroundColor: '#FCFCFC', minHeight: '100dvh' }}>
      <PageContainer bottomInset="nav">
        <div style={{ padding: '16px 0 40px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>マイページ</h1>
            <button 
              onClick={() => {}}
              className="hoverable"
              style={{
                position: 'absolute',
                right: '4px',
                width: '37px',
                height: '37px',
                borderRadius: '38px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>

          {/* Profile Area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <div style={{ width: '111px', height: '111px', borderRadius: '50%', overflow: 'hidden', background: '#e0e0e0' }}>
                <img src="https://i.pravatar.cc/150?u=mika" alt="Mika" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <button style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #EAEAEA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px 0', color: '#111' }}>Mika</h2>
            <div style={{ fontSize: '12px', fontWeight: 400, color: '#3F3F3F' }}>
              25 ~34歳 ❘ 世田谷区
            </div>
          </div>

          {/* Statistics Card */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{ 
              width: '100%',
              maxWidth: '357px',
              background: '#FFFFFF',
              border: '1px solid #BEBDBD',
              borderRadius: '18px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <span style={{ fontSize: '20px', fontWeight: 600, color: '#111', lineHeight: 1.2 }}>2</span>
                <span style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>固定予定</span>
              </div>
              <div style={{ width: '1px', height: '32px', background: '#EAEAEA' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <span style={{ fontSize: '20px', fontWeight: 600, color: '#111', lineHeight: 1.2 }}>3</span>
                <span style={{ fontSize: '14px', color: '#555', marginTop: '4px' }}>参加済み</span>
              </div>
              <div style={{ width: '1px', height: '32px', background: '#EAEAEA' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <span style={{ fontSize: '20px', fontWeight: 600, color: '#111', lineHeight: 1.2 }}>4</span>
                <span style={{ fontSize: '14px', color: '#555', marginTop: '4px' }}>つながり</span>
              </div>
            </div>
          </div>

          {/* 固定予定 Section */}
          <section style={{ marginBottom: '32px', padding: '0 8px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0', color: '#111' }}>固定予定</h3>
            
            <div style={{ 
              background: '#FFFFFF',
              border: '1px solid #EAEAEA',
              borderRadius: '16px',
              boxShadow: 'inset 0px 4px 11.6px rgba(0,0,0,0.08)',
              padding: '20px 24px',
              height: '123px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 400, color: '#101828', marginBottom: '12px' }}>
                散歩
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#2E2E2E' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF8861" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  火・木 8:00〜10:00
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#222222' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF8861" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  世田谷公園
                </div>
              </div>
            </div>

            <button 
              className="hoverable"
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#111'
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 400 }}>+</span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>別の固定予定を追加する</span>
            </button>
          </section>

          {/* つながり Section */}
          <section style={{ padding: '0 8px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0', color: '#111' }}>つながり</h3>
            
            <div 
              className="hoverable"
              style={{ 
                background: '#FFFFFF',
                border: '1px solid #E4E4E4',
                borderRadius: '17px',
                boxShadow: 'inset 2px 4px 10.6px rgba(0,0,0,0.10)',
                height: '80px',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#4F4E4E' }}>世田谷区</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#4F4E4E' }}>つながった人</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', marginRight: '12px' }}>
                  {avatars.map((avatar, index) => (
                    <div key={index} style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      border: '2px solid #FFFFFF',
                      marginLeft: index > 0 ? '-8px' : 0,
                      zIndex: avatars.length - index
                    }}>
                      <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: '#757575',
                    color: '#EBEBEB',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #FFFFFF',
                    marginLeft: '-8px',
                    zIndex: 0
                  }}>
                    +7
                  </div>
                </div>
                
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          </section>

        </div>
      </PageContainer>
      <BottomNavigation items={navItems} />
    </div>
  );
}
