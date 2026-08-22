const MAX_EVENT_PAGE_BYTES = 2 * 1024 * 1024;

export interface FetchedEdogawaEventPage {
  sourceUrl: string;
  html: string;
}

export async function fetchEdogawaEventPage(
  sourceUrl: string,
  options: { signal?: AbortSignal } = {},
): Promise<FetchedEdogawaEventPage> {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || url.hostname !== "www.city.edogawa.tokyo.jp") {
    throw new Error("Only official Edogawa HTTPS event pages may be fetched.");
  }

  const response = await fetch(url, {
    headers: { "user-agent": "Yorimi-Edogawa-Event-Importer/1.0" },
    redirect: "follow",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Edogawa event request failed with HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(`Expected an HTML event page, received ${contentType || "unknown content type"}.`);
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_EVENT_PAGE_BYTES) {
    throw new Error("Edogawa event page exceeds the importer size limit.");
  }

  const html = await response.text();
  if (Buffer.byteLength(html, "utf8") > MAX_EVENT_PAGE_BYTES) {
    throw new Error("Edogawa event page exceeds the importer size limit.");
  }

  return {
    sourceUrl: response.url || url.toString(),
    html,
  };
}
