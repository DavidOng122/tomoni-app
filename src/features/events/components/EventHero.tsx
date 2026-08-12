import React from 'react';

interface EventHeroProps {
  posterUrl: string | null;
  title: string;
}

export const EventHero: React.FC<EventHeroProps> = ({ posterUrl, title }) => {
  return (
    <div style={{ marginBottom: '24px', marginTop: '4px' }}>
      <div 
        style={{ 
          width: '100%',
          position: 'relative',
          backgroundColor: '#eaeaea',
          overflow: 'hidden',
          borderRadius: '19px',
          height: '280px',
        }}
      >
        {posterUrl ? (
          <img 
            src={posterUrl} 
            alt={title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: '14px' }}>No Poster Available</span>
          </div>
        )}
      </div>
    </div>
  );
};
