import pako from "pako";
import type { CardRecordMin } from "./types";
import { normalizeCardName } from "./normalize";

type CardIndexRecord = Pick<CardRecordMin, "type_line" | "oracle_text" | "cmc">;
type CardsIndexPayload = {
  by_name: Record<string, CardIndexRecord>;
  by_name_norm?: Record<string, string>;
  schema_version?: string;
};

type CardsIndexCache = CardsIndexPayload & { count: number };

const indexCache = new Map<string, CardsIndexCache>();

async function gunzipToString(data: Uint8Array): Promise<string> {
  if (typeof (globalThis as any).DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("gzip");
    const stream = new Blob([data]).stream().pipeThrough(ds);
    return new Response(stream).text();
  }
  return pako.ungzip(data, { to: "string" });
}

async function loadCardsIndex(baseUrl?: string): Promise<CardsIndexCache> {
  const base = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
  const cacheKey = base || "__default__";
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;

  const url = base ? `${base}/data/cards_index.json.gz` : "/data/cards_index.json.gz";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load cards_index.json.gz: ${res.status}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const json = await gunzipToString(bytes);
  const payload = JSON.parse(json) as CardsIndexPayload;
  const byName = payload.by_name ?? {};
  const count = Object.keys(byName).length;
  const normalized = { ...(payload.by_name_norm ?? {}) };
  if (Object.keys(normalized).length === 0) {
    for (const name of Object.keys(byName)) {
      normalized[normalizeCardName(name)] = name;
    }
  }

  const loaded: CardsIndexCache = {
    by_name: byName,
    by_name_norm: normalized,
    schema_version: payload.schema_version,
    count,
  };
  indexCache.set(cacheKey, loaded);
  return loaded;
}

function findCardRecord(
  payload: CardsIndexCache,
  nameOrNorm: string,
): { name: string; record: CardIndexRecord } | null {
  const name = nameOrNorm.trim();
  if (payload.by_name[name]) {
    return { name, record: payload.by_name[name] };
  }
  const nameNorm = normalizeCardName(name);
  const canonicalName = payload.by_name_norm?.[nameNorm];
  if (canonicalName && payload.by_name[canonicalName]) {
    return { name: canonicalName, record: payload.by_name[canonicalName] };
  }
  return null;
}

export async function lookupCard(
  nameOrNorm: string,
  baseUrl?: string,
): Promise<CardRecordMin | null> {
  const payload = await loadCardsIndex(baseUrl);
  const found = findCardRecord(payload, nameOrNorm);
  if (!found) return null;
  const name_norm = normalizeCardName(found.name);
  return {
    name: found.name,
    name_norm,
    type_line: found.record.type_line ?? null,
    oracle_text: found.record.oracle_text ?? null,
    cmc: typeof found.record.cmc === "number" ? found.record.cmc : null,
  };
}

export function getCardsIndexCount(baseUrl?: string): Promise<number> {
  return loadCardsIndex(baseUrl).then((payload) => payload.count);
}

function clearCache() {
  indexCache.clear();
}

export const __testing = { clearCache, gunzipToString, findCardRecord };
