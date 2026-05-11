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

type TargetKindSnapshot = {
  cardName: string;
  canonicalName: string | null;
  min_exists: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number | null;
  legality_count: number | null;
};

type SyntheticCase = {
  cardName: string;
  oracleText: string;
  typeLine: string;
  expectedTargetKinds: string[];
  expectedTargetCount: number;
};

type RealOracleCase = {
  cardName: string;
  expectedTargetKinds: string[];
  expectedTargetCount: number;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const SYNTHETIC_CASES: SyntheticCase[] = [
  {
    cardName: "Lightning Bolt (synthetic)",
    oracleText: "Lightning Bolt deals 3 damage to any target.",
    typeLine: "Instant",
    expectedTargetKinds: ["ANY_TARGET"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Target Player (synthetic)",
    oracleText: "Target player mills two cards.",
    typeLine: "Sorcery",
    expectedTargetKinds: ["PLAYER"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Target Opponent (synthetic)",
    oracleText: "Target opponent reveals their hand.",
    typeLine: "Sorcery",
    expectedTargetKinds: ["OPPONENT"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Target Nonland Permanent (synthetic)",
    oracleText: "Return target nonland permanent to its owner's hand.",
    typeLine: "Instant",
    expectedTargetKinds: ["PERMANENT"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Target Creature (synthetic)",
    oracleText: "Destroy target creature.",
    typeLine: "Instant",
    expectedTargetKinds: ["CREATURE"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Target Artifact (synthetic)",
    oracleText: "Destroy target artifact.",
    typeLine: "Instant",
    expectedTargetKinds: ["ARTIFACT"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Target Land (synthetic)",
    oracleText: "Destroy target land.",
    typeLine: "Instant",
    expectedTargetKinds: ["LAND"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Target Permanent (synthetic)",
    oracleText: "Return target permanent to its owner's hand.",
    typeLine: "Instant",
    expectedTargetKinds: ["PERMANENT"],
    expectedTargetCount: 1,
  },
  {
    cardName: "Icy Manipulator Pattern (synthetic)",
    oracleText: "{1}, {T}: Tap target artifact, creature, or land.",
    typeLine: "Artifact",
    expectedTargetKinds: ["ARTIFACT", "CREATURE", "LAND"],
    expectedTargetCount: 1,
  },
];

const REAL_ORACLE_CASES: RealOracleCase[] = [
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

function snapshotFromOracle(cardName: string, oracleText: string, typeLine: string | null, canonicalName: string | null): TargetKindSnapshot {
  const min = buildCostTargetLegalityHints(oracleText, typeLine).costTargetLegalityMin;
  return {
    cardName,
    canonicalName,
    min_exists: Boolean(min),
    cost_kinds: min ? [...min.cost_kinds] : [],
    target_kinds: min ? [...min.target_kinds] : [],
    legality_kinds: min ? [...min.legality_kinds] : [],
    target_count: min ? min.target_count : null,
    legality_count: min ? min.legality_count : null,
  };
}

function assertNoTargetKindLeakage(snapshot: TargetKindSnapshot, expectedTargetKinds: string[]): void {
  for (const kind of expectedTargetKinds) {
    expect(snapshot.cost_kinds).not.toContain(kind);
    expect(snapshot.legality_kinds).not.toContain(kind);
  }
  expect(snapshot.target_kinds).not.toContain("CAST_ONLY_IF");
  expect(snapshot.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
}

describe("cost target legality target kind canonicalization v1", () => {
  it("canonicalizes simple non-modal target kinds for direct synthetic checks through A2.10 entrypoint", () => {
    const runA = SYNTHETIC_CASES.map((testCase) =>
      snapshotFromOracle(testCase.cardName, testCase.oracleText, testCase.typeLine, null),
    );
    const runB = SYNTHETIC_CASES.map((testCase) =>
      snapshotFromOracle(testCase.cardName, testCase.oracleText, testCase.typeLine, null),
    );

    expect(runA).toEqual(runB);

    for (let index = 0; index < SYNTHETIC_CASES.length; index += 1) {
      const testCase = SYNTHETIC_CASES[index]!;
      const snapshot = runA[index]!;
      expect(snapshot.min_exists).toBe(true);
      expect(snapshot.target_kinds).toEqual(testCase.expectedTargetKinds);
      expect(snapshot.target_count).toBe(testCase.expectedTargetCount);
      assertNoTargetKindLeakage(snapshot, testCase.expectedTargetKinds);
    }
  });

  it("canonicalizes the same target kinds on real local oracle corpus without crossing channels", () => {
    const payload = loadCardsIndex();
    const runA = REAL_ORACLE_CASES.map((testCase) => {
      const canonical = findCanonicalName(payload, testCase.cardName);
      expect(canonical).toBeTruthy();
      const row = payload.by_name?.[canonical!];
      expect(row).toBeTruthy();
      const oracleText = row?.oracle_text ?? "";
      expect(oracleText.trim().length).toBeGreaterThan(0);
      return snapshotFromOracle(testCase.cardName, oracleText, row?.type_line ?? null, canonical);
    });
    const runB = REAL_ORACLE_CASES.map((testCase) => {
      const canonical = findCanonicalName(payload, testCase.cardName);
      const row = canonical ? payload.by_name?.[canonical] : undefined;
      return snapshotFromOracle(
        testCase.cardName,
        row?.oracle_text ?? "",
        row?.type_line ?? null,
        canonical ?? null,
      );
    });

    expect(runA).toEqual(runB);

    for (let index = 0; index < REAL_ORACLE_CASES.length; index += 1) {
      const testCase = REAL_ORACLE_CASES[index]!;
      const snapshot = runA[index]!;
      expect(snapshot.min_exists).toBe(true);
      expect(snapshot.target_kinds).toEqual(testCase.expectedTargetKinds);
      expect(snapshot.target_count).toBe(testCase.expectedTargetCount);
      assertNoTargetKindLeakage(snapshot, testCase.expectedTargetKinds);
    }
  });

  it("keeps known non-goals explicit for modal aggregation and split-target phrasing", () => {
    const payload = loadCardsIndex();
    const abradeCanonical = findCanonicalName(payload, "Abrade");
    const electrolyzeCanonical = findCanonicalName(payload, "Electrolyze");

    expect(abradeCanonical).toBeTruthy();
    expect(electrolyzeCanonical).toBeTruthy();

    const abradeRow = abradeCanonical ? payload.by_name?.[abradeCanonical] : null;
    const electrolyzeRow = electrolyzeCanonical ? payload.by_name?.[electrolyzeCanonical] : null;
    expect(abradeRow?.oracle_text?.trim().length ?? 0).toBeGreaterThan(0);
    expect(electrolyzeRow?.oracle_text?.trim().length ?? 0).toBeGreaterThan(0);

    const abrade = snapshotFromOracle(
      "Abrade",
      abradeRow?.oracle_text ?? "",
      abradeRow?.type_line ?? null,
      abradeCanonical ?? null,
    );
    const electrolyze = snapshotFromOracle(
      "Electrolyze",
      electrolyzeRow?.oracle_text ?? "",
      electrolyzeRow?.type_line ?? null,
      electrolyzeCanonical ?? null,
    );

    expect(abrade.min_exists).toBe(true);
    expect(abrade.target_kinds).toEqual(expect.arrayContaining(["ARTIFACT", "CREATURE"]));
    expect(abrade.target_count).toBeGreaterThanOrEqual(1);
    expect(electrolyze.min_exists).toBe(false);
  });
});
