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

type ModalTargetAggregationDiagnosisSnapshot = {
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
// Diagnostic observed target-kind vocabulary markers:
// ANY_TARGET, PLAYER, PERMANENT, UNKNOWN_TARGET_KIND.
// These are not frozen expectations for every modal command here;
// they document currently observed diagnosis vocabulary for audit checks.
const DIAGNOSIS_CORPUS = [
  "Abrade",
  "Kolaghan's Command",
  "Cryptic Command",
  "Prismari Command",
  "Casualties of War",
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

function buildDiagnosisSnapshot(
  payload: CardsIndexPayload,
  cardName: string,
): ModalTargetAggregationDiagnosisSnapshot {
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
  const min = buildCostTargetLegalityHints(oracleText, typeLine).costTargetLegalityMin;

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

function assertNoLeakage(snapshot: ModalTargetAggregationDiagnosisSnapshot): void {
  if (!snapshot.min_exists) return;
  expect(snapshot.target_kinds).not.toContain("CAST_ONLY_IF");
  expect(snapshot.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
  for (const kind of snapshot.target_kinds) {
    expect(snapshot.legality_kinds).not.toContain(kind);
    expect(snapshot.cost_kinds).not.toContain(kind);
  }
}

describe("cost target legality modal target aggregation diagnosis v1", () => {
  it("diagnoses real-oracle modal target aggregation behavior without repairing modal/split semantics", () => {
    const payload = loadCardsIndex();
    const runA = DIAGNOSIS_CORPUS.map((cardName) => buildDiagnosisSnapshot(payload, cardName));
    const runB = DIAGNOSIS_CORPUS.map((cardName) => buildDiagnosisSnapshot(payload, cardName));

    expect(runA).toEqual(runB);

    for (const snapshot of runA) {
      expect(snapshot.canonicalName.length).toBeGreaterThan(0);
      expect(snapshot.oracle_text.trim().length).toBeGreaterThan(0);
      assertNoLeakage(snapshot);
      console.log(JSON.stringify(snapshot));
    }

    const abrade = runA.find((row) => row.cardName === "Abrade");
    expect(abrade?.min_exists).toBe(true);
    expect(abrade?.target_kinds).toEqual(expect.arrayContaining(["ARTIFACT", "CREATURE"]));
    expect(abrade?.target_count).toBe(2);

    const electrolyze = runA.find((row) => row.cardName === "Electrolyze");
    expect(electrolyze?.min_exists).toBe(true);
    expect(electrolyze?.target_kinds).toEqual(["ANY_TARGET"]);
    expect(electrolyze?.target_count).toBeNull();

    console.log("MODAL_TARGET_AGGREGATION_DIAGNOSIS_COMPLETE");
  });
});
