import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createGunzip, gzipSync, gunzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";

const DATA = "public/data/";
const HEADERS = {Accept: "application/json", "User-Agent": "MTGSynergy/0.1 (local mana audit)"};
const norm = (x) => x.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const legality = JSON.parse(await readFile(DATA + "cards_format_legalities.manifest.json", "utf8"));
const index = JSON.parse(gunzipSync(await readFile(DATA + "cards_index.json.gz")).toString("utf8"));
const names = index.by_name_norm;
const known = new Set(Object.keys(names));
const api = await fetch("https://api.scryfall.com/bulk-data", {headers: HEADERS});
if (!api.ok) throw Error("Scryfall catalog unavailable");
const info = (await api.json()).data.find(x => x.type === "oracle_cards");
if (info?.updated_at !== legality.source_updated_at) {
  throw Error("Scryfall mana and legality snapshots from different revisions; rebuild legality snapshot before running this script.");
}
if (!info?.jsonl_download_uri?.startsWith("https://data.scryfall.io/")) throw Error("Unexpected source URI");
const response = await fetch(info.jsonl_download_uri, {headers: HEADERS});
if (!response.ok || !response.body) throw Error("Failed to download Scryfall bulk");
const shaSource = createHash("sha256");
const body = Readable.fromWeb(response.body);
body.on("data", part => shaSource.update(part));
const lines = createInterface({input: body.pipe(createGunzip()),crlfDelay: Infinity});
const byName = Object.create(null);
const priorityByName = Object.create(null);
let sourceRows = 0;
for await (const line of lines) {
  if (!line.trim()) continue;
  sourceRows++;
  const c = JSON.parse(line);
  if (typeof c.name !== "string") continue;
  const faces = c.card_faces ?? [];
  const first = faces[0] ?? {};
  const rawCost = (typeof c.mana_cost === "string" && c.mana_cost.trim())
    ? c.mana_cost
    : (typeof first.mana_cost === "string" ? first.mana_cost : null);
  const producerText = typeof c.oracle_text === "string"
    ? c.oracle_text : (typeof first.oracle_text === "string" ? first.oracle_text : "");
  const producerColors = (Array.isArray(c.produced_mana) ? c.produced_mana : [])
    .filter(x => ["W","U","B","R","G"].includes(x)).sort();
  const typeLine = String(c.type_line ?? first.type_line ?? "");
  const isLand = /(?:^|\s|\u2014|\/)Land(?:$|\s)/.test(typeLine);
  // Conservative: conditional producers must not certify a direct color.
  const conditional = /spend this mana only|chosen (?:type|color)|choose a color|devotion to|for each |if you control|only to cast|of any color among|mana of any one color among/i.test(producerText);
  const record = {
    type: isLand ? "land" : "nonland",
    mana_cost: rawCost,
    identity: (Array.isArray(c.color_identity) ? c.color_identity : [])
      .filter(x => ["W","U","B","R","G"].includes(x)).sort(),
    produced: producerColors,
    conditional,
    complex_cast: ["split", "adventure", "modal_dfc", "prototype"].includes(String(c.layout ?? ""))
  };
  const p = Array.isArray(c.games) && c.games.includes("paper") ? 2 : 1;
  const keys = [norm(c.name)];
  if (c.name.includes(" // ")) keys.push(norm(c.name.split(" // ")[0]));
  for (const key of new Set(keys)) {
    if (!known.has(key)) continue;
    const oldPriority = priorityByName[key] ?? 0;
    if (oldPriority > p) continue;
    if (oldPriority === p && JSON.stringify(byName[key]) !== JSON.stringify(record)) {
      byName[key] = null; // conflicting representatives: unknown
    } else {
      byName[key] = record;
    }
    priorityByName[key] = p;
  }
}
// Resolve Oracle-variant collisions using exact-name Scryfall responses.
// This is a bounded maintenance-time action, never called for players' decks.
const unresolved = Object.entries(byName).filter(([, value]) => !value).map(([name]) => name);
if (unresolved.length > 2500) throw Error("Unbounded Scryfall reconciliation");
const fromApi = (c) => {
  const face = c.card_faces?.[0] ?? {};
  const rawCost = typeof c.mana_cost === "string" && c.mana_cost.trim()
    ? c.mana_cost : typeof face.mana_cost === "string" ? face.mana_cost : null;
  const text = typeof c.oracle_text === "string" ? c.oracle_text : String(face.oracle_text ?? "");
  const t = String(c.type_line ?? face.type_line ?? "");
  return {
    type: /(?:^|\s|\u2014|\/)Land(?:$|\s)/.test(t) ? "land" : "nonland",
    mana_cost: rawCost,
    identity: (Array.isArray(c.color_identity) ? c.color_identity : [])
      .filter(x => ["W","U","B","R","G"].includes(x)).sort(),
    produced: (Array.isArray(c.produced_mana) ? c.produced_mana : [])
      .filter(x => ["W","U","B","R","G"].includes(x)).sort(),
    conditional: /spend this mana only|chosen (?:type|color)|choose a color|devotion to|for each |if you control|only to cast|of any color among|mana of any one color among/i.test(text),
    complex_cast: ["split","adventure","modal_dfc","prototype"].includes(String(c.layout ?? ""))
  };
};
for (let start = 0; start < unresolved.length; start += 75) {
  const batch = unresolved.slice(start, start + 75);
  const r = await fetch("https://api.scryfall.com/cards/collection", {
    method: "POST",headers: {...HEADERS,"Content-Type": "application/json"},
    body: JSON.stringify({ identifiers: batch.map(key => ({name: names[key] ?? key})) })
  });
  if (!r.ok) throw Error("Scryfall mana reconciliation HTTP " + r.status);
  const json = await r.json();
  if (!Array.isArray(json.data)) throw Error("Malformed Scryfall collection");
  for (const card of json.data) {
    const full = norm(card.name ?? "");
    const keys = [full];
    if (full.includes(" // ")) keys.push(full.split(" // ")[0]);
    for (const key of keys) {
      if (known.has(key) && !byName[key]) byName[key] = fromApi(card);
    }
  }
  if (start+75<unresolved.length) await new Promise(resolve => setTimeout(resolve, 650));
}

if (sourceRows < 30000 || Object.keys(byName).length < 30000) throw Error("Unexpected mana snapshot coverage");
const sorted = Object.fromEntries(Object.entries(byName).sort(([a], [b]) => a.localeCompare(b, "en")));
const payload = {
  schema_version: "cards-mana-signals-v1",
  provider: "Scryfall",
  source_updated_at: info.updated_at,
  by_name_norm: sorted
};
const gzip = gzipSync(Buffer.from(JSON.stringify(payload)), {level: 9,mtime: 0});
const hash = createHash("sha256").update(gzip).digest("hex");
await writeFile(DATA + "cards_mana_signals.json.gz", gzip);
await writeFile(DATA + "cards_mana_signals.manifest.json",JSON.stringify({
  schema_version: payload.schema_version,
  source: "Scryfall Oracle Cards",
  source_updated_at: info.updated_at,
  oracle_bulk_uri: info.jsonl_download_uri,
  sha256_source_compressed: shaSource.digest("hex"),
  sha256_gz: hash,
  records: Object.keys(sorted).length,
  unresolved: Object.values(sorted).filter(x => !x).length,
  source_rows: sourceRows
},null,2)+"\n");
console.log("MANA_INDEX_CREATED "+JSON.stringify({rows:Object.keys(sorted).length,bytes:gzip.length,unresolved:Object.values(sorted).filter(x=>!x).length,hash}));
