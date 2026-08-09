/// <reference types="@types/google.maps" />

let googleMapsPromise: Promise<void> | null = null;

export const initGooglePlaces = async (): Promise<google.maps.PlacesLibrary> => {
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is missing');
  }
  
  if (typeof window !== 'undefined') {
    if (!window.google?.maps) {
      if (!googleMapsPromise) {
        googleMapsPromise = new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
          if (existingScript) {
            existingScript.addEventListener('load', () => resolve());
            existingScript.addEventListener('error', () => {
              googleMapsPromise = null;
              reject(new Error('Existing Google Maps script failed to load'));
            });
            if (existingScript.getAttribute('data-loaded') === 'true') {
               resolve();
            }
            return;
          }

          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            script.setAttribute('data-loaded', 'true');
            resolve();
          };
          script.onerror = () => {
            googleMapsPromise = null;
            reject(new Error('Failed to load Google Maps script'));
          };
          document.head.appendChild(script);
        });
      }
      await googleMapsPromise;
    }

    const placesLibrary = await window.google.maps.importLibrary("places") as google.maps.PlacesLibrary;
    return placesLibrary;
  }
  
  throw new Error('Cannot load Google Maps on server');
};
