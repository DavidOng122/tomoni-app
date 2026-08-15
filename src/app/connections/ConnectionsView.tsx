'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useRouter } from 'next/navigation';
import styles from './ConnectionsView.module.css';


export interface ActiveConversation {
  conversation_id: string;
  other_nickname: string;
  other_avatar_url: string | null;
  event_title: string;
}

export interface EventInvitation {
  invitation_id: string;
  sender_user_id: string;
  sender_nickname: string;
  sender_avatar_url: string | null;
  event_id: string;
  event_title: string;
  created_at: string;
  expires_at: string | null;
}

interface ConnectionsViewProps {
  eventInvitations: EventInvitation[];
  activeConversations: ActiveConversation[];
}

export default function ConnectionsView({ eventInvitations, activeConversations }: ConnectionsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'あいさつ' | '同行予定'>('あいさつ');


  const navItems = [
    {
      label: 'みつける',
      icon: <span className={`${styles.navIcon} ${styles.navDiscoverIcon}`} aria-hidden="true" />,
      isActive: false,
      onClick: () => router.push('/discover')
    },
    {
      label: 'つながり',
      icon: <span className={`${styles.navIcon} ${styles.navConnectionsIcon}`} aria-hidden="true" />,
      isActive: true,
      activeColor: '#FF8861',
      activeIconBgColor: '#E8E8E8',
      onClick: () => { }
    },
    {
      label: 'マイページ',
      icon: <span className={`${styles.navIcon} ${styles.navProfileIcon}`} aria-hidden="true" />,
      isActive: false,
      onClick: () => router.push('/mypage')
    },
  ];

  return (
    <div className={styles.screen}>
      <PageContainer bottomInset="nav" className={styles.page}>
        <header className={styles.header}>
          <h1>つながり</h1>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="つながり">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'あいさつ'}
            className={activeTab === 'あいさつ' ? styles.activeTab : undefined}
            onClick={() => setActiveTab('あいさつ')}
          >
            あいさつ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === '同行予定'}
            className={activeTab === '同行予定' ? styles.activeTab : undefined}
            onClick={() => setActiveTab('同行予定')}
          >
            同行予定
            <span className={styles.tabNotice} aria-hidden="true" />
          </button>
        </div>

        {activeTab === 'あいさつ' && (
          <main className={styles.content}>
            {eventInvitations.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionTitle}>
                  <span className={`${styles.sectionIcon} ${styles.receivedIcon}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="m22 6-10 7L2 6"/></svg>
                  </span>
                  <div>
                    <h2>イベントの招待</h2>
                    <p>届いている同行のお誘い</p>
                  </div>
                </div>

                <div className={styles.invitationList}>
                  {eventInvitations.map(invite => (
                    <article key={invite.invitation_id} className={styles.receivedCard}>
                      <div className={styles.invitationPerson}>
                        <div className={styles.invitationAvatar}>
                          {invite.sender_avatar_url ? (
                            <img src={invite.sender_avatar_url} alt={invite.sender_nickname} width="55" height="55" />
                          ) : (
                            <span className={styles.avatarFallback} aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
                            </span>
                          )}
                        </div>
                        <div className={styles.receivedCopy}>
                          <strong>{invite.sender_nickname}さん</strong>
                          <span>{invite.event_title}</span>
                        </div>
                      </div>
                      <div className={styles.invitationActions}>
                        <button
                          onClick={async () => {
                            const { acceptEventInvitationAction } = await import('@/app/actions/acceptEventInvitationAction');
                            const res = await acceptEventInvitationAction(invite.invitation_id);
                            if (!res.success) {
                              alert(res.error || 'エラーが発生しました');
                            } else if (res.conversationId) {
                              router.push(`/chat/${res.conversationId}`);
                            }
                          }}
                        >
                          承認
                        </button>
                        <button
                          onClick={async () => {
                            const { declineEventInvitationAction } = await import('@/app/actions/declineEventInvitationAction');
                            const res = await declineEventInvitationAction(invite.invitation_id);
                            if (!res.success) alert(res.error || 'エラーが発生しました');
                          }}
                        >
                          お断り
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}



            <section className={`${styles.section} ${styles.conversationSection}`}>
              <div className={styles.conversationHeading}>
                <span className={`${styles.sectionIcon} ${styles.greetingIcon}`} aria-hidden="true" />
                <h2>あいさつ</h2>
              </div>

              <div className={styles.conversationList}>
                {activeConversations.map((conv) => (
                  <div key={conv.conversation_id} className={styles.conversationRow} onClick={() => router.push(`/chat/${conv.conversation_id}`)} style={{ cursor: 'pointer' }}>
                    {conv.other_avatar_url ? (
                      <img className={styles.conversationAvatar} src={conv.other_avatar_url} alt={conv.other_nickname} width="42" height="42" />
                    ) : (
                      <span className={styles.avatarFallback} aria-hidden="true" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" style={{ width: '24px', height: '24px' }}>
                          <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        </svg>
                      </span>
                    )}
                    <div className={styles.conversationBody}>
                      <div className={styles.conversationTopline}>
                        <strong>{conv.other_nickname}</strong>
                      </div>
                      <div className={styles.messageLine}>
                        <span style={{ fontSize: '13px', color: '#666' }}>{conv.event_title}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        )}

        {activeTab === '同行予定' && null}
      </PageContainer>
      <BottomNavigation items={navItems} />
    </div>
  );
}
