'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const mockCurrentConnection = {
  name: 'Miki',
  verified: true,
  eventTitle: '公園で朝の散歩会',
  dateTime: '8月17日（月）8:00〜10:00',
  location: '世田谷公園',
  avatarUrl: 'https://i.pravatar.cc/150?u=miki'
};

const mockRecommendedPeople = [
  { name: 'Juliaさん', avatarUrl: 'https://i.pravatar.cc/150?u=julia', tags: ['同じ時間ごろ', '近くに住んでいる'] },
  { name: 'Meganさん', avatarUrl: 'https://i.pravatar.cc/150?u=megan', tags: ['初参加', '朝の散歩が好き'] },
  { name: 'Soraさん', avatarUrl: 'https://i.pravatar.cc/150?u=sora', tags: ['同じ時間ごろ'] },
];

const mockLocalEvents = [
  {
    id: 1,
    title: '公園で朝の散歩会',
    dateTime: '8月17日（月）8:00〜10:00',
    location: '世田谷公園',
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=800&auto=format&fit=crop',
    organizerAvatar: 'https://i.pravatar.cc/150?u=miki',
    participants: [
      'https://i.pravatar.cc/150?u=1',
      'https://i.pravatar.cc/150?u=2',
      'https://i.pravatar.cc/150?u=3',
    ],
    additionalParticipants: 7
  }
];

export default function DiscoverPage() {
  const router = useRouter();

  const navItems = [
    { 
      label: 'みつける', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>, 
      isActive: true, 
      onClick: () => {} 
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
      isActive: false, 
      onClick: () => {} 
    },
  ];

  return (
    <>
      <PageContainer bottomInset="nav">
        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* 1. Current Connection Card */}
          <section>
            <div style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              border: '1px solid var(--color-divider)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden' }}>
                  <img src={mockCurrentConnection.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>{mockCurrentConnection.name}</h2>
                    {mockCurrentConnection.verified && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#007aff" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12.5L10.5 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#666' }}>確認済み</span>
                </div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>
                {mockCurrentConnection.eventTitle}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {mockCurrentConnection.dateTime}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {mockCurrentConnection.location}
                </div>
              </div>
            </div>
          </section>

          {/* 2. Schedule Connection Section */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>予定からつながる</h2>
              <button 
                onClick={() => router.push('/discover/schedules/mock-morning-walk/people')}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', padding: 0, cursor: 'pointer', fontWeight: 500 }}
              >
                すべて見る
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 4px 0' }}>一緒に朝の散歩に行けそうな人</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>固定予定：毎週火曜 9:00ごろ</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', margin: '0 calc(-1 * var(--page-padding-x))', padding: '0 var(--page-padding-x) 8px var(--page-padding-x)' }}>
              {mockRecommendedPeople.map((person, index) => (
                <div key={index} style={{ 
                  flex: '0 0 160px', 
                  background: '#fff', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid var(--color-divider)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', marginBottom: '8px' }}>
                      <img src={person.avatarUrl} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{person.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {person.tags.map((tag, tIndex) => (
                      <span key={tIndex} style={{ 
                        fontSize: '9px', 
                        background: '#f0f4f8', 
                        color: '#334155', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        textAlign: 'center',
                        fontWeight: 500
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Local Events Section */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '2px' }}>世田谷区</span>
                <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>地域イベント</h2>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', padding: 0, cursor: 'pointer', fontWeight: 500, marginTop: '4px' }}>
                すべて見る
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>今日</span>
              <span style={{ fontSize: '13px', color: '#999' }}>土曜日</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mockLocalEvents.map((event) => (
                <div key={event.id} style={{ 
                  background: '#fff', 
                  borderRadius: '16px', 
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  border: '1px solid var(--color-divider)'
                }}>
                  <div style={{ width: '100%', height: '140px', position: 'relative' }}>
                    <img src={event.imageUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '12px', left: '12px', width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff' }}>
                      <img src={event.organizerAvatar} alt="Organizer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0' }}>{event.title}</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#444', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {event.dateTime}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {event.location}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ display: 'flex' }}>
                        {event.participants.map((participant, pIndex) => (
                          <div key={pIndex} style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', marginLeft: pIndex > 0 ? '-8px' : 0 }}>
                            <img src={participant} alt={`Participant ${pIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                      {event.additionalParticipants > 0 && (
                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                          +{event.additionalParticipants}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </PageContainer>

      {/* 4. Map Floating Button */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--nav-height) + var(--safe-area-bottom) + 24px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-index-action)'
      }}>
        <button 
          onClick={() => {}} 
          className="hoverable"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FF8861',
            color: '#fff',
            border: 'none',
            borderRadius: '24px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(255, 136, 97, 0.4)',
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          地図
        </button>
      </div>

      <BottomNavigation items={navItems} />
    </>
  );
}
