import Image from 'next/image';
import Link from 'next/link';
import { GoogleMap } from '@/infrastructure/maps/GoogleMap';
import { formatWeekdays } from '@/features/fixed-schedules/lib/formatters';
import type { DayOfWeek } from '@/features/fixed-schedules/types';
import styles from './AcceptedPlanDetailView.module.css';

interface AcceptedPlanDetailViewProps {
  person: {
    nickname: string;
    avatarUrl: string;
    ageRange: string;
  };
  activityAreas: {
    sender: string;
    receiver: string;
    other: string;
  };
  plan: {
    activityType: string;
    activityLabel: string;
    daysOfWeek: string[];
    startTime: string;
  };
  suggestedPlace: {
    kind: 'event' | 'cultural_facility' | 'public_place';
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    sourceName: string;
    eventStartAt: string | null;
    eventStatus: string | null;
    officialUrl: string | null;
    requiresHoursConfirmation: boolean;
  } | null;
}

function formatStartTime(value: string) {
  return value.substring(0, 5).replace(/^0/, '');
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AcceptedPlanDetailView({
  person,
  activityAreas,
  plan,
  suggestedPlace,
}: AcceptedPlanDetailViewProps) {
  const weekdayLabel = formatWeekdays(plan.daysOfWeek as DayOfWeek[]);

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <Link href="/connections?tab=plans" aria-label="同行予定に戻る">
            <Image
              src="/images/connections/accepted-plan/close.svg"
              alt=""
              width={35}
              height={36}
            />
          </Link>
          <h1>同行のお誘い</h1>
        </header>

        <section className={styles.person} aria-label="同行する人">
          <span className={styles.avatar}>
            {/* Supabase profiles may contain user-uploaded URLs from multiple hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={person.avatarUrl} alt={person.nickname} />
          </span>
          <div>
            <p className={styles.personName}>
              <strong>{person.nickname} さん</strong>
              <span>{person.ageRange}歳</span>
            </p>
            <p className={styles.personArea}>{activityAreas.other}周辺で活動しています</p>
          </div>
        </section>

        <article className={styles.planCard}>
          <div className={styles.planHeading}>
            <h2>{plan.activityLabel}</h2>
            <span className={styles.acceptedBadge}>
              <Image
                src="/images/discover/invite-preview/accepted-check.svg"
                alt=""
                width={14}
                height={14}
              />
              同行予定
            </span>
          </div>
          <div className={styles.planDetails}>
            <p>
              <Image
                src="/images/discover/invite-preview/accepted-calendar.svg"
                alt=""
                width={17}
                height={17}
              />
              <span>{weekdayLabel}{plan.activityType === 'event' ? '' : ` ${formatStartTime(plan.startTime)}ごろ`}</span>
            </p>
            <p>
              <Image
                src="/images/discover/invite-preview/accepted-location.svg"
                alt=""
                width={13}
                height={17}
              />
              <span>{activityAreas.sender} × {activityAreas.receiver}</span>
            </p>
          </div>
        </article>

        <section className={styles.meetup}>
          <p className={styles.eyebrow}>
            {suggestedPlace?.kind === 'event' ? 'おすすめのイベント' : 'おすすめの合流地点'}
          </p>
          {suggestedPlace ? (
            <>
              <h2>{suggestedPlace.name}</h2>
              {suggestedPlace.eventStartAt && (
                <p className={styles.address}>{formatEventDate(suggestedPlace.eventStartAt)}</p>
              )}
              {suggestedPlace.address && (
                <p className={styles.address}>{suggestedPlace.address}</p>
              )}
              <p className={styles.explanation}>
                {suggestedPlace.sourceName} Open Dataをもとに、ふたりが参加しやすい候補を提案しています。
              </p>
              {suggestedPlace.eventStatus && suggestedPlace.eventStatus !== 'scheduled' && (
                <p className={styles.address}>イベント情報が変更されています。公式情報をご確認ください。</p>
              )}
              {suggestedPlace.requiresHoursConfirmation && (
                <p className={styles.address}>営業時間・入場条件は公式ページでご確認ください。</p>
              )}
              {suggestedPlace.officialUrl && (
                <p><a href={suggestedPlace.officialUrl} target="_blank" rel="noreferrer">公式ページを見る</a></p>
              )}
              <GoogleMap
                className={styles.map}
                latitude={suggestedPlace.latitude}
                longitude={suggestedPlace.longitude}
                placeName={suggestedPlace.name}
              />
              <p className={styles.mapNotice}>
                地図はOpen Dataの参考地点を示しています。入口の位置とは限りません。
              </p>
              <div className={styles.tags} aria-label="合流地点の特徴">
                <span>公共の場所</span>
                <span>{suggestedPlace.kind === 'public_place' ? '双方の活動エリアから3.2km以内' : '江戸川区内のおすすめ'}</span>
              </div>
            </>
          ) : (
            <div className={styles.noMeetupPlace}>
              <h2>集合場所を確認してください</h2>
              <p>
                {plan.activityType === 'event'
                  ? 'おすすめできるイベント・文化施設が見つかりませんでした。チャットで行き先を確認してください。'
                  : 'おすすめできる大型公園が見つかりませんでした。チャットで集合場所を確認してください。'}
              </p>
            </div>
          )}
        </section>

        <aside className={styles.privacyNotice}>
          <Image
            src="/images/connections/accepted-plan/privacy-shield.svg"
            alt=""
            width={24}
            height={24}
          />
          <p>現在地や自宅の場所は共有されません</p>
        </aside>
      </div>
    </main>
  );
}
