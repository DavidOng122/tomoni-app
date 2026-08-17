'use client';

import React, { useLayoutEffect, useRef } from 'react';
import styles from '../CreateEventView.module.css';

interface EventDescriptionFieldProps {
  description: string;
  onChange: (val: string) => void;
}

export const EventDescriptionField: React.FC<EventDescriptionFieldProps> = ({ description, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = '0px';

    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight);
    const verticalPadding = Number.parseFloat(computedStyle.paddingTop)
      + Number.parseFloat(computedStyle.paddingBottom);
    const verticalBorder = Number.parseFloat(computedStyle.borderTopWidth)
      + Number.parseFloat(computedStyle.borderBottomWidth);
    const maximumContentHeight = lineHeight * 5 + verticalPadding;
    const nextHeight = Math.min(textarea.scrollHeight, maximumContentHeight) + verticalBorder;

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > Math.ceil(maximumContentHeight) ? 'auto' : 'hidden';
  };

  useLayoutEffect(() => {
    if (textareaRef.current) resizeTextarea(textareaRef.current);
  }, [description]);

  return (
    <div className={styles.descriptionField}>
      <textarea
        ref={textareaRef}
        placeholder="説明を追加"
        value={description}
        onChange={(event) => {
          resizeTextarea(event.currentTarget);
          onChange(event.currentTarget.value);
        }}
        className={styles.descriptionInput}
        rows={1}
      />
    </div>
  );
};
