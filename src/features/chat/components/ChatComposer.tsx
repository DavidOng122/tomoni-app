import React, { useState } from 'react';

interface ChatComposerProps {
  onSend: (message: string) => Promise<void>;
  isSending: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({ onSend, isSending }) => {
  const [text, setText] = useState('');

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    
    // Frontend limit as per plan
    if (trimmed.length > 500) {
      alert('メッセージは500文字以内で入力してください。');
      return;
    }

    try {
      await onSend(trimmed);
      setText(''); // clear on success
    } catch (e) {
      console.error('Failed to send:', e);
      alert('メッセージの送信に失敗しました。');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      gap: '12px'
    }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="メッセージを入力..."
        style={{
          flex: 1,
          borderRadius: '24px',
          border: '1px solid #E5E7EB',
          padding: '12px 16px',
          fontSize: '15px',
          outline: 'none',
          resize: 'none',
          minHeight: '44px',
          maxHeight: '120px',
          fontFamily: 'inherit'
        }}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <button
        onClick={handleSend}
        disabled={isSending || !text.trim()}
        style={{
          backgroundColor: text.trim() && !isSending ? '#FF8861' : '#E5E7EB',
          color: '#FFF',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: text.trim() && !isSending ? 'pointer' : 'not-allowed',
          flexShrink: 0
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', marginLeft: '-2px' }}>
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  );
};
