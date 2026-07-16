import pako from "pako";
import type { CardRecordMin } from "./types";
import { normalizeCardName } from "./normalize";

type CardIndexRecord = Pick<CardRecordMin, "type_line" | "oracle_text" | "cmc">;
type CardIndexRecordWithKeywords = CardIndexRecord &
  Pick<CardRecordMin, "keywords">;
type CardsIndexPayload = {
  by_name: Record<string, CardIndexRecordWithKeywords>;
  by_name_norm?: Record<string, string>;
  schema_version?: string;
};

const cardsIndexSourceIdentityBrand: unique symbol = Symbol("CardsIndexSourceIdentity");

export type CardsIndexSourceIdentity = Readonly<{
  readonly [cardsIndexSourceIdentityBrand]: true;
  readonly generation: number;
  readonly cacheKey: string;
}>;

type CardsIndexCache = CardsIndexPayload & {
  count: number;
  sourceIdentity: CardsIndexSourceIdentity;
};
const DEFAULT_LIST_CARDS_INDEX_LIMIT = 200;
const DEFAULT_CARDS_INDEX_CACHE_KEY = "__default__";

const indexCache = new Map<string, CardsIndexCache>();
const indexPromiseCache = new Map<string, Promise<CardsIndexCache>>();
let _cardsIndexPromise: Promise<CardsIndexCache> | null = null;
let _cardsIndex: CardsIndexCache | null = null;
const materialLoadCounters = {
  fetch: 0,
  decompression: 0,
  jsonParse: 0,
};
let sourceIdentityGeneration = 0;

function currentRuntimeOrigin(): string | null {
  const locationLike = (globalThis as { location?: { origin?: unknown } }).location;
  return typeof locationLike?.origin === "string" && locationLike.origin.length > 0
    ? locationLike.origin
    : null;
}

function normalizeBaseUrlForCardsIndexCache(baseUrl?: string): string {
  const trimmed = typeof baseUrl === "string" ? baseUrl.trim() : "";
  const runtimeOrigin = currentRuntimeOrigin();
  if (trimmed.length === 0) {
    return runtimeOrigin ?? DEFAULT_CARDS_INDEX_CACHE_KEY;
  }

  try {
    const parsed = runtimeOrigin ? new URL(trimmed, runtimeOrigin) : new URL(trimmed);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${pathname}`;
  } catch {
    return trimmed.replace(/\/+$/, "") || runtimeOrigin || DEFAULT_CARDS_INDEX_CACHE_KEY;
  }
}

function resolveCardsIndexFetchUrl(baseUrl?: string): string {
  const base = typeof baseUrl === "string" ? baseUrl.trim().replace(/\/+$/, "") : "";
  return base ? `${base}/data/cards_index.json.gz` : "/data/cards_index.json.gz";
}

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
  const cacheKey = normalizeBaseUrlForCardsIndexCache(baseUrl);
  if (cacheKey === DEFAULT_CARDS_INDEX_CACHE_KEY && _cardsIndex) return _cardsIndex;
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;
  const inflight = indexPromiseCache.get(cacheKey);
  if (inflight) return inflight;

  const url = resolveCardsIndexFetchUrl(baseUrl);
  const promise = (async () => {
    materialLoadCounters.fetch += 1;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load cards_index.json.gz: ${res.status}`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (isGzipBytes(bytes)) {
      materialLoadCounters.decompression += 1;
    }
    const json = await decodeCardsIndexPayload(bytes);
    materialLoadCounters.jsonParse += 1;
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

    const sourceIdentity = Object.freeze({
      [cardsIndexSourceIdentityBrand]: true as const,
      generation: ++sourceIdentityGeneration,
      cacheKey,
    });
    const loaded: CardsIndexCache = {
      by_name: byName,
      by_name_norm: normalized,
      schema_version: payload.schema_version,
      count,
      sourceIdentity,
    };
    indexCache.set(cacheKey, loaded);
    if (cacheKey === DEFAULT_CARDS_INDEX_CACHE_KEY) {
      _cardsIndex = loaded;
    }
    return loaded;
  })().catch((error) => {
    indexPromiseCache.delete(cacheKey);
    if (cacheKey === DEFAULT_CARDS_INDEX_CACHE_KEY && _cardsIndexPromise === promise) {
      _cardsIndexPromise = null;
    }
    throw error;
  });

  indexPromiseCache.set(cacheKey, promise);
  if (cacheKey === DEFAULT_CARDS_INDEX_CACHE_KEY) {
    _cardsIndexPromise = promise;
  }

  return promise;
}

