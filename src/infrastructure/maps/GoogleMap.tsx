'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from './loadGoogleMaps';

interface GoogleMapProps {
  latitude: number;
  longitude: number;
  placeName: string;
  className?: string;
}

export function GoogleMap({
  latitude,
  longitude,
  placeName,
  className,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let marker: google.maps.Marker | null = null;
    let disposed = false;

    loadGoogleMaps()
      .then((maps) => {
        if (disposed || !containerRef.current) return;

        const position = { lat: latitude, lng: longitude };
        const map = new maps.Map(containerRef.current, {
          center: position,
          zoom: 16,
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: 'cooperative',
        });

        marker = new maps.Marker({
          map,
          position,
          title: placeName,
        });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      marker?.setMap(null);
    };
  }, [latitude, longitude, placeName]);

  if (failed) {
    return (
      <div className={className} role="img" aria-label={`${placeName}の地図`}>
        <span>{placeName}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={`${placeName}のGoogleマップ`}
    />
  );
}
