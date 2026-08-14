'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/infrastructure/auth/client';
import { Database } from '@/types/database.types';
import { ChatLayout } from '@/components/layout/ChatLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { ChatMessage } from '@/features/chat/components/ChatMessage';
import { ChatComposer } from '@/features/chat/components/ChatComposer';

type MessageRow = Database['public']['Tables']['messages']['Row'];

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
}

export default function ChatClient({
  conversationId,
  currentUserId,
  initialMessages,
  eventContext,
  otherNickname
}: ChatClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
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

    return () => {
      supabase.removeChannel(channel);
    };
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
          content
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

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
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${m}月${day}日 ${h}:${min}`;
  };

  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ChatLayout
        header={
          <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <MobileHeader 
              title={`${otherNickname}さん`} 
              leftElement={
                <Button variant="ghost" onClick={() => router.push('/connections')} style={{ padding: '0 8px' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </Button>
              } 
            />
            <div style={{ padding: '8px 16px', backgroundColor: '#F9FAFB', margin: '0 16px 12px 16px', borderRadius: '8px', fontSize: '13px', color: '#4B5563' }}>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>同行予定: {eventContext.title}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatEventTime(eventContext.start_at)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {eventContext.place_name}
                </span>
              </div>
            </div>
          </div>
        }
        messageList={
          messages.length === 0 ? (
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
        inputArea={<ChatComposer onSend={handleSend} isSending={isSending} />}
      />
    </div>
  );
}
