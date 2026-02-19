import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const BULK_LIST_URL = "https://api.scryfall.com/bulk-data";
const OUT_DIR = path.join("public", "data");
const OUT_GZ = path.join(OUT_DIR, "cards_index.json.gz");
const OUT_MANIFEST = path.join(OUT_DIR, "cards_index.manifest.json");

const HEADERS = {
  Accept: "application/json",
  "User-Agent": "MTGSynergy/0.1 (contact: JoanAbad)",
};

function normalizeName(name) {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }
  return res.json();
}

function pickBulkItem(bulkList) {
  const items = Array.isArray(bulkList?.data) ? bulkList.data : [];
  const oracle = items.find((item) => item.type === "oracle_cards");
  if (oracle) return oracle;
  const fallback = items.find((item) => item.type === "default_cards");
  if (fallback) return fallback;
  throw new Error("No oracle_cards or default_cards bulk found.");
}

function isExcludedCard(card) {
  const layout = String(card?.layout ?? "");
  if (layout.includes("token")) return true;
  if (layout.includes("emblem")) return true;
  if (card?.set_type === "token") return true;
  const typeLine = String(card?.type_line ?? "");
  if (typeLine.includes("Token")) return true;
  return false;
}

function buildOracleText(card) {
  if (Array.isArray(card?.card_faces) && card.card_faces.length > 0) {
    const parts = card.card_faces
      .map((face) => face.oracle_text)
      .filter((text) => typeof text === "string" && text.trim().length > 0);
    return parts.length > 0 ? parts.join("\n//\n") : null;
  }
  return typeof card?.oracle_text === "string" ? card.oracle_text : null;
}

function buildTypeLine(card) {
  if (Array.isArray(card?.card_faces) && card.card_faces.length > 0) {
    const parts = card.card_faces
      .map((face) => face.type_line)
      .filter((text) => typeof text === "string" && text.trim().length > 0);
    return parts.length > 0 ? parts.join("\n//\n") : null;
  }
  return typeof card?.type_line === "string" ? card.type_line : null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const bulkList = await fetchJson(BULK_LIST_URL);
  const bulkItem = pickBulkItem(bulkList);

  if (!bulkItem?.download_uri) {
    throw new Error("Bulk item missing download_uri.");
  }

  const bulk = await fetchJson(bulkItem.download_uri);
  if (!Array.isArray(bulk)) {
    throw new Error("Bulk cards payload is not an array.");
  }

  const byName = {};
  const byNameNorm = {};

  for (const card of bulk) {
    if (!card?.name) continue;
    if (isExcludedCard(card)) continue;

    const name = card.name;
    const nameNorm = normalizeName(name);

    byName[name] = {
      type_line: buildTypeLine(card),
      oracle_text: buildOracleText(card),
      cmc: typeof card.cmc === "number" ? card.cmc : null,
    };
    byNameNorm[nameNorm] = name;
  }

  const payload = {
    schema_version: "cardrecordmin-v1",
    by_name: byName,
    by_name_norm: byNameNorm,
  };

  const json = JSON.stringify(payload);
  const gz = gzipSync(Buffer.from(json, "utf8"));
  const sha256 = createHash("sha256").update(gz).digest("hex");

  await writeFile(OUT_GZ, gz);

  const manifest = {
    source: "scryfall",
    bulk_type: bulkItem.type,
    bulk_download_uri: bulkItem.download_uri,
    bulk_updated_at: bulkItem.updated_at ?? null,
    generated_at: new Date().toISOString(),
    record_count: Object.keys(byName).length,
    sha256_gz: sha256,
    schema_version: "cardrecordmin-v1",
  };

  await writeFile(OUT_MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(
    `Cards index generated. records=${manifest.record_count} sha256=${sha256}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
