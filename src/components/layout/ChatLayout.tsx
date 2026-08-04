import React from 'react';

interface ChatLayoutProps {
  header: React.ReactNode;
  messageList: React.ReactNode;
  inputArea: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  header,
  messageList,
  inputArea,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1, // Fill AppShell
        height: '100%',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <div style={{ flexShrink: 0, zIndex: 'var(--z-index-header)' }}>
        {header}
      </div>
      
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px var(--page-padding-x)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messageList}
      </div>

      <div
        style={{
          flexShrink: 0,
          paddingBottom: 'var(--safe-area-bottom)',
          backgroundColor: 'var(--color-bg-app)',
          borderTop: '1px solid var(--color-divider)',
          width: '100%', // Naturally constrained by parent AppShell's max-width
        }}
      >
        {inputArea}
      </div>
    </div>
  );
};
