import type { OfficialEventValidationResult } from './officialEventImportTypes.ts';

export function filterOfficialEventCatalogEntry(
  result: OfficialEventValidationResult,
): OfficialEventValidationResult {
  if (result.kind === 'skipped' || result.event.recommendationTags.length > 0) {
    return result;
  }

  return {
    kind: 'skipped',
    reason: 'unsupported_recommendation_category',
    sourceUrl: result.event.officialUrl,
  };
}
