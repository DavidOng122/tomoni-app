import React, { useState, useEffect, useRef } from 'react';
import { usePlaceAutocomplete } from '@/features/locations/hooks/usePlaceAutocomplete';
import { SelectedPlace } from '@/features/locations/types';

interface LocationAutocompleteProps {
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
  className?: string;
  placeholder?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({ value, onChange, className, placeholder }) => {
  const { predictions, fetchAutocompleteSuggestions, getPlaceDetails } = usePlaceAutocomplete();
  const [inputValue, setInputValue] = useState(value?.placeName || '');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(value.placeName);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (!val) {
      onChange(null);
      setIsOpen(false);
    } else {
      fetchAutocompleteSuggestions(val);
      setIsOpen(true);
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    setInputValue(description);
    setIsOpen(false);
    const placeDetails = await getPlaceDetails(placeId);
    if (placeDetails) {
      // getPlaceDetails returns { placeId, placeName, latitude, longitude }
      // We override placeName with the prediction description for better display
      onChange({ ...placeDetails, placeName: description });
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (inputValue && predictions.length > 0) setIsOpen(true);
        }}
      />
      {isOpen && predictions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          border: '1px solid #eee',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginTop: '4px',
          padding: 0,
          margin: '4px 0 0 0',
          listStyle: 'none',
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onClick={() => handleSelect(p.place_id, p.description)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f5f5f5',
                fontSize: '14px',
                color: '#333'
              }}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
