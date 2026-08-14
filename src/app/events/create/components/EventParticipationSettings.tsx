import React from 'react';
import styles from '../CreateEventView.module.css';

interface EventParticipationSettingsProps {
  approvalRequired: boolean;
  recruitingCount: number | null;
  onChangeApproval: (val: boolean) => void;
  onChangeRecruitingCount: (val: number | null) => void;
}

export const EventParticipationSettings: React.FC<EventParticipationSettingsProps> = ({
  approvalRequired,
  recruitingCount,
  onChangeApproval,
  onChangeRecruitingCount
}) => {
  return (
    <div>
      <span className={styles.settingsLabel}>
        参加設定
      </span>
      <div className={styles.settingsCard}>
        <div className={styles.settingRow}>
          <div className={styles.settingCopy}>
            <img src="/images/events/create/approval.svg" alt="" aria-hidden="true" />
            <span>承認制</span>
          </div>
          <button
            type="button"
            onClick={() => onChangeApproval(!approvalRequired)}
            className={styles.switch}
            data-selected={approvalRequired}
            role="switch"
            aria-checked={approvalRequired}
            aria-label="承認制"
          >
            <span className={styles.switchKnob} />
          </button>
        </div>

        <div className={styles.settingDivider} aria-hidden="true" />
        <div className={styles.settingRow}>
          <div className={styles.settingCopy}>
            <img src="/images/events/create/people.svg" alt="" aria-hidden="true" />
            <span>あと何人募集しますか？</span>
          </div>
          <select 
            value={recruitingCount || ''} 
            onChange={(e) => onChangeRecruitingCount(Number(e.target.value))}
            className={styles.countSelect}
            data-selected={Boolean(recruitingCount)}
          >
            <option value="" disabled>選択</option>
            {[...Array(20)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1}人</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
