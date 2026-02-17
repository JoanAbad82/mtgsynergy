import type { CardRecordMin } from "./types";
import { normalizeCardName } from "./normalize";

const shardCache = new Map<string, Record<string, CardRecordMin>>();

function shardKeyFromNameNorm(nameNorm: string): string {
  const first = nameNorm.trim().charAt(0);
  if (!first) return "_.json";
  if (first >= "a" && first <= "z") return `${first}.json`;
  if (first >= "0" && first <= "9") return "0.json";
  return "_.json";
}

export async function loadShardForNameNorm(
  nameNorm: string,
  baseUrl?: string,
): Promise<Record<string, CardRecordMin>> {
  const key = shardKeyFromNameNorm(nameNorm);
  const base = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
  const cacheKey = `${base}|${key}`;
  const cached = shardCache.get(cacheKey);
  if (cached) return cached;

  const url = base ? `${base}/data/cards_index/${key}` : `/data/cards_index/${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load shard ${key}: ${res.status}`);
  }
  const data = (await res.json()) as Record<string, CardRecordMin>;
  shardCache.set(cacheKey, data);
  return data;
}

export async function lookupCard(
  nameOrNorm: string,
  baseUrl?: string,
): Promise<CardRecordMin | null> {
  const nameNorm = normalizeCardName(nameOrNorm);
  const shard = await loadShardForNameNorm(nameNorm, baseUrl);
  return shard[nameNorm] ?? null;
}

function clearCache() {
  shardCache.clear();
}

export const __testing = { shardKeyFromNameNorm, clearCache };
