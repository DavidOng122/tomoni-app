import React, { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 'var(--z-index-overlay)',
        }}
        aria-hidden="true"
      />
      
      {/* Sheet Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        className="bottom-sheet-container"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(100%, var(--max-app-width))',
          maxHeight: '90dvh',
          backgroundColor: 'var(--color-surface)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '16px var(--page-padding-x) calc(16px + var(--safe-area-bottom))',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 'var(--z-index-modal)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Handle for visual dragging cue (no actual drag logic yet) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--color-divider)', borderRadius: '2px' }} />
        </div>

        {/* Header with Title and Explicit Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}></div>
          {title && (
            <h2 id="bottom-sheet-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600, textAlign: 'center', flex: 2 }}>
              {title}
            </h2>
          )}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              aria-label="Close"
              className="hoverable"
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                lineHeight: 1,
                cursor: 'pointer',
                color: 'var(--color-text)',
                padding: '8px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </>
  );
};
