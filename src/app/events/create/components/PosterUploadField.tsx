import React, { useRef } from 'react';
import styles from '../CreateEventView.module.css';

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
    <div className={styles.posterField}>
      <div className={styles.posterFrame}>
        {posterPreview ? (
          <img src={posterPreview} alt="Poster preview" className={styles.posterPreview} />
        ) : null}
        
        <button
          type="button"
          onClick={handleImageClick}
          className={styles.posterButton}
          aria-label="ポスター画像を選択"
        >
          <img src="/images/events/create/poster-upload.svg" alt="" aria-hidden="true" />
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={onImageChange} style={{ display: 'none' }} />
      </div>
    </div>
  );
};
