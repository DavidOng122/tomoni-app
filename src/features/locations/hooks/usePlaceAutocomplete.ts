/// <reference types="@types/google.maps" />
import { useState, useCallback } from 'react';
import { initGooglePlaces } from '../lib/googlePlaces';
import { SelectedPlace } from '@/features/locations/types';

export const usePlaceAutocomplete = () => {
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAutocompleteSuggestions = useCallback(async (input: string) => {
    if (!input.trim()) {
      setPredictions([]);
      return;
    }
    
    setLoading(true);
    try {
      await initGooglePlaces();
      const request = { input };
      const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      if (response && response.suggestions) {
        // We map the new API suggestions to an object compatible with our component
        // Our component expects predictions to have place_id and description
        const mappedPredictions = response.suggestions.map(s => ({
          place_id: s.placePrediction?.placeId || '',
          description: s.placePrediction?.text?.text || '',
        }));
        setPredictions(mappedPredictions as any);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<SelectedPlace | null> => {
    try {
      await initGooglePlaces();
      const place = new window.google.maps.places.Place({ id: placeId });
      await place.fetchFields({ fields: ['id', 'displayName', 'location'] });
      
      if (place && place.location) {
        return {
          placeId: place.id || placeId,
          placeName: place.displayName ? (typeof place.displayName === 'string' ? place.displayName : (place.displayName as any).text || '') : '',
          latitude: place.location.lat(),
          longitude: place.location.lng(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }, []);

  return {
    predictions,
    loading,
    fetchAutocompleteSuggestions,
    getPlaceDetails
  };
};
