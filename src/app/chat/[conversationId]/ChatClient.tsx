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
import { deleteChatImage, uploadChatImage } from '@/infrastructure/chat/chatImageStorage';
import styles from './ChatClient.module.css';

type MessageRow = Database['public']['Tables']['messages']['Row'];

// ─── Fixed Schedule context shape ───────────────────────────────────
export interface FixedPlanContext {
  invitationId: string;
  invitationStatus: string;
  cancelledByCurrentUser: boolean | null;
  isSender: boolean;
  otherNickname: string;
  otherAvatarUrl: string | null;
  headline: string;
  activityType: string;
  activityLabel: string;
  inviteMessage: string;
  days_of_week: string;
  start_time: string;
  sender_area_name: string;
  receiver_area_name: string;
  suggestedPlace: {
    kind: 'event' | 'cultural_facility' | 'public_place';
    name: string;
    placeName: string;
    sourceName: string;
    imageUrl: string | null;
    viewerDistanceMeters: number;
    otherDistanceMeters: number;
    eventStartAt: string | null;
    eventStatus: string | null;
    registrationStatus: string | null;
    requiresHoursConfirmation: boolean;
  } | null;
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
  isConversationClosed?: boolean;
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
  onMore,
  isActionLoading,
}: {
  ctx: FixedPlanContext;
  onBack: () => void;
  onMore: () => void;
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
    badgeText = '見送り済';
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
        {ctx.invitationStatus === 'accepted' && !isClosed ? (
          <button
            className={styles.moreButton}
            type="button"
            onClick={onMore}
            aria-label="同行予定のメニューを開く"
            aria-haspopup="dialog"
            disabled={isActionLoading}
          >
            <Image className={styles.moreIcon} src="/images/discover/invite-preview/more.svg" alt="" width={20} height={4} />
          </button>
        ) : (
          <span className={styles.morePlaceholder} aria-hidden="true" />
        )}
      </div>
    </header>
  );
}

