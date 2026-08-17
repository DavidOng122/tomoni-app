/// <reference types="@types/google.maps" />

import { loadGoogleMaps } from '@/infrastructure/maps/loadGoogleMaps';

export const initGooglePlaces = async (): Promise<google.maps.PlacesLibrary> => {
  const maps = await loadGoogleMaps();
  return maps.importLibrary('places') as Promise<google.maps.PlacesLibrary>;
};
