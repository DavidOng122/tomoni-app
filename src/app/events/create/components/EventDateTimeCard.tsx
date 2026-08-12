import React from 'react';

interface EventDateTimeCardProps {
  startAt: string;
  endAt: string;
  onChangeStart: (val: string) => void;
  onChangeEnd: (val: string) => void;
  error?: string;
}

export const EventDateTimeCard: React.FC<EventDateTimeCardProps> = ({ startAt, endAt, onChangeStart, onChangeEnd, error }) => {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '17px',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: error ? '1px solid red' : 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#959595' }}></div>
          <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>開始</span>
        </div>
        <input 
          type="datetime-local" 
          value={startAt}
          onChange={(e) => onChangeStart(e.target.value)}
          style={{ fontSize: '15px', fontWeight: 510, color: 'black', border: 'none', background: 'transparent', outline: 'none' }}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid #959595' }}></div>
          <span style={{ fontSize: '15px', fontWeight: 510, color: 'black' }}>終了</span>
        </div>
        <input 
          type="datetime-local" 
          value={endAt}
          onChange={(e) => onChangeEnd(e.target.value)}
          style={{ fontSize: '15px', fontWeight: 510, color: 'black', border: 'none', background: 'transparent', outline: 'none' }}
        />
      </div>
      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
};
