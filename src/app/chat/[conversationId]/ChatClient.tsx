'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/infrastructure/auth/client';
import { Database } from '@/types/database.types';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { ChatMessage } from '@/features/chat/components/ChatMessage';
import { ChatComposer } from '@/features/chat/components/ChatComposer';
import { acceptFixedScheduleInvitation } from '@/app/actions/acceptFixedScheduleInvitation';
import { declineFixedScheduleInvitation } from '@/app/actions/declineFixedScheduleInvitation';
import { cancelFixedScheduleInvitation } from '@/app/actions/cancelFixedScheduleInvitation';
import { getMessageAvatarUrl } from '@/features/chat/domain/getMessageAvatarUrl';
import styles from './ChatClient.module.css';

type MessageRow = Database['public']['Tables']['messages']['Row'];

// ─── Fixed Schedule context shape ───────────────────────────────────
export interface FixedPlanContext {
  invitationId: string;
  invitationStatus: string;
  isSender: boolean;
  otherNickname: string;
  otherAvatarUrl: string | null;
  headline: string;
  activityLabel: string;
  inviteMessage: string;
  days_of_week: string;
  start_time: string;
  place_name: string;
  discoveryUrl: string;
  isConversationClosed: boolean;
}

interface ChatClientProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
  eventContext: {
    title: string;
    start_at: string;
    place_name: string;
  };
  otherNickname: string;
  isGroupChat?: boolean;
  participantCount?: number;
  fixedPlanContext?: FixedPlanContext | null;
}

// ─── Back Arrow SVG ─────────────────────────────────────────────────────────
function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ─── Fixed Schedule Header ──────────────────────────────────────────
function FixedPlanChatHeader({
  ctx,
  onBack,
  isActionLoading,
}: {
  ctx: FixedPlanContext;
  onBack: () => void;
  isActionLoading: boolean;
}) {
  const isPending = ctx.invitationStatus === 'pending';
  const isClosed = ctx.isConversationClosed;

  let badgeText = '同行予定';
  let badgeClassName = `${styles.statusBadge} ${styles.statusAccepted}`;
  if (isPending) {
    badgeText = '返事待ち';
    badgeClassName = styles.statusBadge;
  } else if (isClosed) {
    badgeText = 'キャンセル済';
    badgeClassName = `${styles.statusBadge} ${styles.statusClosed}`;
  }

  return (
    <header className={styles.fixedPlanHeader}>
      <div className={styles.fixedPlanHeaderRow}>
        <button
          className={`${styles.iconButton} ${styles.backButton}`}
          type="button"
          onClick={onBack}
          aria-label="戻る"
          disabled={isActionLoading}
        >
          <Image src="/images/discover/invite-preview/back.svg" alt="" width={35} height={35} />
        </button>
        <div className={styles.identity}>
          <div className={styles.avatarStatus}>
            <div className={styles.avatar}>
              {ctx.otherAvatarUrl ? (
                <img src={ctx.otherAvatarUrl} alt={`${ctx.otherNickname}さん`} />
              ) : (
                <svg className={styles.avatarFallback} viewBox="0 0 24 24" fill="none" stroke="#BDBDBD" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
              )}
            </div>
            <span className={badgeClassName}>{badgeText}</span>
          </div>
          <span className={styles.personName}>{ctx.otherNickname}</span>
        </div>
        <Image className={styles.moreIcon} src="/images/discover/invite-preview/more.svg" alt="" width={20} height={4} />
      </div>
    </header>
  );
}

// ─── Terminal State Card (declined / cancelled) ────────────────────────────
function TerminalCard({ ctx, onDiscovery, onClose }: { ctx: FixedPlanContext; onDiscovery: () => void; onClose: () => void; }) {
  const isDeclined = ctx.invitationStatus === 'declined';

  let primaryText = '';
  let secondaryText = '同行予定はキャンセルされました';

  if (isDeclined) {
    primaryText = ctx.isSender
      ? `${ctx.otherNickname}さんが今回は見送ることにしました`
      : 'このお誘いを見送りました';
  } else {
    // cancelled
    primaryText = ctx.isSender
      ? '招待を取り消しました'
      : `${ctx.otherNickname}さんが招待を取り消しました`;
  }

  return (
    <div style={{
      margin: '24px auto',
      width: '301px',
      maxWidth: 'calc(100% - 32px)',
      backgroundColor: '#fff',
      border: '1px solid #E9E9EB',
      borderRadius: '26px',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
      padding: '20px 16px 16px',
    }}>
      {/* Status icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#F5F5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="10" y1="15" x2="14" y2="15" />
          </svg>
        </div>
      </div>

      {/* Status text */}
      <p style={{ color: '#1E2939', fontSize: '15px', fontWeight: 590, lineHeight: '20px', textAlign: 'center', margin: '0 0 4px' }}>
        {primaryText}
      </p>
      <p style={{ color: '#4F4F4F', fontSize: '13px', fontWeight: 510, lineHeight: '18px', textAlign: 'center', margin: '0 0 16px' }}>
        {secondaryText}
      </p>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: '#F0F0F0', margin: '0 0 12px' }} />

      {/* Schedule context */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ color: '#4F4F4F', fontSize: '12px' }}>{ctx.days_of_week} {ctx.start_time}ごろ</span>
        </div>
        {ctx.place_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#757575" strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ color: '#4F4F4F', fontSize: '12px' }}>{ctx.place_name}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onDiscovery}
          style={{
            flex: 1,
            backgroundColor: '#fff',
            border: '1px solid #FF7622',
            borderRadius: '11px',
            color: '#FF7622',
            fontSize: '13px',
            fontWeight: 500,
            padding: '10px 0',
            cursor: 'pointer',
          }}
        >
          他の人をみる
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            backgroundColor: '#fff',
            border: '1px solid #CCCCCC',
            borderRadius: '11px',
            color: '#000',
            fontSize: '13px',
            fontWeight: 500,
            padding: '10px 0',
            cursor: 'pointer',
          }}
        >
          トークを閉じる
        </button>
      </div>
    </div>
  );
}

