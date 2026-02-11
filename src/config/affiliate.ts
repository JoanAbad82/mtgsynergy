export const AMAZON_ASSOC_TAG =
  import.meta.env.PUBLIC_AMAZON_ASSOC_TAG ?? "";

export const AMAZON_REGION = "es";
export const AMAZON_BASE_URL = "https://www.amazon.es";

export function buildAmazonUrl(opts: {
  url?: string;
  asin?: string;
  keywords?: string;
}): string {
  try {
    let baseUrl = "";

    if (opts.url) {
      baseUrl = opts.url;
    } else if (opts.asin) {
      baseUrl = `${AMAZON_BASE_URL}/dp/${opts.asin}/`;
    } else if (opts.keywords) {
      baseUrl = `${AMAZON_BASE_URL}/s?k=${encodeURIComponent(
        opts.keywords
      )}`;
    } else {
      return "";
    }

    if (!AMAZON_ASSOC_TAG) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    if (!url.searchParams.has("tag")) {
      url.searchParams.set("tag", AMAZON_ASSOC_TAG);
    }
    return url.toString();
  } catch {
    return "";
  }
}
