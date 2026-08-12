'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export const EventTopNav: React.FC = () => {
  const router = useRouter();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title || 'Event',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('リンクをコピーしました'); // Simple fallback feedback
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', width: '100%', backgroundColor: 'white', position: 'relative', zIndex: 10 }}>
      <button
        onClick={() => router.back()}
        style={{ width: '37px', height: '37px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        aria-label="戻る"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        onClick={handleShare}
        style={{ width: '37px', height: '37px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'black' }}
        aria-label="共有"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>
    </div>
  );
};
