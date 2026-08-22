import type { SelectedPlace } from '@/features/locations/types';

export const EDOGAWA_AREAS = [
  { name: '葛西', latitude: 35.6635, longitude: 139.8726 },
  { name: '西葛西', latitude: 35.6659, longitude: 139.8593 },
  { name: '船堀', latitude: 35.6837, longitude: 139.8643 },
  { name: '一之江', latitude: 35.6862, longitude: 139.8827 },
  { name: '瑞江', latitude: 35.6933, longitude: 139.8976 },
  { name: '篠崎', latitude: 35.7069, longitude: 139.9036 },
  { name: '小岩', latitude: 35.733, longitude: 139.8817 },
  { name: '平井', latitude: 35.7064, longitude: 139.8424 },
  { name: '松江', latitude: 35.6993, longitude: 139.8719 },
  { name: '鹿骨', latitude: 35.7166, longitude: 139.8913 },
] as const;

export type EdogawaAreaName = (typeof EDOGAWA_AREAS)[number]['name'];

export function getEdogawaAreaPlace(areaName: string): SelectedPlace | null {
  const area = EDOGAWA_AREAS.find((candidate) => candidate.name === areaName);
  if (!area) return null;

  return {
    placeId: '',
    placeName: area.name,
    latitude: area.latitude,
    longitude: area.longitude,
  };
}

export function getSelectedEdogawaAreaName(place: SelectedPlace | null): EdogawaAreaName | '' {
  if (!place) return '';
  return EDOGAWA_AREAS.some((area) => area.name === place.placeName)
    ? place.placeName as EdogawaAreaName
    : '';
}
