'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { joinEventWithPlanAction } from '@/app/actions/joinEventWithPlan';
import { Database } from '@/types/database.types';

type EventRow = Database['public']['Tables']['events']['Row'];
type ParticipationRow = Database['public']['Tables']['event_participations']['Row'];

interface JoinEventViewProps {
  event: EventRow;
  existingParticipation: ParticipationRow | null;
}

export const JoinEventView: React.FC<JoinEventViewProps> = ({ event, existingParticipation }) => {
  const router = useRouter();

  // Determine initial arrival time
  let initialTime = '';
  if (existingParticipation?.arrival_time) {
    initialTime = existingParticipation.arrival_time.substring(0, 5); // Extract HH:MM
  } else if (event.start_at) {
    const d = new Date(event.start_at);
    // Convert to Japan Time explicitly or rely on browser? The UI is likely using JS Date
    // assuming local browser is JST or we just extract the time. For now, extracting from UTC ISO:
    // event.start_at is timestamptz. We want local HH:MM.
    initialTime = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' });
  }

  // Determine initial duration
  let initialDuration: number | null = null;
  if (existingParticipation && 'planned_duration_minutes' in existingParticipation) {
    initialDuration = existingParticipation.planned_duration_minutes as number | null;
  }

  const [arrivalTime, setArrivalTime] = useState(initialTime);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(initialDuration);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!arrivalTime) {
      alert('到着予定を入力してください');
      return;
    }
    
    setIsSubmitting(true);
    
    const res = await joinEventWithPlanAction(event.event_id, arrivalTime, durationMinutes);
    if (!res.success) {
      alert(res.error);
      setIsSubmitting(false);
      return;
    }

    // Navigate back to event detail
    router.push(`/events/${event.event_id}`);
  };

  const getDurationText = () => {
    if (durationMinutes === 30) return '30分くらい';
    if (durationMinutes === 60) return '1時間くらい';
    return '未定';
  };

  return (
    <PageContainer bottomInset="none">
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f3f4f6',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button 
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>参加の準備</h1>
      </div>

      <div style={{ padding: '24px', paddingBottom: '120px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>参加する時間を選んでください</h2>

        {/* Arrival Time */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            到着予定
          </label>
          <input 
            type="time" 
            value={arrivalTime}
            onChange={e => setArrivalTime(e.target.value)}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px',
              border: '1px solid #d1d5db', fontSize: '18px',
              backgroundColor: '#f9fafb', fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            参加時間
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: '30分くらい', value: 30 },
              { label: '1時間くらい', value: 60 },
              { label: 'まだ決めていない', value: null }
            ].map(option => (
              <label 
                key={String(option.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '16px', borderRadius: '12px',
                  border: durationMinutes === option.value ? '2px solid #000' : '1px solid #d1d5db',
                  cursor: 'pointer',
                  backgroundColor: durationMinutes === option.value ? '#f9fafb' : 'white'
                }}
              >
                <input 
                  type="radio" 
                  name="duration"
                  checked={durationMinutes === option.value}
                  onChange={() => setDurationMinutes(option.value)}
                  style={{ width: '20px', height: '20px', accentColor: 'black' }}
                />
                <span style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary text */}
        {arrivalTime && (
          <div style={{ 
            padding: '16px', backgroundColor: '#f3f4f6', 
            borderRadius: '12px', textAlign: 'center',
            fontSize: '15px', fontWeight: 500, color: '#4b5563'
          }}>
            {arrivalTime}ごろ 〜 {getDurationText()}
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '16px 24px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #f3f4f6',
        display: 'flex', justifyContent: 'center'
      }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !arrivalTime}
            style={{
              width: '100%', padding: '16px', borderRadius: '100px',
              backgroundColor: isSubmitting || !arrivalTime ? '#9ca3af' : 'black',
              color: 'white', fontSize: '16px', fontWeight: 600,
              border: 'none', cursor: isSubmitting || !arrivalTime ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? '処理中...' : 'この時間で参加する'}
          </button>
        </div>
      </div>
    </PageContainer>
  );
};
