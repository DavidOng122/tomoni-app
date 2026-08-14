'use client';

import React, { useState } from 'react';
import { FigmaSentInvitation } from '@/lib/figmaSentInvitationSession';
import styles from './InvitePreview.module.css';

interface InvitePreviewProps {
  personName: string;
  avatarUrl: string | null;
  response: FigmaSentInvitation['response'];
  onResponseChange: (response: FigmaSentInvitation['response']) => void;
  onBack: () => void;
  onFindOthers: () => void;
  onClose: () => void;
}

export const InvitePreview: React.FC<InvitePreviewProps> = ({
  personName,
  avatarUrl,
  response,
  onResponseChange,
  onBack,
  onFindOthers,
  onClose,
}) => {
  const [isDeclinedOpen, setIsDeclinedOpen] = useState(response === 'declined');
  const isAccepted = response === 'accepted';

  const handleDecline = () => {
    onResponseChange('declined');
    setIsDeclinedOpen(true);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" onClick={onBack} className={styles.headerButton} aria-label="戻る">
            <img src="/images/discover/invite-preview/back.svg" alt="" aria-hidden="true" />
          </button>

          <div className={styles.personHeader}>
            <span className={styles.headerAvatar}>
              {avatarUrl ? <img src={avatarUrl} alt={personName} /> : null}
            </span>
            <span className={`${styles.waitingBadge} ${isAccepted ? styles.acceptedBadge : ''}`}>
              {isAccepted ? '同行予定' : '返事待ち'}
            </span>
            <strong>{personName}</strong>
          </div>

          <button type="button" className={styles.moreButton} aria-label="その他">
            <img src="/images/discover/invite-preview/more.svg" alt="" aria-hidden="true" />
          </button>
        </header>

        {isAccepted ? (
          <main className={`${styles.conversation} ${styles.acceptedConversation}`}>
            <section className={styles.acceptedEventCard} aria-label="同行予定">
              <div className={styles.acceptedTitleRow}>
                <h1>公園で朝の散歩会</h1>
                <span>
                  <img src="/images/discover/invite-preview/accepted-check.svg" alt="" aria-hidden="true" />
                  同行予定
                </span>
              </div>
              <div className={styles.acceptedMeta}>
                <div>
                  <img src="/images/discover/invite-preview/accepted-calendar.svg" alt="" aria-hidden="true" />
                  8月17日（月）8:00〜10:00
                </div>
                <div>
                  <img src="/images/discover/invite-preview/accepted-location.svg" alt="" aria-hidden="true" />
                  世田谷公園 正門
                </div>
              </div>
            </section>

            <div className={styles.acceptedMessageRow}>
              <div className={styles.acceptedBubble}>
                I’m in. Let’s do it! 12:30<br />tomorrow?
                <img src="/images/discover/invite-preview/accepted-tail.svg" alt="" aria-hidden="true" />
              </div>
              <time>9:20</time>
            </div>
          </main>
        ) : (
          <main className={styles.conversation}>
            <section className={styles.inviteCard} aria-label={`${personName}さんへのお誘い`}>
              <div className={styles.inviteBody}>
                <div className={styles.inviteMeta}>
                  <span>{personName}さんにお誘いを送りました</span>
                  <span className={styles.replyStatus}>
                    <img src="/images/discover/invite-preview/waiting.svg" alt="" aria-hidden="true" />
                    返信待ち
                  </span>
                </div>

                <h1>一緒に朝の散歩に行きませんか？</h1>

                <div className={styles.eventSummary}>
                  <div>
                    <img src="/images/discover/invite-preview/calendar.svg" alt="" aria-hidden="true" />
                    <span>8月17日（月）8:00〜10:00</span>
                  </div>
                  <div>
                    <img src="/images/discover/invite-preview/location.svg" alt="" aria-hidden="true" />
                    <span>世田谷公園 正門</span>
                  </div>
                </div>
              </div>

              <div className={styles.inviteActions}>
                <button type="button" onClick={handleDecline}>今回は見送る</button>
                <button
                  type="button"
                  className={styles.acceptButton}
                  onClick={() => onResponseChange('accepted')}
                >
                  一緒に同行
                </button>
              </div>
            </section>

            <div className={styles.messageBubble}>
              Let’s get lunch soon! When are you free? 🤗
            </div>
          </main>
        )}

        <div className={styles.composer}>
          <button type="button" className={styles.addButton} aria-label="追加">
            <img src="/images/discover/invite-preview/add.svg" alt="" aria-hidden="true" />
          </button>
          <label className={styles.messageInput}>
            <span className={styles.visuallyHidden}>メッセージ</span>
            <input type="text" placeholder="メッセージを入力..." />
            <img src="/images/discover/invite-preview/smile.svg" alt="" aria-hidden="true" />
          </label>
        </div>
      </div>

      {isDeclinedOpen && (
        <div className={styles.declinedOverlay} role="dialog" aria-modal="true" aria-labelledby="declined-title">
          <section className={styles.declinedSheet}>
            <div className={styles.declinedCopy}>
              <span className={styles.declinedIcon}>
                <img src="/images/discover/invite-preview/declined-calendar.svg" alt="" aria-hidden="true" />
                <img src="/images/discover/invite-preview/declined-x.svg" alt="" aria-hidden="true" />
              </span>
              <h2 id="declined-title">{personName}さんが今回は見送ることにしました</h2>
              <p>同行予定はキャンセルされました</p>
            </div>

            <div className={styles.declinedEvent}>
              <div>
                <img src="/images/discover/invite-preview/calendar.svg" alt="" aria-hidden="true" />
                8月17日（月）8:00〜10:00
              </div>
              <div>
                <img src="/images/discover/invite-preview/location.svg" alt="" aria-hidden="true" />
                世田谷公園 正門
              </div>
            </div>

            <div className={styles.declinedActions}>
              <button type="button" onClick={onFindOthers}>
                <img src="/images/discover/invite-preview/declined-people.svg" alt="" aria-hidden="true" />
                他の人をみる
              </button>
              <button type="button" onClick={onClose}>
                <img src="/images/discover/invite-preview/declined-close.svg" alt="" aria-hidden="true" />
                トークを閉じる
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
