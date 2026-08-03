import React from 'react';

interface MobileHeaderProps {
  title?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  leftElement,
  rightElement,
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        width: '100%',
        height: 'calc(var(--header-height) + var(--safe-area-top))',
        paddingTop: 'var(--safe-area-top)',
        backgroundColor: 'var(--color-bg-app)',
        borderBottom: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 'var(--page-padding-x)',
        paddingRight: 'var(--page-padding-x)',
        zIndex: 'var(--z-index-header)',
      }}
    >
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
        {leftElement}
      </div>
      
      {title && (
        <h1
          style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: 600,
            textAlign: 'center',
            flex: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h1>
      )}

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {rightElement}
      </div>
    </header>
  );
};
