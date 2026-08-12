import React from 'react';

interface EventTitleFieldProps {
  title: string;
  onChange: (val: string) => void;
  error?: string;
}

export const EventTitleField: React.FC<EventTitleFieldProps> = ({ title, onChange, error }) => {
  return (
    <div>
      <input 
        type="text" 
        placeholder="イベント名" 
        value={title}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '16px 19px',
          borderRadius: '14px',
          border: error ? '1px solid red' : 'none',
          background: '#fff',
          fontSize: '18px',
          fontWeight: 590,
          outline: 'none',
          color: 'black',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      />
      {error && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px', paddingLeft: '8px' }}>{error}</div>}
    </div>
  );
};
