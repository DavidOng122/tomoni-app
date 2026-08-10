"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/infrastructure/auth/client';
import { Button } from '@/components/ui/Button';
import styles from './EmailAuthForm.module.css';

interface EmailAuthFormProps {
  onBack: () => void;
}

export const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onBack }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        
        if (data.user && !data.session) {
          setVerificationSent(true);
        } else {
          // if auto-confirmed (shouldn't happen with our config, but just in case)
          window.location.reload();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        // Successful login, rely on page reload or routing logic in proxy/server
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className={styles.page}>
        <div className={styles.verificationPanel}>
          <div className={styles.brand} aria-label="Yorimi">
            <Image src="/images/welcome/brand-mark.svg" alt="" width={35} height={35} />
            <span>Yorimi</span>
          </div>
          <div className={styles.verificationCopy}>
            <h1>確認メールを送信しました</h1>
            <p>メールボックスをご確認の上、リンクをクリックして登録を完了してください。</p>
          </div>
          <Button onClick={onBack} variant="outline" fullWidth className={styles.secondaryButton}>
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backButton} onClick={onBack} aria-label="戻る">
        <Image src="/images/welcome/auth-back.svg" alt="" width={21} height={23} />
      </button>

      <div className={styles.content}>
        <div className={styles.brand} aria-label="Yorimi">
          <Image src="/images/welcome/brand-mark.svg" alt="" width={35} height={35} />
          <span>Yorimi</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <h1 className={styles.title}>{isSignUp ? '新規登録' : 'ログイン'}</h1>

          {error && <div className={styles.error} role="alert">{error}</div>}

          <div className={styles.fields}>
            <label className={styles.inputShell} htmlFor="email">
              <span className={styles.srOnly}>メールアドレス</span>
              <Image src="/images/welcome/auth-email.svg" alt="" width={20} height={20} />
              <input
                id="email"
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className={styles.inputShell} htmlFor="password">
              <span className={styles.srOnly}>パスワード</span>
              <Image src="/images/welcome/auth-lock.svg" alt="" width={20} height={20} />
              <input
                id="password"
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <span className={styles.eyeIcon} aria-hidden="true">
                <Image src="/images/welcome/auth-eye.svg" alt="" width={20} height={20} />
              </span>
            </label>
          </div>

          <Button type="submit" loading={loading} fullWidth className={styles.submitButton}>
            {isSignUp ? '登録する' : 'ログインする'}
          </Button>

          <button
            type="button"
            className={styles.modeToggle}
            onClick={() => setIsSignUp(!isSignUp)}
          >
            <span>{isSignUp ? '既にアカウントをお持ちの方は' : 'アカウントをお持ちでない方は'}</span>
            <strong>こちら</strong>
          </button>
        </form>
      </div>
    </div>
  );
};
