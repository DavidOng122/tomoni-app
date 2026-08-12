import React from 'react';
import { LocationAutocomplete } from '@/features/locations/components/LocationAutocomplete';
import { SelectedPlace } from '@/features/locations/types';

interface EventLocationFieldProps {
  selectedPlace: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
  error?: string;
}

export const EventLocationField: React.FC<EventLocationFieldProps> = ({ selectedPlace, onChange, error }) => {
  return (
    <div>
      <div 
        style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '4px 19px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: error ? '1px solid red' : 'none'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#959595" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <LocationAutocomplete 
          value={selectedPlace} 
          onChange={onChange} 
          placeholder="場所を選択"
          className="location-input"
        />
        <style>{`
          .location-input {
            width: 100%;
            padding: 12px 0;
            border: none;
            background: transparent;
            font-size: 15px;
            font-weight: 510;
            outline: none;
            color: ${selectedPlace ? 'black' : '#959595'};
          }
        `}</style>
      </div>
      {error && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px', paddingLeft: '8px' }}>{error}</div>}
    </div>
  );
};
