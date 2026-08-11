'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useRouter } from 'next/navigation';
import { DiscoverRecommendation, MatchReasonCode } from '@/features/discover/types';
import { Database } from '@/types/database.types';
import { formatEventDateTime } from '@/utils/dateFormatter';

type EventRow = Database['public']['Tables']['events']['Row'];

interface DiscoverViewProps {
  recommendations: DiscoverRecommendation[];
  hasPlans: boolean;
  events: EventRow[];
}

const matchReasonLabels: Record<MatchReasonCode, string> = {
  same_activity: '同じ活動',
  same_time: '同じ時間ごろ',
  nearby: '近くに住んでいる',
  shared_day: '同じ曜日'
};

const getTagStyle = (tagCode: string) => {
  switch (tagCode) {
    case 'same_activity':
      return { background: '#FFF3CD', color: '#8B6914' };
    case 'same_time':
      return { background: '#F8D7DA', color: '#721C24' };
    case 'nearby':
      return { background: '#D4EDDA', color: '#155724' };
    case 'shared_day':
      return { background: '#D1ECF1', color: '#0C6370' };
    default:
      return { background: '#f0f4f8', color: '#334155' };
  }
};


export const DiscoverView: React.FC<DiscoverViewProps> = ({ recommendations, hasPlans, events }) => {
  const router = useRouter();

  const navItems = [
    { 
      label: 'みつける', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>, 
      isActive: true,
      activeColor: '#FF8861',
      activeIconBgColor: '#E8E8E8',
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
      onClick: () => router.push('/mypage') 
    },
  ];

  // Keep Phase 2C Event & connection mock untouched as requested
  const mockCurrentConnection = {
    name: 'Miki',
    verified: true,
    eventTitle: '公園で朝の散歩会',
    dateTime: '8月17日（月）8:00〜10:00',
    location: '世田谷公園',
    avatarUrl: 'https://i.pravatar.cc/150?u=miki'
  };


  return (
    <>
      <PageContainer bottomInset="nav">
        {/* Top-right Action Group */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0 0 0', gap: '16px' }}>
          <button 
            onClick={() => router.push('/events/create')}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333'
            }}
            aria-label="Create Public Event"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          <button 
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333'
            }}
            aria-label="Notifications"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </button>
        </div>

        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* 1. Current Connection Card (Mock) */}
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

          {/* 2. Schedule Connection Section (Real Integration) */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>予定からつながる</h2>
            </div>

            {!hasPlans ? (
              <div style={{ 
                padding: '24px', 
                background: '#f9f9f9', 
                borderRadius: '12px', 
                textAlign: 'center',
                border: '1px solid var(--color-divider)' 
              }}>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: 1.5 }}>
                  固定予定を追加すると、<br/>近くで同じ活動をしている人を<br/>見つけられます
                </p>
                <button 
                  onClick={() => router.push('/mypage')}
                  style={{
                    background: '#FF8861',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  固定予定を追加
                </button>
              </div>
            ) : recommendations.length === 0 ? (
              <div style={{ 
                padding: '24px', 
                background: '#f9f9f9', 
                borderRadius: '12px', 
                textAlign: 'center',
                border: '1px solid var(--color-divider)' 
              }}>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  現在おすすめできるユーザーがいません。<br/>もう少しお待ちください。
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', margin: '0 calc(-1 * var(--page-padding-x))', padding: '0 var(--page-padding-x) 8px var(--page-padding-x)' }}>
                {recommendations.map((rec) => (
                  <div key={rec.candidateId} 
                    onClick={() => router.push(`/discover/schedules/${rec.match.myPlanId}/people`)}
                    className="hoverable"
                    style={{ 
                      flex: '0 0 160px', 
                      background: '#fff', 
                      borderRadius: '12px', 
                      padding: '12px', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      border: '1px solid var(--color-divider)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', marginBottom: '8px', background: '#eaeaea' }}>
                        {rec.profile.avatarUrl ? (
                          <img src={rec.profile.avatarUrl} alt={rec.profile.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : null}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{rec.profile.nickname}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {rec.match.reasons.slice(0, 2).map((reasonCode) => {
                        const style = getTagStyle(reasonCode);
                        return (
                          <span key={reasonCode} style={{ 
                            fontSize: '9px', 
                            background: style.background, 
                            color: style.color, 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontWeight: 500
                          }}>
                            {matchReasonLabels[reasonCode] || reasonCode}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. Local Events Section (Mock) */}
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
              {events.length === 0 ? (
                <div style={{ 
                  padding: '24px', 
                  background: '#f9f9f9', 
                  borderRadius: '12px', 
                  textAlign: 'center',
                  border: '1px solid var(--color-divider)' 
                }}>
                  <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                    現在予定されているイベントはありません。
                  </p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.event_id} 
                    onClick={() => router.push(`/events/${event.event_id}`)}
                    className="hoverable"
                    style={{ 
                    background: '#fff', 
                    borderRadius: '16px', 
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    border: '1px solid var(--color-divider)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ width: '100%', height: '140px', position: 'relative', background: '#eaeaea' }}>
                      {event.poster_url ? (
                        <img src={event.poster_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0' }}>{event.title}</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#444' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {formatEventDateTime(event.start_at, event.end_at)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {event.place_name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
};
