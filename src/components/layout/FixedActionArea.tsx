import React from 'react';

interface FixedActionAreaProps {
  children: React.ReactNode;
  transparentBorder?: boolean;
}

export const FixedActionArea: React.FC<FixedActionAreaProps> = ({ 
  children, 
  transparentBorder = false 
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(100%, var(--max-app-width))',
        padding: '12px 26px calc(12px + var(--safe-area-bottom))',
        backgroundColor: 'var(--color-bg-app)',
        borderTop: transparentBorder ? '1px solid rgba(229, 231, 235, 0.72)' : '1px solid var(--color-divider)',
        boxShadow: '0 -8px 24px rgba(16, 24, 40, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        zIndex: 'var(--z-index-action)',
      }}
    >
      {children}
    </div>
  );
};
