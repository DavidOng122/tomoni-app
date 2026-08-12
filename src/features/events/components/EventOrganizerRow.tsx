import React from 'react';
import { formatEventDateTime } from '@/utils/dateFormatter';

interface EventOrganizerRowProps {
  creatorProfile?: { nickname: string; avatar_url: string } | null;
  sourceName: string | null;
  startAt: string;
  endAt: string | null;
}

export const EventOrganizerRow: React.FC<EventOrganizerRowProps> = ({ 
  creatorProfile, 
  sourceName, 
  startAt, 
  endAt 
}) => {
  
  // Decide organizer identity to show
  let organizerName: string | null = null;
  let organizerAvatar: string | null = null;
  let hasOrganizer = false;

  if (creatorProfile) {
    organizerName = creatorProfile.nickname;
    organizerAvatar = creatorProfile.avatar_url;
    hasOrganizer = true;
  } else if (sourceName) {
    organizerName = sourceName;
    hasOrganizer = true;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
      {/* Left side: Organizer Identity */}
      <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', marginRight: '12px' }}>
        {hasOrganizer && (
          <>
            {/* Avatar */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}>
              {organizerAvatar ? (
                <img 
                  src={organizerAvatar} 
                  alt={organizerName || ''} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            
            {/* Name */}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'black', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {organizerName}
            </span>
          </>
        )}
      </div>

      {/* Right side: Date / Time Pill */}
      <div style={{ flexShrink: 0, height: '28px', backgroundColor: '#FF8861', borderRadius: '29px', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>
          {formatEventDateTime(startAt, endAt)}
        </span>
      </div>
    </div>
  );
};
