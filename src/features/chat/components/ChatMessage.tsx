import React from 'react';
import Image from 'next/image';

interface ChatMessageProps {
  id: string;
  content: string;
  isMine: string | boolean; // string 'true' / 'false' or boolean
  time: string;
  avatarUrl?: string | null;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ content, isMine, time, avatarUrl }) => {
  const mine = String(isMine) === 'true';

  return (
    <div style={{
      display: 'flex',
      flexDirection: mine ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: '8px',
      marginBottom: '16px'
    }}>
      {!mine && (
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f0f0f0' }}>
          {avatarUrl ? (
            <Image src={avatarUrl} alt="avatar" width={40} height={40} style={{ objectFit: 'cover' }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" style={{ width: '100%', height: '100%', padding: '4px' }}>
              <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            </svg>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <div style={{
          backgroundColor: mine ? '#FF8861' : '#F1F1F1',
          color: mine ? '#FFF' : '#333',
          padding: '12px 16px',
          borderRadius: '16px',
          maxWidth: '240px',
          wordBreak: 'break-word',
          fontSize: '15px',
          lineHeight: '1.4'
        }}>
          {content}
        </div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
          {time}
        </div>
      </div>
    </div>
  );
};
