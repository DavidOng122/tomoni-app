'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Database } from '@/types/database.types';
import { formatEventDateTime } from '@/utils/dateFormatter';

type EventRow = Database['public']['Tables']['events']['Row'];

interface EventDetailViewProps {
  event: EventRow;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({ event }) => {
  const router = useRouter();

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
      <MobileHeader 
        leftElement={
          <button 
            onClick={() => router.back()} 
            style={{ background: 'none', border: 'none', padding: '8px', margin: '-8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        }
      />
      
      <div style={{ paddingBottom: '80px' }}>
        {/* Poster */}
        <div style={{ width: '100%', height: '240px', background: '#eaeaea', position: 'relative' }}>
          {event.poster_url ? (
            <img src={event.poster_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
          )}
        </div>

        <div style={{ padding: '24px var(--page-padding-x)' }}>
          {/* Metadata */}
          {event.source_name && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ 
                fontSize: '12px', 
                color: '#666',
                background: '#f0f0f0',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                {event.source_name}
              </span>
            </div>
          )}

          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px 0', lineHeight: 1.4 }}>
            {event.title}
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div style={{ fontSize: '15px', color: '#333' }}>
                {formatEventDateTime(event.start_at, event.end_at)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div style={{ fontSize: '15px', color: '#333' }}>
                <div style={{ fontWeight: 500 }}>{event.place_name}</div>
                {event.address && (
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>{event.address}</div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '24px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0' }}>イベント詳細</h2>
              <p style={{ 
                fontSize: '14px', 
                color: '#444', 
                lineHeight: 1.6, 
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {event.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* External CTA fixed at bottom */}
      {(ctaText || ctaDisabled) && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px var(--page-padding-x) calc(16px + var(--safe-area-bottom))',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid var(--color-divider)',
          zIndex: 'var(--z-index-nav)'
        }}>
          <button
            onClick={() => {
              if (ctaUrl && !ctaDisabled) {
                window.open(ctaUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            disabled={ctaDisabled}
            className={ctaDisabled ? "" : "hoverable"}
            style={{
              width: '100%',
              background: ctaDisabled ? '#e0e0e0' : 'var(--color-primary)',
              color: ctaDisabled ? '#999' : '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: ctaDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: ctaDisabled ? 'none' : '0 4px 12px rgba(255, 136, 97, 0.3)'
            }}
          >
            {ctaText}
            {!ctaDisabled && ctaUrl && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            )}
          </button>
        </div>
      )}
    </PageContainer>
  );
};
