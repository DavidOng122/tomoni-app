import React from 'react';
import styles from './AuthProviderButton.module.css';

export interface AuthProviderButtonProps {
  provider: 'google' | 'apple' | 'email';
  children?: React.ReactNode;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export const AuthProviderButton: React.FC<AuthProviderButtonProps> = ({
  children,
  label,
  loading = false,
  disabled = false,
  onClick,
  icon,
}) => {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      <div className={styles.iconContainer}>
        {loading ? <div className={styles.spinner} /> : icon}
      </div>
      <span className={styles.label}>{children || label}</span>
      {/* Right spacer for grid alignment */}
      <div aria-hidden="true" />
    </button>
  );
};
