import { readFile } from "node:fs/promises";

const WORKFLOW_PATH = "maestros/v33/POST_V33_WORKFLOW_EXECUTABLE_v1.md";
const SMOKE_PATH = "tools/semantics/gold/post_v33_canonical_smoke_v1.json";
const SCHEMA_PATH = "tools/semantics/gold/post_v33_snapshot_schema_v1.json";

const REQUIRED_SECTIONS = [
  "Anillo B estable v1",
  "Decks canónicos v1",
  "Snapshot estructurado v1",
  "Puerta de promoción",
];

const REQUIRED_DECK_NAMES = [
  "rakdos_dies_payoff_v1",
  "spells_matter_damage_v1",
  "draw_second_tokens_damage_v1",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

async function main() {
  const workflowRaw = await readFile(WORKFLOW_PATH, "utf8");
  const smokeRaw = await readFile(SMOKE_PATH, "utf8");
  const schemaRaw = await readFile(SCHEMA_PATH, "utf8");

  REQUIRED_SECTIONS.forEach((section) => {
    assert(
      workflowRaw.includes(section),
      `workflow must include section: ${section}`,
    );
  });

  const smoke = JSON.parse(smokeRaw);
  JSON.parse(schemaRaw);

  assert(Array.isArray(smoke.decks), "smoke.decks must be an array");
  const deckNames = smoke.decks.map((deck) => deck?.name);
  assert(
    deckNames.every((name) => typeof name === "string" && name.length > 0),
    "each deck must include a name",
  );

  const expected = sorted(REQUIRED_DECK_NAMES);
  const actual = sorted(deckNames);
  assert(actual.length === expected.length, "smoke must contain exactly 3 deck names");
  expected.forEach((name, index) => {
    assert(actual[index] === name, `missing or unexpected deck name: ${name}`);
  });

  console.log("post_v33 ring: OK");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
