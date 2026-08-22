import React, { useRef, useState } from 'react';
import Image from 'next/image';
import styles from './ChatComposer.module.css';

interface ChatComposerProps {
  onSend: (message: string) => Promise<void>;
  onSendImage: (file: File) => Promise<void>;
  isSending: boolean;
  isUploadingImage: boolean;
  variant?: 'default' | 'fixed-plan';
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  onSendImage,
  isSending,
  isUploadingImage,
  variant = 'default',
}) => {
  const [text, setText] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const isBusy = isSending || isUploadingImage;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    
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

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    setIsAttachmentMenuOpen(false);
    if (!file || isBusy) return;

    try {
      await onSendImage(file);
    } catch (error) {
      console.error('Failed to send image:', error);
      const message = error instanceof Error ? error.message : '';
      if (message === 'file_too_large') {
        alert('写真は10MB以内にしてください。');
      } else if (message === 'unsupported_type') {
        alert('JPEG、PNG、WebP、GIF形式の写真を選んでください。');
      } else {
        alert('写真の送信に失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const attachmentControl = (
    <div className={styles.attachmentControl}>
      <button
        className={styles.addButton}
        type="button"
        aria-label="写真を追加"
        aria-expanded={isAttachmentMenuOpen}
        onClick={() => setIsAttachmentMenuOpen((open) => !open)}
        disabled={isBusy}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {isAttachmentMenuOpen && (
        <div className={styles.attachmentMenu} role="menu" aria-label="写真の追加方法">
          <button type="button" role="menuitem" onClick={() => cameraInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z" />
              <circle cx="12" cy="13" r="3.25" />
            </svg>
            カメラ
          </button>
          <button type="button" role="menuitem" onClick={() => photoInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.5" y="4" width="17" height="16" rx="2" />
              <circle cx="9" cy="9" r="1.5" />
              <path d="m5.5 17 4-4 3 3 2-2 4 3" />
            </svg>
            写真
          </button>
        </div>
      )}
      <input
        ref={cameraInputRef}
        className={styles.hiddenFileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        onChange={handleImageSelection}
        tabIndex={-1}
      />
      <input
        ref={photoInputRef}
        className={styles.hiddenFileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageSelection}
        tabIndex={-1}
      />
    </div>
  );

  if (variant === 'fixed-plan') {
    return (
      <div className={styles.fixedPlanComposer}>
        {attachmentControl}
        <div className={styles.fixedPlanInputShell}>
          <textarea
            className={styles.fixedPlanInput}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
          />
          <button
            className={styles.sendButton}
            type="button"
            onClick={handleSend}
            disabled={isBusy || !text.trim()}
            aria-label="メッセージを送信"
          >
            <Image src="/images/discover/invite-preview/smile.svg" alt="" width={21} height={21} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.defaultComposer}>
      {attachmentControl}
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
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={handleSend}
        disabled={isBusy || !text.trim()}
        style={{
          backgroundColor: text.trim() && !isBusy ? '#FF8861' : '#E5E7EB',
          color: '#FFF',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: text.trim() && !isBusy ? 'pointer' : 'not-allowed',
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
