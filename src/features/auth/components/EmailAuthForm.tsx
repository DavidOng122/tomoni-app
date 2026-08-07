"use client";

import React, { useState } from 'react';
import { createClient } from '@/infrastructure/auth/client';
import { Button } from '@/components/ui/Button';
import styles from './WelcomeAuthView.module.css';

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
      <div className={styles.container}>
        <div className={styles.brandSection}>
          <h1 className={styles.title}>確認メールを送信しました</h1>
          <p className={styles.subtitle}>
            メールボックスをご確認の上、リンクをクリックして登録を完了してください。
          </p>
        </div>
        <div className={styles.actionSection}>
          <Button onClick={onBack} variant="outline" fullWidth>
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.brandSection}>
        <h1 className={styles.title}>{isSignUp ? '新規登録' : 'ログイン'}</h1>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.actionSection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <div style={{ color: 'red', fontSize: '14px' }}>{error}</div>}
        
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>メールアドレス</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>
        
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>パスワード</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>

        <Button type="submit" loading={loading} fullWidth>
          {isSignUp ? '登録する' : 'ログインする'}
        </Button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setIsSignUp(!isSignUp)}
            fullWidth
          >
            {isSignUp ? '既にアカウントをお持ちの方はこちら' : 'アカウントをお持ちでない方はこちら'}
          </Button>
          
          <Button type="button" variant="outline" onClick={onBack} fullWidth>
            戻る
          </Button>
        </div>
      </form>
    </div>
  );
};
