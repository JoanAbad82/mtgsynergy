import { normalizeCardName } from "./normalize";

/**
 * Strict and cached front-face alias resolution for LOCAL auxiliary snapshots.
 * Exact keys win. An alias is accepted only when it maps to one canonical key.
 * Collisions always stay unresolved; status, mana, or printing cannot break ties.
 */
const aliasCache = new WeakMap<object, ReadonlyMap<string, string | null>>();

export function resolveUniqueSnapshotNameKey<T>(
  records: Readonly<Record<string, T>>,
  name: string,
): string | null {
  const key = normalizeCardName(name);
  if (Object.prototype.hasOwnProperty.call(records, key)) return key;
  let aliases = aliasCache.get(records);
  if (!aliases) {
    const built = new Map<string, string | null>();
    for (const fullKey of Object.keys(records)) {
      const separator = fullKey.indexOf(" // ");
      if (separator < 0) continue;
      const front = normalizeCardName(fullKey.slice(0, separator));
      if (Object.prototype.hasOwnProperty.call(records, front)) continue;
      if (!built.has(front)) built.set(front, fullKey);
      else if (built.get(front) !== fullKey) built.set(front, null);
    }
    aliases = built;
    aliasCache.set(records, aliases);
  }
  return aliases.get(key) ?? null;
}

/**
 * Resolve a short face through a canonical Oracle records map only if there is
 * one record containing useful Oracle text. Two different usable entries are
 * deliberately ambiguous; we must not silently pick based on insertion order.
 * Preserve exactly specified full canonical names.
 */
export function buildOracleFirstFaceAliases<T extends { oracle_text?: string | null }>(
  byName: Readonly<Record<string, T>>,
  byNameNorm: Readonly<Record<string, string>>,
): Record<string, string> {
  const result = { ...byNameNorm };
  const canonicalNames = new Set(Object.keys(byName).map(normalizeCardName));
  const candidates = new Map<string, string[]>();
  for (const full of Object.keys(byName)) {
    const separator = full.indexOf(" // ");
    if (separator < 0) continue;
    const front = normalizeCardName(full.slice(0, separator));
    const previous = candidates.get(front) ?? [];
    previous.push(full);
    candidates.set(front, previous);
  }
  for (const [front, fullNames] of candidates) {
    // Never replace an actual standalone card named exactly like the face.
    if (canonicalNames.has(front)) continue;
    const valid = fullNames.filter((name) => Boolean(byName[name]?.oracle_text?.trim()));
    if (valid.length === 1) result[front] = valid[0];
    else if (valid.length > 1) delete result[front];
    else if (fullNames.length === 1) result[front] = fullNames[0];
    else delete result[front];
  }
  return result;
}
