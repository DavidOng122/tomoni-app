import React from 'react';

interface EventDescriptionFieldProps {
  description: string;
  onChange: (val: string) => void;
}

export const EventDescriptionField: React.FC<EventDescriptionFieldProps> = ({ description, onChange }) => {
  return (
    <div>
      <textarea 
        placeholder="説明を追加"
        value={description}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '16px 19px',
          borderRadius: '14px',
          border: 'none',
          background: '#fff',
          fontSize: '15px',
          fontWeight: 510,
          outline: 'none',
          minHeight: '80px',
          resize: 'vertical',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      />
    </div>
  );
};
