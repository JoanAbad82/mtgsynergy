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
const DEFAULT_LIST_CARDS_INDEX_LIMIT = 200;

const indexCache = new Map<string, CardsIndexCache>();
const indexPromiseCache = new Map<string, Promise<CardsIndexCache>>();
let _cardsIndexPromise: Promise<CardsIndexCache> | null = null;
let _cardsIndex: CardsIndexCache | null = null;

async function gunzipToString(data: Uint8Array): Promise<string> {
  if (typeof (globalThis as any).DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("gzip");
    const stream = new Blob([data]).stream().pipeThrough(ds);
    return new Response(stream).text();
  }
  return pako.ungzip(data, { to: "string" });
}

function isGzipBytes(data: Uint8Array): boolean {
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

async function decodeCardsIndexPayload(data: Uint8Array): Promise<string> {
  if (isGzipBytes(data)) {
    return gunzipToString(data);
  }
  return new TextDecoder("utf-8").decode(data);
}

async function loadCardsIndex(baseUrl?: string): Promise<CardsIndexCache> {
  const base = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
  const cacheKey = base || "__default__";
  if (cacheKey === "__default__" && _cardsIndex) return _cardsIndex;
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;
  const inflight = indexPromiseCache.get(cacheKey);
  if (inflight) return inflight;

  const url = base ? `${base}/data/cards_index.json.gz` : "/data/cards_index.json.gz";
  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load cards_index.json.gz: ${res.status}`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const json = await decodeCardsIndexPayload(bytes);
    const payload = JSON.parse(json) as CardsIndexPayload;
    const byName = payload.by_name ?? {};
    const count = Object.keys(byName).length;
    const normalized = { ...(payload.by_name_norm ?? {}) };
    if (Object.keys(normalized).length === 0) {
      for (const name of Object.keys(byName)) {
        normalized[normalizeCardName(name)] = name;
      }
    }
    for (const canonicalName of Object.keys(byName)) {
      const separatorIndex = canonicalName.indexOf(" // ");
      if (separatorIndex === -1) continue;
      const left = canonicalName.slice(0, separatorIndex);
      const leftNorm = normalizeCardName(left);
      if (!normalized[leftNorm]) {
        normalized[leftNorm] = canonicalName;
      }
    }

    const loaded: CardsIndexCache = {
      by_name: byName,
      by_name_norm: normalized,
      schema_version: payload.schema_version,
      count,
    };
    indexCache.set(cacheKey, loaded);
    if (cacheKey === "__default__") {
      _cardsIndex = loaded;
    }
    return loaded;
  })();

  indexPromiseCache.set(cacheKey, promise);
  if (cacheKey === "__default__") {
    _cardsIndexPromise = promise;
  }

  return promise;
}

function hasUsableOracleText(record: CardIndexRecord): boolean {
  return typeof record.oracle_text === "string" && record.oracle_text.trim().length > 0;
}

function toCardRecordMin(name: string, record: CardIndexRecord): CardRecordMin {
  return {
    name,
    name_norm: normalizeCardName(name),
    type_line: typeof record.type_line === "string" ? record.type_line : null,
    oracle_text: typeof record.oracle_text === "string" ? record.oracle_text : null,
    cmc: typeof record.cmc === "number" ? record.cmc : null,
  };
}

function resolveListLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_LIST_CARDS_INDEX_LIMIT;
  }

  const normalizedLimit = Math.floor(limit as number);
  if (normalizedLimit <= 0) {
    return 0;
  }
  return normalizedLimit;
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

export interface ListCardsIndexRecordsOptions {
  baseUrl?: string;
  limit?: number;
  includeEmptyOracleText?: boolean;
}

export async function listCardsIndexRecords(
  options: ListCardsIndexRecordsOptions = {},
): Promise<readonly CardRecordMin[]> {
  const limit = resolveListLimit(options.limit);
  if (limit <= 0) {
    return [];
  }

  const payload = await loadCardsIndex(options.baseUrl);
  const includeEmptyOracleText = options.includeEmptyOracleText === true;
  const names = Object.keys(payload.by_name).sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );

  const records: CardRecordMin[] = [];
  for (const name of names) {
    const record = payload.by_name[name];
    if (!record) {
      continue;
    }
    if (!includeEmptyOracleText && !hasUsableOracleText(record)) {
      continue;
    }
    records.push(toCardRecordMin(name, record));
    if (records.length >= limit) {
      break;
    }
  }

  return records;
}

function clearCache() {
  indexCache.clear();
  indexPromiseCache.clear();
  _cardsIndexPromise = null;
  _cardsIndex = null;
}

export const __testing = { clearCache, gunzipToString, findCardRecord };