function hasUsableOracleText(record: CardIndexRecordWithKeywords): boolean {
  return typeof record.oracle_text === "string" && record.oracle_text.trim().length > 0;
}

function normalizeKeywords(keywords: unknown): string[] | null {
  if (!Array.isArray(keywords)) {
    return null;
  }

  const normalized = keywords
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : null;
}

function toCardRecordMin(name: string, record: CardIndexRecordWithKeywords): CardRecordMin {
  const cardRecord: CardRecordMin = {
    name,
    name_norm: normalizeCardName(name),
    type_line: typeof record.type_line === "string" ? record.type_line : null,
    oracle_text: typeof record.oracle_text === "string" ? record.oracle_text : null,
    cmc: typeof record.cmc === "number" ? record.cmc : null,
  };
  const keywords = normalizeKeywords(record.keywords);
  if (keywords) {
    cardRecord.keywords = keywords;
  }
  return cardRecord;
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
): { name: string; record: CardIndexRecordWithKeywords } | null {
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
  return toCardRecordMin(found.name, found.record);
}

export function getCardsIndexCount(baseUrl?: string): Promise<number> {
  return loadCardsIndex(baseUrl).then((payload) => payload.count);
}

export interface ListCardsIndexRecordsOptions {
  baseUrl?: string;
  limit?: number;
  includeEmptyOracleText?: boolean;
  recordFilter?: (record: CardRecordMin) => boolean;
}

function listCardsIndexRecordsFromPayload(
  payload: CardsIndexCache,
  options: Omit<ListCardsIndexRecordsOptions, "baseUrl"> = {},
): readonly CardRecordMin[] {
  const limit = resolveListLimit(options.limit);
  if (limit <= 0) {
    return [];
  }

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
    const cardRecord = toCardRecordMin(name, record);
    if (options.recordFilter && !options.recordFilter(cardRecord)) {
      continue;
    }
    records.push(cardRecord);
    if (records.length >= limit) {
      break;
    }
  }

  return records;
}

export async function listCardsIndexRecords(
  options: ListCardsIndexRecordsOptions = {},
): Promise<readonly CardRecordMin[]> {
  const payload = await loadCardsIndex(options.baseUrl);
  return listCardsIndexRecordsFromPayload(payload, options);
}

export interface CardsIndexRecordsSourceSnapshot {
  readonly sourceIdentity: CardsIndexSourceIdentity;
  readonly records: readonly CardRecordMin[];
}

export async function getCardsIndexRecordsSourceSnapshot(
  options: ListCardsIndexRecordsOptions = {},
): Promise<CardsIndexRecordsSourceSnapshot> {
  const payload = await loadCardsIndex(options.baseUrl);
  return {
    sourceIdentity: payload.sourceIdentity,
    records: listCardsIndexRecordsFromPayload(payload, options),
  };
}

function clearCache() {
  indexCache.clear();
  indexPromiseCache.clear();
  _cardsIndexPromise = null;
  _cardsIndex = null;
  materialLoadCounters.fetch = 0;
  materialLoadCounters.decompression = 0;
  materialLoadCounters.jsonParse = 0;
}

function getMaterialLoadCounters() {
  return { ...materialLoadCounters };
}

async function getCardsIndexSourceIdentity(baseUrl?: string): Promise<CardsIndexSourceIdentity> {
  return (await loadCardsIndex(baseUrl)).sourceIdentity;
}

function getCardsIndexSourceIdentityDiagnostic(identity: CardsIndexSourceIdentity) {
  return {
    generation: identity.generation,
    cacheKey: identity.cacheKey,
  };
}

export const __testing = {
  clearCache,
  gunzipToString,
  findCardRecord,
  getCardsIndexCacheKey: normalizeBaseUrlForCardsIndexCache,
  getCardsIndexSourceIdentity,
  getCardsIndexSourceIdentityDiagnostic,
  getMaterialLoadCounters,
};
