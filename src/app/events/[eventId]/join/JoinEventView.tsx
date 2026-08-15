'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { joinEventWithPlanAction } from '@/app/actions/joinEventWithPlan';
import { Database } from '@/types/database.types';
import { formatEventDateTime } from '@/utils/dateFormatter';
import styles from './JoinEventView.module.css';

type EventRow = Database['public']['Tables']['events']['Row'];
type ParticipationRow = Database['public']['Tables']['event_participations']['Row'];

interface JoinEventViewProps {
  event: EventRow;
  existingParticipation: ParticipationRow | null;
}

const durationOptions = [
  { label: '30分くらい', value: 30 },
  { label: '1時間くらい', value: 60 },
  { label: 'まだ決めていない', value: null },
] as const;

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
    initialTime = d.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tokyo',
    });
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

  const eventLabel = 'イベント';

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="none" className={styles.page}>
        <main className={styles.stage}>
          <button className={styles.backButton} type="button" onClick={() => router.back()} aria-label="戻る">
            <Image src="/images/events/detail/back.svg" width={7} height={12} alt="" aria-hidden="true" />
          </button>

          <section className={styles.eventCard} aria-label="参加する活動">
            <span className={styles.eventLabel}>{eventLabel}</span>
            <h1>{event.title}</h1>
            <div className={styles.metaRow}>
              <Image
                src="/images/discover/invite-preview/calendar.svg"
                width={14}
                height={14}
                alt=""
                aria-hidden="true"
              />
              <time>{formatEventDateTime(event.start_at, event.end_at)}</time>
            </div>
            {event.place_name && (
              <div className={styles.metaRow}>
                <Image
                  className={styles.locationIcon}
                  src="/images/events/detail/location.svg"
                  width={11}
                  height={14}
                  alt=""
                  aria-hidden="true"
                />
                <span>{event.place_name}</span>
              </div>
            )}
          </section>

          <section className={styles.formSection}>
            <header className={styles.intro}>
              <h2>参加する時間を選んでください</h2>
              <p>同じ時間帯に参加する人を見つけやすくなります</p>
            </header>

            <div className={styles.fieldGroup}>
              <label htmlFor="arrival-time">到着予定</label>
              <div className={styles.timeRow}>
                <span>Time</span>
                <input
                  id="arrival-time"
                  type="time"
                  value={arrivalTime}
                  onChange={(event) => setArrivalTime(event.target.value)}
                />
              </div>
            </div>

            <fieldset className={styles.durationFieldset}>
              <legend>参加時間</legend>
              <div className={styles.durationOptions}>
                {durationOptions.map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    className={durationMinutes === option.value ? styles.durationSelected : ''}
                    aria-pressed={durationMinutes === option.value}
                    onClick={() => setDurationMinutes(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.summary}>
              <span>参加予定</span>
              <strong>{arrivalTime ? `${arrivalTime}ごろ 〜 ${getDurationText()}` : '未定'}</strong>
            </div>
          </section>

          <section className={styles.submitCard}>
            <p>選んだ時間をもとに、会いやすい参加者をおすすめします</p>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting || !arrivalTime}>
              {isSubmitting ? '処理中...' : 'この時間で参加する'}
            </button>
          </section>
        </main>
      </PageContainer>
    </div>
  );
};
