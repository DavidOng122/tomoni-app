'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useRouter } from 'next/navigation';
import { DiscoverRecommendation, MatchReasonCode } from '@/features/discover/types';

interface ScheduledPeopleViewProps {
  plan: any; // Using any for plan to keep MVP simple, could type strictly
  recommendations: DiscoverRecommendation[];
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

const MatchReasonTag = ({ tagCode }: { tagCode: string }) => {
  const style = getTagStyle(tagCode);
  return (
    <span
      style={{
        fontSize: '9px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontWeight: 500,
        backgroundColor: style.background,
        color: style.color,
      }}
    >
      {matchReasonLabels[tagCode as MatchReasonCode] || tagCode}
    </span>
  );
};

export const ScheduledPeopleView: React.FC<ScheduledPeopleViewProps> = ({ plan, recommendations }) => {
  const router = useRouter();
  
  // Manage invite states locally: {[personId]: isInviting (boolean) | 'invited' etc.}
  const [inviteStates, setInviteStates] = useState<Record<string, boolean>>({});

  const handleBack = () => {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push('/discover');
    }
  };

  const handleInvite = (personId: string) => {
    // Mock invite action for MVP
    setInviteStates((prev) => ({ ...prev, [personId]: true }));
  };

  const formatDays = (days: string[]) => {
    const dayMap: Record<string, string> = {
      mon: '月曜', tue: '火曜', wed: '水曜', thu: '木曜', fri: '金曜', sat: '土曜', sun: '日曜'
    };
    return days.map(d => dayMap[d] || d).join('・');
  };

  return (
    <PageContainer bottomInset="none">
      <div style={{ padding: '16px 0 32px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
          <button 
            onClick={handleBack}
            className="hoverable"
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              border: '1px solid var(--color-divider)', 
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 500, margin: 0, lineHeight: '28px' }}>
            一緒に活動に行けそうな人
          </h1>
        </div>

        {/* Fixed Schedule Summary Context */}
        <div style={{ 
          background: '#FFF5F1', 
          borderRadius: '16px', 
          padding: '16px', 
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF8861', fontWeight: 600, fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            固定予定
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formatDays(plan.days_of_week)} {plan.start_time.substring(0, 5)}ごろ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {plan.place_name}
            </div>
          </div>
        </div>

        {/* Recommended People List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          {recommendations.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#666', background: '#FAFAFA', borderRadius: '16px', border: '1px solid #EAEAEA' }}>
              現在おすすめできるユーザーがいません。<br/>もう少しお待ちください。
            </div>
          ) : (
            recommendations.map((person) => {
              const isInviting = inviteStates[person.candidateId];

              return (
                <div key={person.candidateId} style={{
                  background: '#FAFAFA',
                  border: '1px solid #EAEAEA',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {/* Avatar */}
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#eaeaea' }}>
                    {person.profile.avatarUrl ? (
                      <img src={person.profile.avatarUrl} alt={person.profile.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                  </div>

                  {/* Person Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {person.profile.nickname}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {person.match.reasons.map(reasonCode => (
                        <MatchReasonTag key={reasonCode} tagCode={reasonCode} />
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#666' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {person.match.candidateStartTime}ごろ
                    </div>
                  </div>

                  {/* Invite Button */}
                  <div style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => handleInvite(person.candidateId)}
                      style={{
                        background: isInviting ? '#f0f0f0' : '#fff',
                        border: '1px solid #dcdcdc',
                        borderRadius: '8px',
                        height: '34px',
                        padding: '0 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isInviting ? '#666' : '#333',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isInviting ? '招待内容を確認' : '同行に誘う'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageContainer>
  );
};
