import React from 'react';

interface EventDescriptionSectionProps {
  description: string | null;
}

export const EventDescriptionSection: React.FC<EventDescriptionSectionProps> = ({ description }) => {
  if (!description) return null;

  return (
    <div style={{ marginBottom: '48px' }}>
      <h3 style={{ fontSize: '12px', fontWeight: 510, color: 'black', margin: '0 0 8px 0' }}>イベント紹介</h3>
      <div style={{ width: '100%', height: '1px', backgroundColor: '#ECECEC', marginBottom: '12px' }} />
      <p 
        style={{ fontSize: '11px', fontWeight: 400, color: '#404040', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word', lineHeight: '17.6px' }}
      >
        {description}
      </p>
    </div>
  );
};
