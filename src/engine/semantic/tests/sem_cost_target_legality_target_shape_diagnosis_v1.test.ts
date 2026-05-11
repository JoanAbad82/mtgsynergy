import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { buildCostTargetLegalityHints } from "../lowering/lower_to_ability_ir_min_v1";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type TargetShapeDiagnosticSnapshot = {
  cardName: string;
  canonicalName: string;
  type_line: string | null;
  oracle_text: string;
  min_exists: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number | null;
  legality_count: number | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const TARGET_SHAPE_ANCHORS = [
  "Lightning Bolt",
  "Shock",
  "Duress",
  "Thoughtseize",
  "Fatal Push",
  "Abrade",
  "Fire Prophecy",
  "Into the Roil",
  "Electrolyze",
] as const;

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function findCanonicalName(payload: CardsIndexPayload, name: string): string | null {
  const byName = payload.by_name ?? {};
  const byNameNorm = payload.by_name_norm ?? {};
  if (byName[name]) return name;

  const norm = normalizeCardName(name);
  const canonical = byNameNorm[norm];
  if (canonical && byName[canonical]) return canonical;

  if (!name.includes("//")) {
    const prefix = `${norm} //`;
    const matches = Object.entries(byNameNorm)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .filter((value) => value && byName[value]);
    if (matches.length === 1) return matches[0];
  }

  return null;
}

function buildDiagnosticSnapshot(payload: CardsIndexPayload, cardName: string): TargetShapeDiagnosticSnapshot {
  const canonicalName = findCanonicalName(payload, cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const oracleText = row.oracle_text ?? "";
  const typeLine = row.type_line ?? null;
  const hints = buildCostTargetLegalityHints(oracleText, typeLine);
  const min = hints.costTargetLegalityMin;
  // In this diagnosis microphase, min=null is signal to capture and inspect, not a test failure.

  return {
    cardName,
    canonicalName,
    type_line: typeLine,
    oracle_text: oracleText,
    min_exists: Boolean(min),
    cost_kinds: min ? [...min.cost_kinds] : [],
    target_kinds: min ? [...min.target_kinds] : [],
    legality_kinds: min ? [...min.legality_kinds] : [],
    target_count: min ? min.target_count : null,
    legality_count: min ? min.legality_count : null,
  };
}

describe("cost target legality target shape diagnosis v1", () => {
  it("diagnoses current real-oracle target shape output without freezing new target expectations", () => {
    const payload = loadCardsIndex();
    const runA = TARGET_SHAPE_ANCHORS.map((cardName) => buildDiagnosticSnapshot(payload, cardName));
    const runB = TARGET_SHAPE_ANCHORS.map((cardName) => buildDiagnosticSnapshot(payload, cardName));

    expect(runA).toEqual(runB);

    for (const row of runA) {
      expect(row.canonicalName.length).toBeGreaterThan(0);
      expect(row.oracle_text.trim().length).toBeGreaterThan(0);
      console.log(JSON.stringify(row));
    }

    console.log("TARGET_SHAPE_DIAGNOSIS_COMPLETE");
  });
});
