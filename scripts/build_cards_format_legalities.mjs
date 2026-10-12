import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createGunzip, gzipSync, gunzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";

const DATA = "public/data";
const FORMATS = ["standard", "pioneer", "modern", "legacy", "vintage", "pauper", "commander"];
const HEADERS = { Accept: "application/json", "User-Agent": "MTGSynergy/0.1 (local static legality builder)" };
const norm = (name) => name.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const canonical = JSON.parse(gunzipSync(await readFile(DATA + "/cards_index.json.gz")).toString("utf8"));
const knownNames = new Set(Object.keys(canonical.by_name_norm));
if (knownNames.size < 30000) throw Error("Unexpected small source cards index");

const bulkResponse = await fetch("https://api.scryfall.com/bulk-data", { headers: HEADERS });
if (!bulkResponse.ok) throw Error("Scryfall bulk catalog HTTP " + bulkResponse.status);
const bulk = (await bulkResponse.json()).data.find(row => row.type === "oracle_cards");
if (!bulk || !bulk.jsonl_download_uri || !bulk.updated_at) throw Error("Missing Oracle Cards JSONL gzip source metadata");
if (!bulk.jsonl_download_uri.startsWith("https://data.scryfall.io/")) throw Error("Invalid trusted Scryfall bulk URI");

const response = await fetch(bulk.jsonl_download_uri, { headers: HEADERS });
if (!response.ok || !response.body) throw Error("Scryfall Oracle Cards download HTTP " + response.status);
const hashSource = createHash("sha256");
const stream = Readable.fromWeb(response.body);
stream.on("data", chunk => hashSource.update(chunk));
const textLines = createInterface({ input: stream.pipe(createGunzip()), crlfDelay: Infinity });
const byNameNorm = {};
const sourcePriority = {};
let read = 0;
let mapped = 0;
const conflicts = new Set();
for await (const line of textLines) {
  if (!line.trim()) continue;
  const card = JSON.parse(line);
  read++;
  if (typeof card.name !== "string") continue;
  const candidates = [norm(card.name)];
  if (card.name.includes(" // ")) candidates.push(norm(card.name.split(" // ")[0]));
  const priority = Array.isArray(card.games) && card.games.includes("paper") ? 2 : 1;
  const statuses = {};
  for (const f of FORMATS) {
    const status = card.legalities?.[f];
    if (["legal", "not_legal", "banned", "restricted"].includes(status)) statuses[f] = status;
  }
  for (const name of candidates) {
    if (!knownNames.has(name)) continue;
    if (Object.prototype.hasOwnProperty.call(byNameNorm, name)) {
      const previousPriority = sourcePriority[name] ?? 0;
      if (priority > previousPriority) {
        byNameNorm[name] = statuses;
        sourcePriority[name] = priority;
        conflicts.delete(name);
      } else if (priority === previousPriority && JSON.stringify(byNameNorm[name]) !== JSON.stringify(statuses)) {
        byNameNorm[name] = {}; // same-priority collision: verify exact name
        conflicts.add(name);
      }
      continue;
    }
    byNameNorm[name] = statuses;
    sourcePriority[name] = priority;
    mapped++;
  }
}
// Oracle Cards has one representative printing per Oracle ID. Some alternate
// names have their own index keys but are absent from that representative.
// Resolve only these bounded residual keys by Scryfall's collection endpoint.
const unresolved = [...knownNames].filter(name => !(name in byNameNorm) || conflicts.has(name));
if (unresolved.length > 2500) throw Error("Too many unresolved aliases for rate-limited Scryfall collection: " + unresolved.length);
const knownSourceName = (key) => canonical.by_name_norm[key] ?? key;
const fetchedAlias = new Map();
const fetchAliases = async (keys) => {
  for (let start = 0; start < keys.length; start += 75) {
    const batch = keys.slice(start, start + 75);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: batch.map(name => ({ name: knownSourceName(name) })) })
    });
    if (!res.ok) throw Error("Scryfall alias reconciliation HTTP " + res.status);
    const result = await res.json();
    if (!Array.isArray(result.data)) throw Error("Malformed Scryfall alias response");
    for (const card of result.data) {
      const key = norm(card.name ?? "");
      const statuses = {};
      for (const f of FORMATS) {
        if (["legal", "not_legal", "banned", "restricted"].includes(card.legalities?.[f])) {
          statuses[f] = card.legalities[f];
        }
      }
      fetchedAlias.set(key, statuses);
    }
    if (start + 75 < keys.length) await new Promise(r => setTimeout(r, 600));
  }
};
if (unresolved.length > 0) await fetchAliases(unresolved);
for (const key of unresolved) {
  const found = fetchedAlias.get(key);
  if (found) {
    if (!(key in byNameNorm)) mapped++;
    byNameNorm[key] = found;
  }
}
const pendingFaces = unresolved.filter(key => !(key in byNameNorm) && knownSourceName(key).includes(" // "));
if (pendingFaces.length) {
  const frontByKey = new Map(pendingFaces.map(key => [key, knownSourceName(key).split(" // ")[0]]));
  const faceKeys = [...new Set([...frontByKey.values()])];
  for (let start = 0; start < faceKeys.length; start += 75) {
    const batch = faceKeys.slice(start, start + 75);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST", headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: batch.map(name => ({name})) })
    });
    if (!res.ok) throw Error("Scryfall front-face alias HTTP " + res.status);
    const result = await res.json();
    for (const card of result.data ?? []) {
      const statuses = {};
      for (const f of FORMATS) {
        if (["legal", "not_legal", "banned", "restricted"].includes(card.legalities?.[f])) statuses[f] = card.legalities[f];
      }
      fetchedAlias.set(norm(card.name.split(" // ")[0]), statuses);
    }
    if (start + 75 < faceKeys.length) await new Promise(r => setTimeout(r, 600));
  }
  for (const [key, face] of frontByKey) {
    const status = fetchedAlias.get(norm(face));
    if (status && !(key in byNameNorm)) { byNameNorm[key] = status; mapped++; }
  }
}
if (read < 25000 || mapped < 25000) throw Error("Scryfall bulk mismatch read=" + read + " mapped=" + mapped);
const payload = {
  schema_version: "cards-format-legalities-v1",
  provider: "Scryfall",
  source_updated_at: bulk.updated_at,
  formats: FORMATS,
  by_name_norm: Object.fromEntries(Object.entries(byNameNorm).sort(([a],[b]) => a.localeCompare(b, "en")))
};
const gz = gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9, mtime: 0 });
const sha = createHash("sha256").update(gz).digest("hex");
await writeFile(DATA + "/cards_format_legalities.json.gz", gz);
const manifest = {
 schema_version: payload.schema_version,
 source: "scryfall",
 source_type: bulk.type,
 source_updated_at: bulk.updated_at,
 bulk_download_uri: bulk.jsonl_download_uri,
 source_sha256_compressed: hashSource.digest("hex"),
 canonical_cards_index_schema: canonical.schema_version,
 canonical_cards_index_records: knownNames.size,
 read_oracle_records: read,
 matched_names: mapped,
 formats: FORMATS,
 sha256_gz: sha
};
await writeFile(DATA + "/cards_format_legalities.manifest.json", JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("FORMAT_LEGALITY_INDEX_CREATED " + JSON.stringify({read, mapped, bytes:gz.length, sha, updated:bulk.updated_at}));
