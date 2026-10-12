import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const root = "public/data/";
const bytes = readFileSync(root + "cards_format_legalities.json.gz");
const manifest = JSON.parse(readFileSync(root + "cards_format_legalities.manifest.json", "utf8"));
const sha = createHash("sha256").update(bytes).digest("hex");
if (sha !== manifest.sha256_gz) throw Error("Legality manifest SHA256 mismatch");
const payload = JSON.parse(gunzipSync(bytes).toString("utf8"));
if (payload.schema_version !== "cards-format-legalities-v1" ||
    manifest.schema_version !== payload.schema_version ||
    payload.source_updated_at !== manifest.source_updated_at ||
    payload.provider !== "Scryfall") throw Error("Legality metadata mismatch");
if (manifest.matched_names < 25000 ||
    Object.keys(payload.by_name_norm ?? {}).length < 25000 ||
    manifest.matched_names !== Object.keys(payload.by_name_norm).length) {
  throw Error("Legality mapping incomplete");
}
if (!Array.isArray(payload.formats) || !payload.formats.includes("modern") ||
    !payload.formats.includes("pauper")) throw Error("Missing formats");
const testCases = [
  ["guttersnipe", "pauper", "legal"],
  ["firebrand archer", "pauper", "legal"],
  ["circle of power", "pauper", "not_legal"],
  ["invasion of karsus // refraction elemental", "modern", "legal"]
];
for (const [name, format, status] of testCases) {
  if (payload.by_name_norm[name]?.[format] !== status) {
    throw Error("Known Scryfall legality fixture drift for " + name);
  }
}
for (const row of Object.values(payload.by_name_norm)) {
  for (const [key, value] of Object.entries(row)) {
    if (!payload.formats.includes(key) ||
        !["legal","not_legal","banned","restricted"].includes(value)) {
      throw Error("Unknown status or format in legalities artifact");
    }
  }
}
console.log("CARDS_FORMAT_LEGALITIES_VERIFY=PASS " + JSON.stringify({
  rows: Object.keys(payload.by_name_norm).length,
  sha256: sha, source_updated_at: payload.source_updated_at,
}));
