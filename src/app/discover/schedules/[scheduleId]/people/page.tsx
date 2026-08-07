'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useRouter } from 'next/navigation';

const mockSchedule = {
  id: 'mock-morning-walk',
  label: '固定予定',
  days: '毎週火曜',
  time: '9:00ごろ',
  location: '世田谷公園',
};

const mockPeople = [
  { id: 1, name: 'Juliaさん', avatarUrl: 'https://i.pravatar.cc/150?u=julia', tags: ['同じ時間ごろ', '近くに住んでいる'], timeMatch: '9:00ごろ' },
  { id: 2, name: 'Meganさん', avatarUrl: 'https://i.pravatar.cc/150?u=megan', tags: ['初参加', '朝の散歩が好き'], timeMatch: '9:00ごろ' },
  { id: 3, name: 'Soraさん', avatarUrl: 'https://i.pravatar.cc/150?u=sora', tags: ['同じ時間ごろ'], timeMatch: '9:00ごろ' },
  { id: 4, name: 'Kenさん', avatarUrl: 'https://i.pravatar.cc/150?u=ken', tags: ['朝の散歩が好き', '近くに住んでいる'], timeMatch: '9:00ごろ' },
  { id: 5, name: 'Sakiさん', avatarUrl: 'https://i.pravatar.cc/150?u=saki', tags: ['初参加'], timeMatch: '9:00ごろ' },
];

const getTagStyle = (tag: string) => {
  switch (tag) {
    case '初参加':
      return { background: '#FFF3CD', color: '#8B6914' };
    case '朝の散歩が好き':
      return { background: '#D1ECF1', color: '#0C6370' };
    case '近くに住んでいる':
      return { background: '#D4EDDA', color: '#155724' };
    case '同じ時間ごろ':
      return { background: '#F8D7DA', color: '#721C24' };
    default:
      return { background: '#f0f4f8', color: '#334155' };
  }
};

const MatchReasonTag = ({ tag }: { tag: string }) => {
  const style = getTagStyle(tag);
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
      {tag}
    </span>
  );
};

export default function ScheduledPeoplePage() {
  const router = useRouter();
  
  // Manage invite states locally: {[personId]: isInviting (boolean) | 'invited' etc.}
  const [inviteStates, setInviteStates] = useState<Record<number, boolean>>({});

  const handleBack = () => {
    // If router can't go back, next's router doesn't give a simple canGoBack.
    // In many cases, it's safer to check history length or fallback in global nav,
    // but a simple push is safe for now if back fails in standalone PWA, 
    // or just fallback in catch (though router.back doesn't throw).
    // We'll rely on native back if there's history, but since we are mocking, we can just push if we want to be safe.
    // Actually, fallback is better if we just do:
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push('/discover');
    }
  };

  const handleInvite = (personId: number) => {
    setInviteStates((prev) => ({ ...prev, [personId]: true }));
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
            一緒に朝の散歩に行けそうな人
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
            {mockSchedule.label}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {mockSchedule.days} {mockSchedule.time}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {mockSchedule.location}
            </div>
          </div>
        </div>

        {/* Recommended People List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          {mockPeople.map((person) => {
            const isInviting = inviteStates[person.id];

            return (
              <div key={person.id} style={{
                background: '#FAFAFA',
                border: '1px solid #EAEAEA',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {/* Avatar */}
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={person.avatarUrl} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                {/* Person Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {person.name}
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {person.tags.map(tag => (
                      <MatchReasonTag key={tag} tag={tag} />
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#666' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {person.timeMatch}
                  </div>
                </div>

                {/* Invite Button */}
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => handleInvite(person.id)}
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
          })}
        </div>
      </div>
    </PageContainer>
  );
}
