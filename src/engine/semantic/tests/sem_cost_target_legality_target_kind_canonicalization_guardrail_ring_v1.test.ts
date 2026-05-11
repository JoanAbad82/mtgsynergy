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

type CanonicalCase = {
  cardName: string;
  expectedTargetKinds: string[];
  expectedTargetCount: number;
};

type TargetKindSnapshot = {
  cardName: string;
  canonicalName: string;
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

const CANONICALIZED_CORPUS: CanonicalCase[] = [
  { cardName: "Lightning Bolt", expectedTargetKinds: ["ANY_TARGET"], expectedTargetCount: 1 },
  { cardName: "Shock", expectedTargetKinds: ["ANY_TARGET"], expectedTargetCount: 1 },
  { cardName: "Duress", expectedTargetKinds: ["OPPONENT"], expectedTargetCount: 1 },
  { cardName: "Thoughtseize", expectedTargetKinds: ["PLAYER"], expectedTargetCount: 1 },
  { cardName: "Into the Roil", expectedTargetKinds: ["PERMANENT"], expectedTargetCount: 1 },
  { cardName: "Fatal Push", expectedTargetKinds: ["CREATURE"], expectedTargetCount: 1 },
  { cardName: "Fire Prophecy", expectedTargetKinds: ["CREATURE"], expectedTargetCount: 1 },
];

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

function snapshotFromRealOracle(payload: CardsIndexPayload, cardName: string): TargetKindSnapshot {
  const canonicalName = findCanonicalName(payload, cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const oracleText = row.oracle_text ?? "";
  const min = buildCostTargetLegalityHints(oracleText, row.type_line ?? null).costTargetLegalityMin;

  return {
    cardName,
    canonicalName,
    oracle_text: oracleText,
    min_exists: Boolean(min),
    cost_kinds: min ? [...min.cost_kinds] : [],
    target_kinds: min ? [...min.target_kinds] : [],
    legality_kinds: min ? [...min.legality_kinds] : [],
    target_count: min ? min.target_count : null,
    legality_count: min ? min.legality_count : null,
  };
}

function assertNoLeakage(snapshot: TargetKindSnapshot, targetKinds: string[]): void {
  for (const kind of targetKinds) {
    expect(snapshot.cost_kinds).not.toContain(kind);
    expect(snapshot.legality_kinds).not.toContain(kind);
  }
  expect(snapshot.target_kinds).not.toContain("CAST_ONLY_IF");
  expect(snapshot.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
}

describe("cost target legality target kind canonicalization guardrail ring v1", () => {
  it("keeps deterministic real-oracle canonicalized target kinds for the protected corpus", () => {
    const payload = loadCardsIndex();
    const runA = CANONICALIZED_CORPUS.map((testCase) => snapshotFromRealOracle(payload, testCase.cardName));
    const runB = CANONICALIZED_CORPUS.map((testCase) => snapshotFromRealOracle(payload, testCase.cardName));

    expect(runA).toEqual(runB);

    for (let index = 0; index < CANONICALIZED_CORPUS.length; index += 1) {
      const testCase = CANONICALIZED_CORPUS[index]!;
      const snapshot = runA[index]!;
      expect(snapshot.canonicalName.length).toBeGreaterThan(0);
      expect(snapshot.oracle_text.trim().length).toBeGreaterThan(0);
      expect(snapshot.min_exists).toBe(true);
      expect(snapshot.target_kinds).toEqual(testCase.expectedTargetKinds);
      expect(snapshot.target_count).toBe(testCase.expectedTargetCount);
      assertNoLeakage(snapshot, testCase.expectedTargetKinds);
    }
  });

  it("keeps Abrade and Electrolyze as explicit non-goals", () => {
    const payload = loadCardsIndex();
    const abrade = snapshotFromRealOracle(payload, "Abrade");
    const electrolyze = snapshotFromRealOracle(payload, "Electrolyze");

    expect(abrade.canonicalName.length).toBeGreaterThan(0);
    expect(abrade.oracle_text.trim().length).toBeGreaterThan(0);
    expect(electrolyze.canonicalName.length).toBeGreaterThan(0);
    expect(electrolyze.oracle_text.trim().length).toBeGreaterThan(0);

    // Modal target aggregation is intentionally not repaired in this microphase.
    expect(abrade.min_exists).toBe(true);
    expect(abrade.target_kinds).toEqual(expect.arrayContaining(["ARTIFACT", "CREATURE"]));
    expect(abrade.target_count).toBe(2);
    assertNoLeakage(abrade, ["ARTIFACT", "CREATURE"]);

    // Split-target/divided damage is intentionally not repaired in this microphase.
    expect(electrolyze.min_exists).toBe(false);
    expect(electrolyze.target_kinds).toEqual([]);
    expect(electrolyze.target_count).toBeNull();
    expect(electrolyze.target_kinds).not.toContain("CAST_ONLY_IF");
    expect(electrolyze.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
  });
});
