"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './WelcomeAuthView.module.css';
import { AuthProviderButton } from './AuthProviderButton';
import { GoogleIcon } from './icons/GoogleIcon';
import { AppleIcon } from './icons/AppleIcon';
import { EmailIcon } from './icons/EmailIcon';
import { EmailAuthForm } from './EmailAuthForm';
import { createClient } from '@/infrastructure/auth/client';

export const WelcomeAuthView: React.FC = () => {
  const searchParams = useSearchParams();
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  let urlErrorText: string | null = null;
  const errorParam = searchParams.get('error');
  if (errorParam) {
    switch (errorParam) {
      case 'missing_code':
      case 'missing_token':
        urlErrorText = '認証情報が不足しています。もう一度お試しください。';
        break;
      case 'exchange_failed':
      case 'verification_failed':
        urlErrorText = '認証に失敗しました。時間をおいて再度お試しください。';
        break;
      default:
        urlErrorText = 'エラーが発生しました。もう一度お試しください。';
    }
  }

  const displayErrorMessage = errorMessage || urlErrorText;

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    setErrorMessage(null);
    
    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage('Googleログインに失敗しました。');
      setIsGoogleLoading(false);
    }
  };

  if (isEmailMode) {
    return <EmailAuthForm onBack={() => setIsEmailMode(false)} />;
  }

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
        {displayErrorMessage && (
          <div style={{ color: 'red', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            {displayErrorMessage}
          </div>
        )}
        <AuthProviderButton
          provider="google"
          icon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          loading={isGoogleLoading}
        >
          Googleで続ける
        </AuthProviderButton>
        <AuthProviderButton
          provider="apple"
          icon={<AppleIcon />}
          disabled
        >
          Appleで続ける 準備中
        </AuthProviderButton>
        <AuthProviderButton
          provider="email"
          icon={<EmailIcon />}
          onClick={() => setIsEmailMode(true)}
        >
          メールで続ける
        </AuthProviderButton>
      </div>
    </div>
  );
};
