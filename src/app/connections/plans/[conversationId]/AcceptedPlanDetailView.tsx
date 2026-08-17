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
  plan: {
    activityLabel: string;
    daysOfWeek: string[];
    startTime: string;
    placeName: string;
    latitude: number;
    longitude: number;
  };
}

function formatStartTime(value: string) {
  return value.substring(0, 5).replace(/^0/, '');
}

export default function AcceptedPlanDetailView({
  person,
  plan,
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
            <p className={styles.personArea}>{plan.placeName}周辺で活動しています</p>
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
              <span>{weekdayLabel} {formatStartTime(plan.startTime)}ごろ</span>
            </p>
            <p>
              <Image
                src="/images/discover/invite-preview/accepted-location.svg"
                alt=""
                width={13}
                height={17}
              />
              <span>{plan.placeName}</span>
            </p>
          </div>
        </article>

        <section className={styles.meetup}>
          <p className={styles.eyebrow}>おすすめの合流地点</p>
          <h2>{plan.placeName}</h2>
          <p className={styles.explanation}>
            地域のOpen Dataをもとに、会いやすい合流地点を提案しています。
          </p>
          <GoogleMap
            className={styles.map}
            latitude={plan.latitude}
            longitude={plan.longitude}
            placeName={plan.placeName}
          />
          <div className={styles.tags} aria-label="合流地点の特徴">
            <span>入口がわかりやすい</span>
            <span>公共の場所</span>
            <span>活動エリアに近い</span>
          </div>
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
