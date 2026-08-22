export interface FetchedPublicPlaceCsv {
  sourceUrl: string;
  bytes: Uint8Array;
}

export async function fetchEdogawaPublicPlaceCsv(
  sourceUrl: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchedPublicPlaceCsv> {
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; YorimiOpenDataImporter/1.0)" },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: HTTP ${response.status}.`);
  }
  return {
    sourceUrl: response.url || sourceUrl,
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}
