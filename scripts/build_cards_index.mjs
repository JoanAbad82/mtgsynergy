import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BULK_URL = "https://api.scryfall.com/bulk-data/oracle_cards";
const CACHE_DIR = ".cache";
const CACHE_META = path.join(CACHE_DIR, "scryfall_oracle_meta.json");
const CACHE_BULK = path.join(CACHE_DIR, "scryfall_oracle_cards.json");
const OUT_DIR = path.join("public", "data", "cards_index");

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "MTGSynergy/0.1 (contact: JoanAbad)",
};

function normalizeName(name) {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function shardKey(nameNorm) {
  const first = nameNorm.trim().charAt(0);
  if (!first) return "_";
  if (first >= "a" && first <= "z") return first;
  if (first >= "0" && first <= "9") return "0";
  return "_";
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }
  return res.json();
}

async function loadBulkOracleCards() {
  await mkdir(CACHE_DIR, { recursive: true });

  const bulkMeta = await fetchJson(BULK_URL);
  if (!bulkMeta?.download_uri || !bulkMeta?.updated_at) {
    throw new Error("Invalid bulk metadata response.");
  }

  let cachedMeta = null;
  try {
    cachedMeta = await readJson(CACHE_META);
  } catch {
    cachedMeta = null;
  }

  if (cachedMeta?.updated_at === bulkMeta.updated_at) {
    try {
      const cachedBulk = await readJson(CACHE_BULK);
      return { bulkMeta, bulk: cachedBulk, cacheHit: true };
    } catch {
      // fallthrough to download
    }
  }

  const bulk = await fetchJson(bulkMeta.download_uri);
  await writeFile(CACHE_META, JSON.stringify({ updated_at: bulkMeta.updated_at }, null, 2));
  await writeFile(CACHE_BULK, JSON.stringify(bulk));
  return { bulkMeta, bulk, cacheHit: false };
}

function toRecordMin(card) {
  return {
    oracle_id: card.oracle_id,
    name: card.name,
    name_norm: normalizeName(card.name),
    lang: card.lang,
    set: card.set,
    collector_number: card.collector_number,
    type_line: card.type_line ?? null,
    oracle_text: card.oracle_text ?? null,
    mana_cost: card.mana_cost ?? null,
    cmc: typeof card.cmc === "number" ? card.cmc : null,
    colors: Array.isArray(card.colors) ? card.colors : null,
    color_identity: Array.isArray(card.color_identity) ? card.color_identity : null,
    produced_mana: Array.isArray(card.produced_mana) ? card.produced_mana : null,
    keywords: Array.isArray(card.keywords) ? card.keywords : null,
    games: Array.isArray(card.games) ? card.games : null,
    legalities: card.legalities ?? null,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const { bulkMeta, bulk } = await loadBulkOracleCards();
  if (!Array.isArray(bulk)) {
    throw new Error("Bulk oracle_cards is not an array.");
  }

  const shards = new Map();
  const shardCounts = new Map();

  for (const card of bulk) {
    if (!card?.oracle_id || !card?.name) continue;
    const record = toRecordMin(card);
    const key = shardKey(record.name_norm);
    if (!shards.has(key)) {
      shards.set(key, {});
      shardCounts.set(key, 0);
    }
    const shard = shards.get(key);
    shard[record.name_norm] = record;
    shardCounts.set(key, shardCounts.get(key) + 1);
  }

  for (const [key, shard] of shards.entries()) {
    const outPath = path.join(OUT_DIR, `${key}.json`);
    await writeFile(outPath, JSON.stringify(shard));
  }

  const meta = {
    source: "scryfall-oracle_cards",
    bulk_updated_at: bulkMeta.updated_at,
    generated_at: new Date().toISOString(),
    total_cards: bulk.length,
    shard_counts: Object.fromEntries(shardCounts.entries()),
  };

  await writeFile(path.join(OUT_DIR, "_meta.json"), JSON.stringify(meta, null, 2));

  console.log(
    `Cards index generated. shards=${shards.size} total_cards=${bulk.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
