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
        padding: '16px var(--page-padding-x) calc(16px + var(--safe-area-bottom))',
        backgroundColor: 'var(--color-bg-app)',
        borderTop: transparentBorder ? 'none' : '1px solid var(--color-divider)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 'var(--z-index-action)',
      }}
    >
      {children}
    </div>
  );
};