// ─── Invitation Context Card ─────────────────────────────────────────────────
function InvitationCard({
  ctx,
  onAccept,
  onCancel,
  onDecline,
  onOpenDetail,
  isActionLoading,
}: {
  ctx: FixedPlanContext;
  onAccept: () => void;
  onCancel: () => void;
  onDecline: () => void;
  onOpenDetail: () => void;
  isActionLoading: boolean;
}) {
  const isPending = ctx.invitationStatus === 'pending';

  if (!isPending) {
    return (
      <button
        type="button"
        className={styles.acceptedPlanCard}
        onClick={onOpenDetail}
        aria-label={`${ctx.activityLabel}の同行詳細を見る`}
      >
        <div className={styles.acceptedPlanHeading}>
          <h2>{ctx.activityLabel}</h2>
          <span className={styles.acceptedPlanBadge}>
            <Image src="/images/discover/invite-preview/accepted-check.svg" alt="" width={14} height={14} />
            同行予定
          </span>
        </div>
        <div className={styles.acceptedPlanDetails}>
          <div>
            <Image src="/images/discover/invite-preview/accepted-calendar.svg" alt="" width={17} height={17} />
            <span>{ctx.days_of_week} {ctx.start_time}ごろ</span>
          </div>
          {ctx.place_name && (
            <div>
              <Image src="/images/discover/invite-preview/accepted-location.svg" alt="" width={13} height={17} />
              <span>{ctx.place_name}</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <article className={styles.invitationCard}>
      <div className={styles.cardBody}>
        <div className={styles.cardHeadlineRow}>
          <p className={styles.cardHeadline}>{isPending ? ctx.headline : '同行予定'}</p>
          {isPending && (
            <span className={styles.waitingBadge}>
              <Image src="/images/discover/invite-preview/waiting.svg" alt="" width={11} height={11} />
              返信待ち
            </span>
          )}
        </div>
        <p className={styles.inviteMessage}>{ctx.inviteMessage}</p>
        <div className={styles.scheduleImage}>
          <div className={styles.scheduleRow}>
            <Image src="/images/discover/invite-preview/calendar.svg" alt="" width={14} height={14} />
            <span>{ctx.days_of_week} {ctx.start_time}ごろ</span>
          </div>
        {ctx.place_name && (
          <div className={styles.scheduleRow}>
            <Image className={styles.locationIcon} src="/images/discover/invite-preview/location.svg" alt="" width={11} height={14} />
            <span>{ctx.place_name}</span>
          </div>
        )}
        </div>
      </div>
      {isPending && (
        <div className={styles.cardActions}>
          {ctx.isSender ? (
            <button className={styles.cancelButton} type="button" onClick={onCancel} disabled={isActionLoading}>
              {isActionLoading ? '処理中...' : '招待を取り消す'}
            </button>
          ) : (
            <div className={styles.receiverActions}>
              <button className={styles.responseButton} type="button" onClick={onDecline} disabled={isActionLoading}>
                今回は見送る
              </button>
              <button className={`${styles.responseButton} ${styles.acceptButton}`} type="button" onClick={onAccept} disabled={isActionLoading}>
                一緒に行く
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Main ChatClient ─────────────────────────────────────────────────────────
export default function ChatClient({
  conversationId,
  currentUserId,
  initialMessages,
  eventContext,
  otherNickname,
  isGroupChat = false,
  participantCount = 2,
  fixedPlanContext = null,
}: ChatClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          setMessages(prev => {
            if (prev.some(m => m.message_id === newMessage.message_id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  const handleSend = async (content: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: currentUserId,
          message_type: 'text',
          content,
        })
        .select()
        .single();
      if (error) { console.error('Insert error:', error); throw error; }
      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.message_id === data.message_id)) return prev;
          return [...prev, data];
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const hasMessageFromOther = messages.some(m => m.sender_user_id !== currentUserId);
  const isAloneInGroup = isGroupChat && participantCount <= 1 && !hasMessageFromOther;

  // ── Fixed Schedule Chat layout ──────────────────────────────────
  if (fixedPlanContext) {
    const ctx = fixedPlanContext;

    const handleCancel = async () => {
      if (isActionLoading) return;
      setIsActionLoading(true);
      const res = await cancelFixedScheduleInvitation(ctx.invitationId);
      if (res.success) {
        router.push('/connections?tab=plans');
      } else {
        alert(res.error || '取り消しに失敗しました');
        setIsActionLoading(false);
      }
    };

    const handleAccept = async () => {
      if (isActionLoading) return;
      setIsActionLoading(true);
      const res = await acceptFixedScheduleInvitation(ctx.invitationId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || '承諾に失敗しました');
      }
      setIsActionLoading(false);
    };

    const handleDecline = async () => {
      if (isActionLoading) return;
      setIsActionLoading(true);
      const res = await declineFixedScheduleInvitation(ctx.invitationId);
      if (res.success) {
        router.push('/connections?tab=plans');
      } else {
        alert(res.error || 'お断りに失敗しました');
        setIsActionLoading(false);
      }
    };

    // ── Terminal state (declined / cancelled) ────────────────────────────
    if (ctx.isConversationClosed) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
          <FixedPlanChatHeader
            ctx={ctx}
            onBack={() => router.push('/connections?tab=plans')}
            isActionLoading={false}
          />
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8F8F8', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <TerminalCard
              ctx={ctx}
              onDiscovery={() => router.push(ctx.discoveryUrl)}
              onClose={() => router.push('/connections?tab=plans')}
            />
          </div>
        </div>
      );
    }

    const messageList = (
      <div className={`${styles.messageList} ${ctx.invitationStatus === 'accepted' ? styles.acceptedMessageList : ''}`}>
        {/* Invitation context card — always shown above messages */}
        <InvitationCard
          ctx={ctx}
          onAccept={handleAccept}
          onCancel={handleCancel}
          onDecline={handleDecline}
          onOpenDetail={() => router.push(`/connections/plans/${conversationId}`)}
          isActionLoading={isActionLoading}
        />

        {/* Real messages only */}
        {messages.length > 0 && (
          <div className={styles.chatMessages}>
            {messages.map(msg => (
              <ChatMessage
                key={msg.message_id}
                id={msg.message_id}
                content={msg.content || ''}
                isMine={msg.sender_user_id === currentUserId}
                time={formatMessageTime(msg.created_at)}
                avatarUrl={getMessageAvatarUrl({
                  currentUserId,
                  senderUserId: msg.sender_user_id,
                  otherAvatarUrl: ctx.otherAvatarUrl,
                })}
              />
            ))}
          </div>
        )}
      </div>
    );

    return (
      <div className={styles.fixedPlanScreen}>
        <FixedPlanChatHeader
          ctx={ctx}
          onBack={() => router.push('/connections?tab=plans')}
          isActionLoading={isActionLoading}
        />
        <main className={styles.fixedPlanMain}>{messageList}</main>
        <footer className={styles.fixedPlanFooter}>
          <ChatComposer onSend={handleSend} isSending={isSending} variant="fixed-plan" />
        </footer>
      </div>
    );
  }

  // ── Event Group Chat / standard 1-on-1 layout ────────────────────────────
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ChatLayout
        header={
          <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center' }}>
              <Button variant="ghost" onClick={() => router.push('/connections')} style={{ padding: '0 8px' }}>
                <BackArrow />
              </Button>
              <span style={{ fontWeight: 600, fontSize: '16px', marginLeft: '8px' }}>
                {isGroupChat ? otherNickname : `${otherNickname}さん`}
              </span>
            </div>
            <div style={{ padding: '8px 16px', backgroundColor: '#F9FAFB', margin: '0 16px 12px 16px', borderRadius: '8px', fontSize: '13px', color: '#4B5563' }}>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>同行予定: {eventContext.title}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {formatEventTime(eventContext.start_at)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  {eventContext.place_name}
                </span>
              </div>
            </div>
          </div>
        }
        messageList={
          isAloneInGroup ? (
            <div style={{ textAlign: 'center', marginTop: '60px', color: '#666' }}>
              <div style={{ marginBottom: '8px', fontSize: '15px', fontWeight: 600 }}>まだ他の参加者はいません</div>
              <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                参加者が増えると、<br />
                ここでイベントについて話せます。
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '40px', color: '#999' }}>
              まだメッセージはありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '16px' }}>
              {messages.map(msg => (
                <ChatMessage
                  key={msg.message_id}
                  id={msg.message_id}
                  content={msg.content || ''}
                  isMine={msg.sender_user_id === currentUserId}
                  time={formatMessageTime(msg.created_at)}
                />
              ))}
            </div>
          )
        }
        inputArea={!isAloneInGroup ? <ChatComposer onSend={handleSend} isSending={isSending} /> : null}
      />
    </div>
  );
}
