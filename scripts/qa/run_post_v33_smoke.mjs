import { readFile } from "node:fs/promises";

const SMOKE_PATH = "tools/semantics/gold/post_v33_canonical_smoke_v1.json";
const SCHEMA_PATH = "tools/semantics/gold/post_v33_snapshot_schema_v1.json";

const REQUIRED_SCHEMA_KEYS = [
  "coverage",
  "SOS",
  "total_edge_score",
  "top_edges",
  "forbidden_edges_absent",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertDeck(deck, index) {
  const label = `deck[${index}]`;
  assert(deck && typeof deck === "object", `${label} must be an object`);
  assert(isNonEmptyString(deck.name), `${label}.name must be a non-empty string`);
  assert(Array.isArray(deck.entries), `${label}.entries must be an array`);
  deck.entries.forEach((entry, entryIndex) => {
    assert(
      isNonEmptyString(entry),
      `${label}.entries[${entryIndex}] must be a non-empty string`,
    );
  });
}

function assertRequiredSchemaKeys(schema) {
  assert(schema && typeof schema === "object", "schema must be an object");
  assert(Array.isArray(schema.required_top_level), "schema.required_top_level must be an array");
  assert(
    schema.required_top_level.length === REQUIRED_SCHEMA_KEYS.length,
    "schema.required_top_level must contain the exact required keys",
  );

  REQUIRED_SCHEMA_KEYS.forEach((key, index) => {
    assert(
      schema.required_top_level[index] === key,
      `schema.required_top_level[${index}] must be ${key}`,
    );
  });
}

async function main() {
  const smokeRaw = await readFile(SMOKE_PATH, "utf8");
  const schemaRaw = await readFile(SCHEMA_PATH, "utf8");

  const smoke = JSON.parse(smokeRaw);
  const schema = JSON.parse(schemaRaw);

  assert(Array.isArray(smoke.decks), "smoke.decks must be an array");
  assert(smoke.decks.length === 3, "smoke.decks must contain exactly 3 decks");
  smoke.decks.forEach(assertDeck);

  assertRequiredSchemaKeys(schema);

  console.log("post_v33 smoke: OK");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
