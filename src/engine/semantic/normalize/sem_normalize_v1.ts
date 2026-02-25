export const SEM_NORMALIZE_VERSION = 1 as const;

export function normalizeOracleTextV1(text: string): string {
  if (text == null) return "";
  let normalized = text;
  normalized = normalized
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-");
  normalized = normalized.replace(/\([^)]*?\)/g, "");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

export function isIdempotentV1(text: string): boolean {
  const once = normalizeOracleTextV1(text);
  return once === normalizeOracleTextV1(once);
}
