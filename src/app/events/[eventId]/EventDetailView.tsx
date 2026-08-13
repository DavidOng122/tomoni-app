'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Database } from '@/types/database.types';
import Link from 'next/link';

import { EventTopNav } from '@/features/events/components/EventTopNav';
import { EventHero } from '@/features/events/components/EventHero';
import { EventOrganizerRow } from '@/features/events/components/EventOrganizerRow';
import { EventParticipantPreview } from '@/features/events/components/EventParticipantPreview';
import { EventLocationSection } from '@/features/events/components/EventLocationSection';
import { EventDescriptionSection } from '@/features/events/components/EventDescriptionSection';
import { EventParticipationButton } from '@/components/events/EventParticipationButton';
import { EventParticipantPreviewData } from '@/features/events/lib/getEventParticipantPreview';

type EventRow = Database['public']['Tables']['events']['Row'];

interface EventDetailViewProps {
  event: EventRow;
  participation: Database['public']['Tables']['event_participations']['Row'] | null;
  creatorProfile?: { nickname: string; avatar_url: string } | null;
  participantPreview: EventParticipantPreviewData | null;
  pendingRequestCount?: number;
  isCreator?: boolean;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({ 
  event, 
  participation, 
  creatorProfile,
  participantPreview,
  pendingRequestCount = 0,
  isCreator = false
}) => {
  let ctaUrl: string | null = null;
  let ctaText: string | null = null;
  let ctaDisabled = false;

  const now = new Date();
  const deadlinePassed = event.registration_deadline && new Date(event.registration_deadline) < now;

  if (!event.registration_required || event.registration_status === 'not_required') {
    if (event.official_url) {
      ctaUrl = event.official_url;
      ctaText = '公式サイトを見る';
    }
  } else if (event.registration_status === 'unknown') {
    if (event.official_url) {
      ctaUrl = event.official_url;
      ctaText = '公式サイトを見る';
    }
  } else if (event.registration_status === 'closed' || event.registration_status === 'full' || deadlinePassed) {
    ctaDisabled = true;
    ctaText = '受付終了';
  } else if (event.registration_status === 'not_started') {
    ctaDisabled = true;
    ctaText = '受付前';
  } else if (event.registration_status === 'open') {
    if (event.registration_url) {
      ctaUrl = event.registration_url;
      ctaText = '公式サイトで申し込む';
    } else if (event.official_url) {
      ctaUrl = event.official_url;
      ctaText = '公式サイトを見る';
    }
  } else {
    // Fallback for any other state
    if (event.official_url) {
      ctaUrl = event.official_url;
      ctaText = '公式サイトを見る';
    }
  }

  return (
    <PageContainer bottomInset="none">
      {/* We use a custom header that acts like the MobileHeader but matches the design exactly */}
      <EventTopNav />
      
      <div style={{ paddingBottom: '120px', maxWidth: '430px', margin: '0 auto', width: '100%' }}>
        {/* Poster Hero */}
        <EventHero 
          posterUrl={event.poster_url} 
          title={event.title} 
        />

        <div>
          {/* Title */}
          <h1 
            style={{ fontSize: '24px', fontWeight: 590, color: 'black', marginBottom: '16px', wordBreak: 'break-word', lineHeight: '33.98px', margin: '0 0 16px 0' }}
          >
            {event.title}
          </h1>

          {/* Organizer / Date Time Row */}
          <EventOrganizerRow 
            creatorProfile={creatorProfile}
            sourceName={event.source_name}
            startAt={event.start_at}
            endAt={event.end_at}
          />

          {/* Organizer Requests Entry */}
          {isCreator && event.event_type === 'user_created' && event.approval_required && (
            <Link 
              href={`/events/${event.event_id}/requests`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px', background: '#f9fafb', borderRadius: '12px',
                marginBottom: '24px', textDecoration: 'none', color: 'black',
                fontWeight: 500, fontSize: '15px'
              }}
            >
              <span>参加リクエスト</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                <span>{pendingRequestCount}件</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </Link>
          )}

          {/* Participant Preview */}
          {participantPreview && (
            <div style={{ padding: '0 var(--page-padding-x) 24px var(--page-padding-x)' }}>
              <EventParticipantPreview participantPreview={participantPreview} />
              {participation?.participation_status === 'going' && participation.participation_date && participation.arrival_time && (
                <div style={{ marginTop: '12px' }}>
                  <Link 
                    href={`/events/${event.event_id}/people`}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: 600,
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    同じ時間に参加する人を見る
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Location Section */}
          <EventLocationSection 
            placeName={event.place_name}
            address={event.address}
          />

          {/* Event Introduction */}
          <EventDescriptionSection 
            description={event.description}
          />
        </div>
      </div>

      {/* External CTA and Participation fixed at bottom */}
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(100%, var(--max-app-width))',
          zIndex: 50,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #f3f4f6',
          padding: '16px var(--page-padding-x) calc(16px + var(--safe-area-bottom))'
        }}
      >
        <div style={{ maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Tomoni Participation Button */}
          <EventParticipationButton 
            eventId={event.event_id}
            currentStatus={participation?.participation_status || null}
            approvalRequired={event.approval_required}
            eventStatus={event.event_status}
          />

          {/* External Registration Button */}
          {(ctaText || ctaDisabled) && (
            <button
              onClick={() => {
                if (ctaUrl && !ctaDisabled) {
                  window.open(ctaUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              disabled={ctaDisabled}
              style={{
                width: '100%',
                padding: '16px 0',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: ctaDisabled ? 'none' : '1px solid black',
                backgroundColor: ctaDisabled ? '#f0f0f0' : 'white',
                color: ctaDisabled ? '#999' : 'black',
                cursor: ctaDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              {ctaText}
              {!ctaDisabled && ctaUrl && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
