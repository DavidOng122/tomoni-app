const EDOGAWA_IMAGE_HOST = 'www.city.edogawa.tokyo.jp';
const EDOGAWA_LIBRARY_IMAGE_HOST = 'www.library.city.edogawa.tokyo.jp';
const EDOGAWA_PARK_IMAGE_PATH_PREFIX = '/edg/park/';
const EDOGAWA_SPORTS_IMAGE_PATH_PREFIX = '/edg/map/sports/';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getPublicPlaceImageUrl(attributes: unknown): string | null {
  if (!isRecord(attributes)) {
    return null;
  }

  const mediaImageUrl = isRecord(attributes.media) && typeof attributes.media.image_url === 'string'
    ? [attributes.media.image_url]
    : [];
  const walkingImageUrls = isRecord(attributes.walking_place)
    && Array.isArray(attributes.walking_place.image_urls)
    ? attributes.walking_place.image_urls
    : [];
  const imageUrls = [...mediaImageUrl, ...walkingImageUrls];

  for (const candidate of imageUrls) {
    if (typeof candidate !== 'string' || candidate.trim() === '') {
      continue;
    }

    try {
      const url = new URL(candidate);
      if (
        !['http:', 'https:'].includes(url.protocol)
        || !(
          url.hostname === EDOGAWA_LIBRARY_IMAGE_HOST
          || (
            url.hostname === EDOGAWA_IMAGE_HOST
            && (
              url.pathname.startsWith(EDOGAWA_PARK_IMAGE_PATH_PREFIX)
              || url.pathname.startsWith(EDOGAWA_SPORTS_IMAGE_PATH_PREFIX)
            )
          )
        )
      ) {
        continue;
      }

      url.protocol = 'https:';
      return url.toString();
    } catch {
      continue;
    }
  }

  return null;
}
