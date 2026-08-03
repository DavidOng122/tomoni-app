import React from 'react';

interface BottomNavigationItem {
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
}

interface BottomNavigationProps {
  items: BottomNavigationItem[];
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ items }) => {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(100%, var(--max-app-width))',
        height: 'calc(var(--nav-height) + var(--safe-area-bottom))',
        paddingBottom: 'var(--safe-area-bottom)',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 'var(--z-index-nav)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.02)',
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className="hoverable"
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            border: 'none',
            background: 'transparent',
            padding: '8px 0',
            cursor: 'pointer',
            color: item.isActive ? 'var(--color-primary)' : 'var(--color-text)',
            opacity: item.isActive ? 1 : 0.6,
            minWidth: '44px',
            minHeight: '44px',
            transition: 'background-color 0.2s ease',
          }}
        >
          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.icon}
          </div>
          <span style={{ fontSize: '11px', fontWeight: item.isActive ? 600 : 400 }}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
};
