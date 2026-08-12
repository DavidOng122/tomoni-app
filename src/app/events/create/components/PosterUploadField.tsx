import React, { useRef } from 'react';

interface PosterUploadFieldProps {
  posterPreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PosterUploadField: React.FC<PosterUploadFieldProps> = ({ posterPreview, onImageChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div 
        style={{
          position: 'relative',
          width: '199px',
          height: '192px',
          borderRadius: '18px',
          background: '#D9D9D9',
          overflow: 'hidden'
        }}
      >
        {posterPreview ? (
          <img src={posterPreview} alt="Poster preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Gray placeholder */}
          </div>
        )}
        
        <button 
          onClick={handleImageClick}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '29px',
            background: '#fff',
            border: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={onImageChange} style={{ display: 'none' }} />
      </div>
    </div>
  );
};