// ─── Terminal State Card (declined / cancelled) ────────────────────────────
function TerminalCard({ ctx, onDiscovery, onClose }: { ctx: FixedPlanContext; onDiscovery: () => void; onClose: () => void; }) {
  const isDeclined = ctx.invitationStatus === 'declined';
  const activityAreas = [ctx.sender_area_name, ctx.receiver_area_name]
    .filter(Boolean)
    .join(' × ');

  let primaryText = '';
  const secondaryText = '同行予定はキャンセルされました';

  if (isDeclined) {
    primaryText = ctx.isSender
      ? `${ctx.otherNickname}さんが今回は見送ることにしました`
      : 'このお誘いを見送りました';
  } else {
    // cancelled
    primaryText = ctx.cancelledByCurrentUser === true
      ? '今回は見送ることにしました'
      : ctx.cancelledByCurrentUser === false
        ? `${ctx.otherNickname}さんが今回は見送ることにしました`
        : ctx.isSender
          ? '今回は見送ることにしました'
          : `${ctx.otherNickname}さんが今回は見送ることにしました`;
  }

  return (
    <section
      className={styles.terminalSheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminal-state-title"
      aria-describedby="terminal-state-description"
    >
      <div className={styles.terminalHeading}>
        <div className={styles.terminalIcon} aria-hidden="true">
          <Image
            src="/images/discover/invite-preview/declined-calendar.svg"
            alt=""
            width={44}
            height={44}
          />
          <span className={styles.terminalIconBadge}>
            <Image
              src="/images/discover/invite-preview/declined-x.svg"
              alt=""
              width={10}
              height={10}
            />
          </span>
        </div>
        <h2 id="terminal-state-title">{primaryText}</h2>
        <p id="terminal-state-description">{secondaryText}</p>
      </div>

      <div
        className={`${styles.terminalPlanSummary} ${ctx.suggestedPlace?.imageUrl ? styles.terminalPlanSummaryWithImage : ''}`}
        aria-label="キャンセルされた同行予定"
      >
        {ctx.suggestedPlace?.imageUrl && (
          <>
            {/* The source is identical to the suggested-park photo used in the invitation card. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.terminalPlanImage}
              src={ctx.suggestedPlace.imageUrl}
              alt=""
              loading="eager"
              onError={(event) => { event.currentTarget.hidden = true; }}
            />
          </>
        )}
        <span className={styles.terminalPlanShade} aria-hidden="true" />
        <div className={styles.terminalPlanDetails}>
          <div>
            <Image src="/images/discover/invite-preview/calendar.svg" alt="" width={14} height={14} />
            <span>{ctx.days_of_week}{ctx.activityType === 'event' ? '' : ` ${ctx.start_time}ごろ`}</span>
          </div>
          {activityAreas && (
            <div>
              <Image src="/images/discover/invite-preview/location.svg" alt="" width={11} height={14} />
              <span>{activityAreas}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.terminalActions}>
        <button type="button" onClick={onDiscovery}>
          <Image src="/images/discover/invite-preview/declined-people.svg" alt="" width={15} height={13} />
          <span>他の人をみる</span>
        </button>
        <button type="button" onClick={onClose}>
          <Image src="/images/discover/invite-preview/declined-close.svg" alt="" width={14} height={14} />
          <span>トークを閉じる</span>
        </button>
      </div>
    </section>
  );
}

function SuggestedPlaceVisual({
  imageUrl,
  placeName,
}: {
  imageUrl: string | null;
  placeName: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageUrl && !imageFailed) {
    return (
      <div className={styles.suggestedPlaceVisual}>
        {/* The official Open Data host is loaded directly because its response is not compatible with the Next image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${placeName}の写真`}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.suggestedPlaceVisual} ${styles.suggestedPlacePlaceholder}`} aria-hidden="true">
      <svg className={styles.mapLines} viewBox="0 0 269 112" preserveAspectRatio="none">
        <path d="M-8 78C30 53 54 58 83 42s56-20 84-5 57 8 110-22" />
        <path d="M40-8c8 35 5 62-11 88s-13 38-4 47" />
        <path d="M221-7c-17 31-22 55-12 76s7 36-11 52" />
      </svg>
      <span className={styles.mapPin}>
        <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M20 10c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
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
  const activityAreas = [ctx.sender_area_name, ctx.receiver_area_name]
    .filter(Boolean)
    .join(' × ');

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
            <span>{ctx.days_of_week}{ctx.activityType === 'event' ? '' : ` ${ctx.start_time}ごろ`}</span>
          </div>
          {activityAreas && (
            <div>
              <Image src="/images/discover/invite-preview/accepted-location.svg" alt="" width={13} height={17} />
              <span>{activityAreas}</span>
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
        <section className={styles.invitationSummary} aria-label="同行のお誘い">
          <div className={styles.scheduleRow}>
            <Image src="/images/discover/invite-preview/calendar.svg" alt="" width={14} height={14} />
            <span>{ctx.days_of_week}{ctx.activityType === 'event' ? '' : ` ${ctx.start_time}ごろ`}</span>
          </div>
        {activityAreas && (
          <div className={styles.scheduleRow}>
            <Image className={styles.locationIcon} src="/images/discover/invite-preview/location.svg" alt="" width={11} height={14} />
            <span>{activityAreas}</span>
          </div>
        )}
        </section>
        <section className={styles.suggestedPlace} aria-label="おすすめの場所">
          {ctx.suggestedPlace ? (
            <>
              <SuggestedPlaceVisual
                key={ctx.suggestedPlace.imageUrl ?? ctx.suggestedPlace.name}
                imageUrl={ctx.suggestedPlace.imageUrl}
                placeName={ctx.suggestedPlace.name}
              />
              <div className={styles.suggestedPlaceBody}>
                <p className={styles.suggestedPlaceLabel}>
                  {ctx.suggestedPlace.kind === 'event' ? 'おすすめのイベント' : 'おすすめの場所'}
                </p>
                <h3>{ctx.suggestedPlace.name}</h3>
                {ctx.suggestedPlace.eventStartAt && (
                  <p className={styles.suggestedPlaceEventDate}>
                    {formatSuggestedEventDate(ctx.suggestedPlace.eventStartAt)}
                  </p>
                )}
                {ctx.suggestedPlace.placeName !== ctx.suggestedPlace.name && (
                  <p className={styles.suggestedPlaceEventVenue}>{ctx.suggestedPlace.placeName}</p>
                )}
                <p className={styles.suggestedPlaceSource}>{ctx.suggestedPlace.sourceName} Open Data</p>
                <dl className={styles.suggestedPlaceDistances}>
                  <div>
                    <dt>あなたから</dt>
                    <dd>約{formatApproximateDistance(ctx.suggestedPlace.viewerDistanceMeters)}</dd>
                  </div>
                  <div>
                    <dt>{ctx.otherNickname}さんから</dt>
                    <dd>約{formatApproximateDistance(ctx.suggestedPlace.otherDistanceMeters)}</dd>
                  </div>
                </dl>
                {ctx.suggestedPlace.eventStatus && ctx.suggestedPlace.eventStatus !== 'scheduled' && (
                  <p className={styles.suggestedPlaceUnavailable}>イベント情報が変更されています</p>
                )}
                {ctx.suggestedPlace.requiresHoursConfirmation && (
                  <p className={styles.suggestedPlaceHours}>営業時間・入場条件は公式ページでご確認ください</p>
                )}
                <p className={styles.suggestedPlaceNotice}>集合場所は同行成立後に確定します</p>
              </div>
            </>
          ) : (
            <>
              <SuggestedPlaceVisual imageUrl={null} placeName="おすすめの場所" />
              <div className={styles.suggestedPlaceBody}>
                <p className={styles.suggestedPlaceLabel}>おすすめの場所</p>
                <p className={styles.noSuggestedPlace}>同行成立後に集合場所を確認できます</p>
              </div>
            </>
          )}
        </section>
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

function formatApproximateDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters / 100) * 100}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function formatSuggestedEventDate(iso: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
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
  isConversationClosed = false,
}: ChatClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

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

  const handleSendImage = async (file: File) => {
    if (isUploadingImage || isSending) return;
    setIsUploadingImage(true);
    let storagePath: string | null = null;

    try {
      storagePath = await uploadChatImage({ conversationId, userId: currentUserId, file });
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: currentUserId,
          message_type: 'image',
          content: storagePath,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setMessages((previous) => {
          if (previous.some((message) => message.message_id === data.message_id)) return previous;
          return [...previous, data];
        });
      }
    } catch (error) {
      if (storagePath) {
        await deleteChatImage(storagePath);
      }
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tokyo',
    }).format(date);
  };

  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const hasMessageFromOther = messages.some(m => m.sender_user_id !== currentUserId);
  const isAloneInGroup = isGroupChat && participantCount <= 1 && !hasMessageFromOther;

  // ── Fixed Schedule Chat layout ──────────────────────────────────
  if (fixedPlanContext) {
    const ctx = fixedPlanContext;
    const connectionsBackUrl = ctx.invitationStatus === 'accepted' && !ctx.isConversationClosed
      ? '/connections?tab=plans'
      : '/connections';

    const handleCancel = async () => {
      if (isActionLoading) return;
      setIsActionLoading(true);
      const res = await cancelFixedScheduleInvitation(ctx.invitationId);
      if (res.success) {
        setIsCancelDialogOpen(false);
        router.refresh();
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

    const renderMessageList = (displayContext: FixedPlanContext) => (
      <div className={`${styles.messageList} ${displayContext.invitationStatus === 'accepted' ? styles.acceptedMessageList : ''}`}>
        {/* Invitation context card — always shown above messages */}
        <InvitationCard
          ctx={displayContext}
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
                messageType={msg.message_type}
                time={formatMessageTime(msg.created_at)}
                isMine={msg.sender_user_id === currentUserId}
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

    // Keep the existing conversation visible beneath the terminal-state scrim.
    // The background is inert and presents the invitation as it looked before it closed.
    if (ctx.isConversationClosed) {
      const terminalBackgroundContext: FixedPlanContext = {
        ...ctx,
        invitationStatus: 'pending',
        isConversationClosed: false,
      };

      return (
        <div className={`${styles.fixedPlanScreen} ${styles.terminalStateScreen}`}>
          <div className={styles.terminalBackground} aria-hidden="true" inert>
            <FixedPlanChatHeader
              ctx={terminalBackgroundContext}
              onBack={() => router.push(connectionsBackUrl)}
              onMore={() => {}}
              isActionLoading={false}
            />
            <main className={styles.fixedPlanMain}>{renderMessageList(terminalBackgroundContext)}</main>
            <footer className={styles.fixedPlanFooter}>
              <ChatComposer
                onSend={handleSend}
                onSendImage={handleSendImage}
                isSending={isSending}
                isUploadingImage={isUploadingImage}
                variant="fixed-plan"
              />
            </footer>
          </div>
          <div className={styles.terminalScrim} aria-hidden="true" />
          <div className={styles.terminalOverlay}>
            <TerminalCard
              ctx={ctx}
              onDiscovery={() => router.push(ctx.discoveryUrl)}
              onClose={() => router.push('/connections')}
            />
          </div>
        </div>
      );
    }

    const messageList = renderMessageList(ctx);

    return (
      <div className={styles.fixedPlanScreen}>
        <FixedPlanChatHeader
          ctx={ctx}
          onBack={() => router.push(connectionsBackUrl)}
          onMore={() => setIsCancelDialogOpen(true)}
          isActionLoading={isActionLoading}
        />
        <main className={styles.fixedPlanMain}>{messageList}</main>
        <footer className={styles.fixedPlanFooter}>
          <ChatComposer
            onSend={handleSend}
            onSendImage={handleSendImage}
            isSending={isSending}
            isUploadingImage={isUploadingImage}
            variant="fixed-plan"
          />
        </footer>
        {isCancelDialogOpen ? (
          <div className={styles.cancelDialogLayer} role="presentation">
            <button
              className={styles.cancelDialogScrim}
              type="button"
              aria-label="キャンセル確認を閉じる"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={isActionLoading}
            />
            <section
              className={styles.cancelDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-plan-title"
              aria-describedby="cancel-plan-description"
            >
              <h2 id="cancel-plan-title">同行予定をキャンセルしますか？</h2>
              <p id="cancel-plan-description">
                キャンセルすると、{ctx.otherNickname}さんに見送りの通知が届きます。
              </p>
              <div className={styles.cancelDialogActions}>
                <button type="button" onClick={() => setIsCancelDialogOpen(false)} disabled={isActionLoading}>
                  戻る
                </button>
                <button
                  type="button"
                  className={styles.confirmCancelButton}
                  onClick={handleCancel}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? '処理中...' : '同行予定をキャンセル'}
                </button>
              </div>
            </section>
          </div>
        ) : null}
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
                  messageType={msg.message_type}
                  time={formatMessageTime(msg.created_at)}
                  isMine={msg.sender_user_id === currentUserId}
                />
              ))}
            </div>
          )
        }
        inputArea={!isAloneInGroup && !isConversationClosed ? (
          <ChatComposer
            onSend={handleSend}
            onSendImage={handleSendImage}
            isSending={isSending}
            isUploadingImage={isUploadingImage}
          />
        ) : isConversationClosed ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#777', background: '#fff' }}>
            このトークは終了しました。履歴のみ確認できます。
          </div>
        ) : null}
      />
    </div>
  );
}
