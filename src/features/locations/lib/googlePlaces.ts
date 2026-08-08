/// <reference types="@types/google.maps" />

export const initGooglePlaces = async (): Promise<google.maps.PlacesLibrary> => {
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is missing');
  }
  
  if (typeof google === 'undefined' || !google.maps || !google.maps.importLibrary) {
    throw new Error('Google Maps script not loaded.');
  }

  const placesLibrary = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
  return placesLibrary;
};
