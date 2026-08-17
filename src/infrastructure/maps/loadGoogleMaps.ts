/// <reference types="@types/google.maps" />

let googleMapsPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing'));
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise<typeof google.maps>((resolve, reject) => {
      const finishLoading = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
          return;
        }

        googleMapsPromise = null;
        reject(new Error('Google Maps loaded without the Maps API'));
      };

      const failLoading = () => {
        googleMapsPromise = null;
        reject(new Error('Failed to load Google Maps'));
      };

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src*="maps.googleapis.com/maps/api/js"]',
      );
      if (existingScript) {
        existingScript.addEventListener('load', finishLoading, { once: true });
        existingScript.addEventListener('error', failLoading, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', finishLoading, { once: true });
      script.addEventListener('error', failLoading, { once: true });
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}
