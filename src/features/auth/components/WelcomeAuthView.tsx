import React from 'react';
import styles from './WelcomeAuthView.module.css';
import { AuthProviderButton } from './AuthProviderButton';
import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import { EmailIcon } from './icons/EmailIcon';

export const WelcomeAuthView: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.brandSection}>
        <h1 className={styles.title}>
          いつもの地域で、
          <br />
          新しいつながりを
        </h1>
        <p className={styles.subtitle}>
          日常の予定や地域のイベントから、
          <br />
          近くの人と自然につながれます
        </p>
      </div>
      
      <div className={styles.actionSection}>
        <AuthProviderButton
          provider="google"
          icon={<GoogleIcon />}
        >
          Googleで続ける
        </AuthProviderButton>
        <AuthProviderButton
          provider="apple"
          icon={<AppleIcon />}
        >
          Appleで続ける
        </AuthProviderButton>
        <AuthProviderButton
          provider="email"
          icon={<EmailIcon />}
        >
          メールで続ける
        </AuthProviderButton>
      </div>
    </div>
  );
};
