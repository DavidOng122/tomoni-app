export function toTotalEventCapacity(recruitingCount: number | null | undefined): number | null {
  if (recruitingCount === null || recruitingCount === undefined) return null;
  if (!Number.isSafeInteger(recruitingCount) || recruitingCount < 1 || recruitingCount >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Recruiting count must be a positive integer.');
  }
  return recruitingCount + 1;
}
