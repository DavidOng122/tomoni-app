import React from 'react';

type BottomInsetType = 'none' | 'nav' | 'action';

interface PageContainerProps {
  children: React.ReactNode;
  hasHeader?: boolean;
  bottomInset?: BottomInsetType;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  hasHeader = false,
  bottomInset = 'none',
  className = '',
}) => {
  // We no longer calculate safe-area-top in paddingTop if MobileHeader is sticky.
  // Sticky MobileHeader will push the content down naturally.
  // But if the header is missing, we might still want safe area top padding.
  let paddingTop = hasHeader ? '0px' : 'var(--safe-area-top)';

  // Explicit bottom inset
  let paddingBottom = 'var(--safe-area-bottom)';
  if (bottomInset === 'nav') {
    paddingBottom = 'calc(var(--nav-height) + var(--safe-area-bottom) + 16px)';
  } else if (bottomInset === 'action') {
    paddingBottom = 'calc(var(--fixed-action-height) + var(--safe-area-bottom) + 16px)';
  }

  return (
    <div
      className={className}
      style={{
        flex: 1,
        paddingLeft: 'var(--page-padding-x)',
        paddingRight: 'var(--page-padding-x)',
        paddingTop,
        paddingBottom,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
};
