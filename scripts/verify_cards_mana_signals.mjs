import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
const prefix = "public/data/";
const bytes = readFileSync(prefix + "cards_mana_signals.json.gz");
const manifest = JSON.parse(readFileSync(prefix + "cards_mana_signals.manifest.json", "utf8"));
const legality = JSON.parse(readFileSync(prefix + "cards_format_legalities.manifest.json", "utf8"));
const digest = createHash("sha256").update(bytes).digest("hex");
if (manifest.sha256_gz !== digest) throw Error("Mana index checksum mismatch");
const doc = JSON.parse(gunzipSync(bytes).toString("utf8"));
if (doc.schema_version !== "cards-mana-signals-v1" ||
    doc.provider !== "Scryfall" ||
    doc.source_updated_at !== manifest.source_updated_at ||
    doc.source_updated_at !== legality.source_updated_at ||
    manifest.sha256_source_compressed !== legality.source_sha256_compressed) {
  throw Error("Mana signals and format legality snapshots are inconsistent");
}
const rows = Object.keys(doc.by_name_norm);
if (rows.length < 35000 || rows.length !== manifest.records) throw Error("Unexpected mana coverage");
const check = [
  ["mountain", "land", null, ["R"], false],
  ["overgrown tomb", "land", null, ["B","G"], false],
  ["cavern of souls", "land", null, ["B","G","R","U","W"], true],
  ["nykthos, shrine to nyx", "land", null, ["B","G","R","U","W"], true],
  ["elvish mystic", "nonland", "{G}", ["G"], false],
  ["slash, reptile rampager", "nonland", "{3}{R}{R}", [], false],
  ["impact tremors", "nonland", "{1}{R}", [], false],
  ["warleader's call", "nonland", "{1}{R}{W}", [], false],
];
for (const [name,type,mana,produced,conditional] of check) {
  const record = doc.by_name_norm[name];
  if (!record || record.type !== type || record.mana_cost !== mana ||
      record.conditional !== conditional ||
      JSON.stringify(record.produced) !== JSON.stringify(produced)) {
    throw Error("Incorrect mana fixture: " + name);
  }
}
const missing = Object.values(doc.by_name_norm).filter(x => !x).length;
if (missing !== manifest.unresolved || missing > 50) throw Error("Excessive unresolved mana metadata");
console.log("CARDS_MANA_SIGNALS_VERIFY=PASS " + JSON.stringify({
  rows: rows.length, unresolved: missing, sha256: digest,
  updated_at: doc.source_updated_at,
}));
