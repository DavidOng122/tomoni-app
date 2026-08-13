'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { approveEventRequestAction, rejectEventRequestAction } from '@/app/actions/eventRequests';

interface RequestItem {
  participation_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string;
  requested_at: string;
}

interface RequestsViewProps {
  eventId: string;
  requests: RequestItem[];
}

export const RequestsView: React.FC<RequestsViewProps> = ({ eventId, requests }) => {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (participationId: string) => {
    if (processingId) return;
    setProcessingId(participationId);
    
    const res = await approveEventRequestAction(participationId);
    if (!res.success) {
      alert(res.error);
    }
    
    setProcessingId(null);
  };

  const handleReject = async (participationId: string) => {
    if (processingId) return;
    const confirm = window.confirm('このリクエストをお断りしますか？');
    if (!confirm) return;

    setProcessingId(participationId);
    
    const res = await rejectEventRequestAction(participationId);
    if (!res.success) {
      alert(res.error);
    }
    
    setProcessingId(null);
  };

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
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>参加リクエスト</h1>
      </div>

      <div style={{ padding: '24px' }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>
            現在のリクエストはありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {requests.map(req => (
              <div 
                key={req.participation_id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px', background: 'white', border: '1px solid #e5e7eb',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: '#f3f4f6', overflow: 'hidden', position: 'relative'
                  }}>
                    {req.avatar_url ? (
                      <img 
                        src={req.avatar_url} 
                        alt={req.nickname || 'User'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 500, fontSize: '15px' }}>
                    {req.nickname || 'ゲスト'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleReject(req.participation_id)}
                    disabled={processingId === req.participation_id}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      background: 'white', border: '1px solid #e5e7eb',
                      color: '#4b5563', fontSize: '13px', fontWeight: 500,
                      cursor: processingId === req.participation_id ? 'not-allowed' : 'pointer',
                      opacity: processingId === req.participation_id ? 0.5 : 1
                    }}
                  >
                    お断り
                  </button>
                  <button
                    onClick={() => handleApprove(req.participation_id)}
                    disabled={processingId === req.participation_id}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      background: 'black', border: 'none',
                      color: 'white', fontSize: '13px', fontWeight: 500,
                      cursor: processingId === req.participation_id ? 'not-allowed' : 'pointer',
                      opacity: processingId === req.participation_id ? 0.5 : 1
                    }}
                  >
                    {processingId === req.participation_id ? '承認中...' : '承認'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};
