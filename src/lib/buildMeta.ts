const rawSha =
  (import.meta as any).env?.CF_PAGES_COMMIT_SHA ??
  process.env.CF_PAGES_COMMIT_SHA ??
  "dev";

export const gitShaFull: string = rawSha;
export const gitShaShort: string = rawSha.length >= 7 ? rawSha.slice(0, 7) : rawSha;
export const buildId: string = process.env.PUBLIC_BUILD_ID ?? "9b795fa";
