export function normalizeCardName(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
