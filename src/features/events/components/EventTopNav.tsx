'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface EventTopNavProps {
  className?: string;
}

export const EventTopNav: React.FC<EventTopNavProps> = ({ className }) => {
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
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', width: '100%', backgroundColor: 'white', position: 'relative', zIndex: 10 }}>
      <button
        onClick={() => router.back()}
        style={{ width: '37px', height: '37px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        aria-label="戻る"
      >
        <img src="/images/events/detail/back.svg" alt="" aria-hidden="true" width="7" height="12" />
      </button>

      <button
        onClick={handleShare}
        style={{ width: '37px', height: '37px', borderRadius: '50%', backgroundColor: 'white', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'black' }}
        aria-label="共有"
      >
        <img src="/images/events/detail/share.svg" alt="" aria-hidden="true" width="14" height="14" />
      </button>
    </div>
  );
};
