/// <reference types="@types/google.maps" />

export const initGooglePlaces = async (): Promise<google.maps.PlacesLibrary> => {
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is missing');
  }
  
  if (typeof window !== 'undefined') {
    if (typeof window.google === 'undefined' || !window.google.maps) {
      // Dynamic load
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.head.appendChild(script);
      });
    }
  }

  // We loaded with &libraries=places, so google.maps.places is available synchronously.
  // We can return the places library manually or just return google.maps as any since we use it directly.
  return window.google.maps.places as any;
};
