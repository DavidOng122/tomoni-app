'use client';

import { useState } from 'react';
import { toggleEventParticipationAction } from '@/app/actions/eventParticipations';

interface EventParticipationButtonProps {
  eventId: string;
  currentStatus: string | null;
  approvalRequired: boolean;
  eventStatus: string;
}

export function EventParticipationButton({ 
  eventId, 
  currentStatus, 
  approvalRequired,
  eventStatus
}: EventParticipationButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    await toggleEventParticipationAction(eventId, currentStatus);
    setIsPending(false);
  };

  const commonButtonStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    borderRadius: '14px',
    fontWeight: 590,
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  };

  if (eventStatus !== 'scheduled') {
    return (
      <button 
        disabled
        style={{ ...commonButtonStyle, backgroundColor: '#e5e7eb', color: '#6b7280', cursor: 'not-allowed' }}
      >
        受付終了
      </button>
    );
  }

  if (currentStatus === 'rejected') {
    return (
      <button 
        disabled
        style={{ ...commonButtonStyle, backgroundColor: '#e5e7eb', color: '#6b7280', cursor: 'not-allowed' }}
      >
        参加をお断りされました
      </button>
    );
  }

  if (currentStatus === 'attended') {
    return (
      <button 
        disabled
        style={{ ...commonButtonStyle, backgroundColor: '#e5e7eb', color: '#6b7280', cursor: 'not-allowed' }}
      >
        参加済み
      </button>
    );
  }

  const isCancel = currentStatus === 'going' || currentStatus === 'requested';
  
  let buttonText = '';
  if (isCancel) {
    buttonText = currentStatus === 'going' ? '参加を取り消す' : 'リクエストを取り消す';
  } else {
    // null or cancelled
    if (approvalRequired) {
      buttonText = currentStatus === 'cancelled' ? '再度リクエストを送る' : '参加をリクエスト';
    } else {
      // For approvalRequired = false
      buttonText = (currentStatus === 'cancelled' || !currentStatus) ? (currentStatus === 'cancelled' ? '再度参加する' : '一緒に参加する') : '一緒に参加する';
    }
  }

  const activeStyle: React.CSSProperties = isCancel
    ? { ...commonButtonStyle, backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db' }
    : { ...commonButtonStyle, backgroundColor: 'black', color: 'white' };

  return (
    <button 
      onClick={handleClick}
      disabled={isPending}
      style={{ ...activeStyle, opacity: isPending ? 0.5 : 1, cursor: isPending ? 'not-allowed' : 'pointer' }}
    >
      {isPending ? '処理中...' : buttonText}
    </button>
  );
}
