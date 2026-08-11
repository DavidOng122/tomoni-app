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

  if (eventStatus !== 'scheduled') {
    return (
      <button 
        disabled
        className="w-full py-3 rounded-full font-bold text-sm bg-gray-200 text-gray-500 cursor-not-allowed"
      >
        受付終了
      </button>
    );
  }

  if (currentStatus === 'rejected') {
    return (
      <button 
        disabled
        className="w-full py-3 rounded-full font-bold text-sm bg-gray-200 text-gray-500 cursor-not-allowed"
      >
        参加をお断りされました
      </button>
    );
  }

  if (currentStatus === 'attended') {
    return (
      <button 
        disabled
        className="w-full py-3 rounded-full font-bold text-sm bg-gray-200 text-gray-500 cursor-not-allowed"
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
      buttonText = currentStatus === 'cancelled' ? '再度参加予定にする' : '参加予定にする';
    }
  }

  const buttonStyle = isCancel
    ? "w-full py-3 rounded-full font-bold text-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    : "w-full py-3 rounded-full font-bold text-sm bg-tomoni-blue text-white shadow-md hover:bg-blue-600 active:bg-blue-700 transition-colors";

  return (
    <button 
      onClick={handleClick}
      disabled={isPending}
      className={`${buttonStyle} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPending ? '処理中...' : buttonText}
    </button>
  );
}
