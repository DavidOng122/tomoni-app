'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createChatImageSignedUrl } from '@/infrastructure/chat/chatImageStorage';

export function ChatImage({ storagePath }: { storagePath: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    createChatImageSignedUrl(storagePath)
      .then((signedUrl) => {
        if (active) {
          setImageUrl(signedUrl);
          setHasError(false);
        }
      })
      .catch(() => {
        if (active) {
          setImageUrl(null);
          setHasError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [storagePath]);

  if (hasError) {
    return (
      <span role="img" aria-label="画像を読み込めませんでした" style={{ display: 'block', padding: '18px 20px' }}>
        画像を読み込めませんでした
      </span>
    );
  }

  if (!imageUrl) {
    return <span aria-label="画像を読み込み中" style={{ display: 'block', width: '220px', height: '165px' }} />;
  }

  return (
    <Image
      src={imageUrl}
      alt="送信された写真"
      width={440}
      height={330}
      sizes="(max-width: 480px) 64vw, 240px"
      unoptimized
      style={{ display: 'block', width: 'min(64vw, 240px)', height: 'auto', maxHeight: '320px', objectFit: 'cover' }}
    />
  );
}
