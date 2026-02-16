export function getShareTokenFromUrl(url: URL): string | null {
  return url.searchParams.get("s");
}

export function setShareTokenInUrl(url: URL, token: string): URL {
  const next = new URL(url.toString());
  next.searchParams.set("s", token);
  return next;
}

export function buildShareUrl(currentUrl: URL, token: string): string {
  return setShareTokenInUrl(currentUrl, token).toString();
}
