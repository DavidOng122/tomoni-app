import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  style,
  ...props
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  
  return (
    <button
      className="no-hover"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '44px',
        minHeight: isPrimary ? '48px' : '44px', // 44px min touch target, 48px for primary
        width: fullWidth ? '100%' : 'auto',
        padding: '12px 24px',
        borderRadius: '8px',
        border: isSecondary ? '1px solid var(--color-divider)' : 'none',
        backgroundColor: isPrimary ? 'var(--color-primary)' : isSecondary ? 'var(--color-surface)' : 'transparent',
        color: isPrimary ? '#ffffff' : 'var(--color-text)',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        transition: 'opacity 0.2s ease',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};
