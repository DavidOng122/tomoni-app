import React from 'react';

import { EventParticipantPreviewData } from '../lib/getEventParticipantPreview';

interface EventParticipantPreviewProps {
  participantPreview: EventParticipantPreviewData | null;
}

export const EventParticipantPreview: React.FC<EventParticipantPreviewProps> = ({ 
  participantPreview 
}) => {
  // If no preview data is passed, omit the card cleanly (Phase 2C-4B boundary)
  if (!participantPreview || participantPreview.participantCount === 0) {
    return null;
  }

  const { participantCount, users } = participantPreview;
  const remainingCount = participantCount - users.length;

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px', fontWeight: 500 }}>参加予定：{participantCount}人</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', marginLeft: '4px' }}>
              {users.map((user, idx) => (
                <div key={user.userId || idx} style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#e5e7eb', border: '2px solid white', overflow: 'hidden', marginLeft: '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
              ))}
              {remainingCount > 0 && (
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#f0f0f0', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#6b7280', zIndex: 10, marginLeft: '-8px' }}>
                  +{remainingCount}
                </div>
              )}
            </div>
            
            <div style={{ marginLeft: '8px', fontSize: '12px', color: '#1f2937' }}>
              {users.map(u => u.nickname + 'さん').join('、')}
              {remainingCount > 0 ? (users.length > 0 ? `、ほか${remainingCount}名` : `ほか${remainingCount}名`) : ''}
            </div>
          </div>
        </div>

        <div>
          {/* Chevron for future navigation, currently non-interactive */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  );
};
