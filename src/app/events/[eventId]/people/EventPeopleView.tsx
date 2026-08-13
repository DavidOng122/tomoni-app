'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageContainer } from '@/components/layout/PageContainer';
import { Database } from '@/types/database.types';

type EventRow = Database['public']['Tables']['events']['Row'];

interface Candidate {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  compatibility_label: string;
}

interface EventPeopleViewProps {
  event: EventRow;
  candidates: Candidate[];
}

export const EventPeopleView: React.FC<EventPeopleViewProps> = ({ event, candidates }) => {
  const router = useRouter();

  return (
    <PageContainer bottomInset="none">
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f3f4f6',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button 
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>一緒に行けそうな人</h1>
      </div>

      <div style={{ padding: '24px' }}>
        {candidates.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '64px', color: '#6b7280' }}>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>今のところ、近い時間に参加する人はいません</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {candidates.map((candidate) => (
              <div 
                key={candidate.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: '1px solid #f3f4f6',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {candidate.avatar_url ? (
                    <Image 
                      src={candidate.avatar_url} 
                      alt={candidate.nickname} 
                      fill 
                      style={{ objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', color: '#9ca3af'
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: '#111827', 
                    margin: '0 0 4px 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {candidate.nickname}さん
                  </h3>
                  <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    backgroundColor: candidate.compatibility_label === '同じ時間帯' ? '#eff6ff' : '#f9fafb',
                    color: candidate.compatibility_label === '同じ時間帯' ? '#2563eb' : '#4b5563',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {candidate.compatibility_label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
