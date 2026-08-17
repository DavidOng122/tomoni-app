import React from 'react';

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-label="マイページを読み込み中"
      style={{ backgroundColor: '#FCFCFC', minHeight: '100dvh' }}
    >
      <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center', color: '#666' }}>
        読み込み中...
      </div>
    </div>
  );
}
