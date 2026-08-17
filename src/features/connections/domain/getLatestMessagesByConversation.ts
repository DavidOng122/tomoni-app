interface ConversationMessage {
  conversation_id: string;
  content: string | null;
  created_at: string;
}

export interface LatestConversationMessage {
  content: string;
  created_at: string;
}

export function getLatestMessagesByConversation(messages: ConversationMessage[]) {
  const latestMessages = new Map<string, LatestConversationMessage>();

  for (const message of messages) {
    if (!message.content || latestMessages.has(message.conversation_id)) continue;

    latestMessages.set(message.conversation_id, {
      content: message.content,
      created_at: message.created_at,
    });
  }

  return latestMessages;
}
