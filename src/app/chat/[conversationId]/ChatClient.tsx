'use client';

import React, { useState, useEffect } from 'react';
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

type MessageRow = Database['public']['Tables']['messages']['Row'];

// ─── Fixed Schedule context shape ───────────────────────────────────
export interface FixedPlanContext {
  invitationId: string;
  invitationStatus: string;
  isSender: boolean;
  otherNickname: string;
  otherAvatarUrl: string | null;
  activityLabel: string;
  inviteMessage: string;
  days_of_week: string;
  start_time: string;
  place_name: string;
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

// ─── UserAvatar ──────────────────────────────────────────────────────────────
function UserAvatar({ url, name, size = 50 }: { url: string | null; name: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: '#F0F0F0',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="#BDBDBD" strokeWidth="1.8" style={{ width: size * 0.55, height: size * 0.55 }}>
          <circle cx="12" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </svg>
      )}
    </div>
  );
}

// ─── Fixed Schedule Header ──────────────────────────────────────────
function FixedPlanChatHeader({
  ctx,
  onBack,
  onCancel,
  isActionLoading,
}: {
  ctx: FixedPlanContext;
  onBack: () => void;
  onCancel: () => void;
  isActionLoading: boolean;
}) {
  const isPending = ctx.invitationStatus === 'pending';

  return (
    <div style={{
      backgroundColor: '#fff',
      borderBottom: '1px solid #E9E9EB',
      paddingBottom: '12px',
    }}>
      {/* Row: back button */}
      <div style={{ padding: '12px 16px 8px' }}>
        <Button variant="ghost" onClick={onBack} style={{ padding: '0 8px' }} aria-label="戻る" disabled={isActionLoading}>
          <BackArrow />
        </Button>
      </div>

      {/* Centered identity */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        paddingBottom: '4px',
      }}>
        <UserAvatar url={ctx.otherAvatarUrl} name={ctx.otherNickname} size={50} />

        {/* Status badge */}
        {isPending ? (
          <span style={{
            display: 'inline-block',
            backgroundColor: '#FFF0F3',
            color: '#FF0000',
            fontSize: '11px',
            fontWeight: 590,
            lineHeight: '16px',
            letterSpacing: '0.5px',
            padding: '2px 10px',
            borderRadius: '999px',
          }}>
            返事待ち
          </span>
        ) : (
          <span style={{
            display: 'inline-block',
            backgroundColor: '#E8F5E9',
            color: '#2E7D32',
            fontSize: '11px',
            fontWeight: 590,
            lineHeight: '16px',
            letterSpacing: '0.5px',
            padding: '2px 10px',
            borderRadius: '999px',
          }}>
            同行予定
          </span>
        )}

        {/* Other user name */}
        <span style={{
          color: '#000',
          fontSize: '20px',
          fontWeight: 590,
          lineHeight: '16px',
          letterSpacing: '0.5px',
        }}>
          {ctx.otherNickname}
        </span>
      </div>

      {/* Sender-only cancel action when pending */}
      {isPending && ctx.isSender && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isActionLoading}
            style={{
              background: 'none',
              border: 'none',
              cursor: isActionLoading ? 'wait' : 'pointer',
              color: '#FF6900',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '20px',
              opacity: isActionLoading ? 0.5 : 1,
            }}
          >
            {isActionLoading ? '処理中...' : '招待を取り消す'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Invitation Context Card ─────────────────────────────────────────────────
function InvitationCard({ ctx, onAccept, onDecline, isActionLoading }: { ctx: FixedPlanContext, onAccept: () => void, onDecline: () => void, isActionLoading: boolean }) {
  const isPending = ctx.invitationStatus === 'pending';
  
  const headlineText = ctx.isSender
    ? `${ctx.otherNickname}さんにお誘いを送りました`
    : `${ctx.otherNickname}さんからお誘いが届いています`;

  return (
    <div style={{
      margin: '16px auto',
      width: '301px',
      maxWidth: 'calc(100% - 32px)',
      backgroundColor: '#fff',
      border: '1px solid #E9E9EB',
      borderRadius: '28px 16px 28px 28px',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
      padding: '16px',
    }}>
      {/* Headline + status badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '10px',
      }}>
        {isPending ? (
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1A2E24',
            lineHeight: '18px',
            flex: 1,
          }}>
            {headlineText}
          </span>
        ) : (
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1A2E24',
            lineHeight: '18px',
            flex: 1,
          }}>
            同行予定
          </span>
        )}
        {isPending && (
          <span style={{
            flexShrink: 0,
            display: 'inline-block',
            backgroundColor: '#FFF0F3',
            color: '#FF0000',
            fontSize: '11px',
            fontWeight: 590,
            lineHeight: '16px',
            letterSpacing: '0.5px',
            padding: '2px 8px',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
          }}>
            返事待ち
          </span>
        )}
      </div>

      {/* Invite message */}
      <p style={{
        color: '#1A2E24',
        fontSize: '15px',
        fontWeight: 700,
        lineHeight: '18.56px',
        margin: '0 0 12px',
      }}>
        {ctx.inviteMessage}
      </p>

      {/* Date / time / place block */}
      <div style={{
        backgroundColor: '#ECECEC',
        borderRadius: '10px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        {/* Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ color: '#000', fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 400, lineHeight: '11px' }}>
            {ctx.days_of_week} {ctx.start_time}ごろ
          </span>
        </div>

        {/* Place */}
        {ctx.place_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ color: '#000', fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 400, lineHeight: '11px' }}>
              {ctx.place_name}
            </span>
          </div>
        )}
      </div>

      {/* Receiver Actions when pending */}
      {isPending && !ctx.isSender && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={onDecline}
            disabled={isActionLoading}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              border: '1px solid #CCCCCC',
              borderRadius: '11px',
              color: '#000',
              fontSize: '14px',
              fontWeight: 500,
              padding: '10px 0',
              cursor: isActionLoading ? 'wait' : 'pointer',
              opacity: isActionLoading ? 0.5 : 1,
            }}
          >
            今回は見送る
          </button>
          <button
            onClick={onAccept}
            disabled={isActionLoading}
            style={{
              flex: 1,
              backgroundColor: '#FF7622',
              border: '1px solid #FF8861',
              borderRadius: '11px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              padding: '10px 0',
              cursor: isActionLoading ? 'wait' : 'pointer',
              opacity: isActionLoading ? 0.5 : 1,
            }}
          >
            一緒に行く
          </button>
        </div>
      )}
    </div>
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

    const messageList = (
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '16px' }}>
        {/* Invitation context card — always shown above messages */}
        <InvitationCard 
          ctx={ctx} 
          onAccept={handleAccept} 
          onDecline={handleDecline} 
          isActionLoading={isActionLoading} 
        />

        {/* Real messages only */}
        {messages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
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
        )}
      </div>
    );

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <FixedPlanChatHeader 
          ctx={ctx} 
          onBack={() => router.push('/connections?tab=plans')} 
          onCancel={handleCancel}
          isActionLoading={isActionLoading}
        />
        <ChatLayout
          header={null}
          messageList={messageList}
          inputArea={<ChatComposer onSend={handleSend} isSending={isSending} />}
        />
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
