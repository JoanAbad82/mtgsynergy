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
): Promise<Record<string, CardRecordMin>> {
  const key = shardKeyFromNameNorm(nameNorm);
  const cached = shardCache.get(key);
  if (cached) return cached;

  const res = await fetch(`/data/cards_index/${key}`);
  if (!res.ok) {
    throw new Error(`Failed to load shard ${key}: ${res.status}`);
  }
  const data = (await res.json()) as Record<string, CardRecordMin>;
  shardCache.set(key, data);
  return data;
}

export async function lookupCard(
  nameOrNorm: string,
): Promise<CardRecordMin | null> {
  const nameNorm = normalizeCardName(nameOrNorm);
  const shard = await loadShardForNameNorm(nameNorm);
  return shard[nameNorm] ?? null;
}

export const __testing = { shardKeyFromNameNorm };
