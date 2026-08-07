"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/infrastructure/auth/client';
import { Button } from '@/components/ui/Button';

interface SignOutButtonProps {
  label?: string;
  variant?: 'primary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

export const SignOutButton: React.FC<SignOutButtonProps> = ({ 
  label = 'ログアウト', 
  variant = 'outline',
  fullWidth = false 
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace('/welcome');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleSignOut} 
      variant={variant} 
      loading={loading}
      fullWidth={fullWidth}
    >
      {label}
    </Button>
  );
};
