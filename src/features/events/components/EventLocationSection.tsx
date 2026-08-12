import React from 'react';

interface EventLocationSectionProps {
  placeName: string;
  address: string | null;
}

export const EventLocationSection: React.FC<EventLocationSectionProps> = ({ 
  placeName, 
  address 
}) => {
  if (!placeName) return null;

  return (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 510, color: 'black', margin: '0 0 12px 0' }}>場所</h3>
      <div 
        style={{ backgroundColor: '#F8F8F8', borderRadius: '9px', border: '1px solid #EFEFEF', padding: '11px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}
      >
        <div style={{ marginTop: '2px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'black', lineHeight: 1.2 }}>
            {placeName}
          </span>
          {address && (
            <span style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.2 }}>
              {address}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
