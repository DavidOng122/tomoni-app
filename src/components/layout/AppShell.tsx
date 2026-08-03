import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div
      style={{
        margin: '0 auto',
        maxWidth: 'var(--max-app-width)',
        width: '100%',
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg-app)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      }}
    >
      {children}
    </div>
  );
};
