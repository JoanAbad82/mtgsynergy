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

type RealOracleSnapshot = {
  cardName: string;
  hasOracleText: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number;
  legality_count: number;
  known_gap: string | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const A2_10_ANCHOR_NAMES = ["Village Rites", "Bone Splinters", "Icy Manipulator", "Castle Vantress"] as const;
const CASTLE_REAL_ORACLE_KNOWN_GAP = "MULTI_ABILITY_SELECTION_CASTLE_VANTRESS_REAL_ORACLE";
const EXPECTED_REAL_ORACLE_SNAPSHOT_BY_CARD: Record<string, RealOracleSnapshot> = {
  "Village Rites": {
    cardName: "Village Rites",
    hasOracleText: true,
    cost_kinds: ["SACRIFICE"],
    target_kinds: [],
    legality_kinds: [],
    target_count: 0,
    legality_count: 0,
    known_gap: null,
  },
  "Bone Splinters": {
    cardName: "Bone Splinters",
    hasOracleText: true,
    cost_kinds: ["SACRIFICE"],
    target_kinds: ["CREATURE"],
    legality_kinds: [],
    target_count: 1,
    legality_count: 0,
    known_gap: null,
  },
  "Icy Manipulator": {
    cardName: "Icy Manipulator",
    hasOracleText: true,
    cost_kinds: ["MANA", "TAP"],
    target_kinds: ["ARTIFACT", "CREATURE", "LAND"],
    legality_kinds: [],
    target_count: 1,
    legality_count: 0,
    known_gap: null,
  },
  "Castle Vantress": {
    cardName: "Castle Vantress",
    hasOracleText: true,
    cost_kinds: ["TAP"],
    target_kinds: [],
    legality_kinds: [],
    target_count: 0,
    legality_count: 0,
    // Oracle real local contiene varias lineas/habilidades; esta microfase congela el gap actual, no lo corrige.
    known_gap: CASTLE_REAL_ORACLE_KNOWN_GAP,
  },
};

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

function snapshotFromRealOracle(payload: CardsIndexPayload, cardName: string): RealOracleSnapshot {
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
  const hasOracleText = oracleText.trim().length > 0;

  const loweredHint = buildCostTargetLegalityHints(oracleText, typeLine);
  const semanticHints = { cost_target_legality_min: loweredHint.costTargetLegalityMin };
  const min = semanticHints.cost_target_legality_min;

  if (!min) {
    throw new Error(`Expected semantic_hints.cost_target_legality_min for ${cardName}`);
  }

  return {
    cardName,
    hasOracleText,
    cost_kinds: [...min.cost_kinds],
    target_kinds: [...min.target_kinds],
    legality_kinds: [...min.legality_kinds],
    target_count: min.target_count,
    legality_count: min.legality_count,
    known_gap: cardName === "Castle Vantress" ? CASTLE_REAL_ORACLE_KNOWN_GAP : null,
  };
}

describe("cost target legality real oracle lowering ring v1", () => {
  it("loads local cards_index oracle text and freezes deterministic snapshots for covered anchors plus documented Castle gap", () => {
    const payload = loadCardsIndex();
    const runA = A2_10_ANCHOR_NAMES.map((cardName) => snapshotFromRealOracle(payload, cardName));
    const runB = A2_10_ANCHOR_NAMES.map((cardName) => snapshotFromRealOracle(payload, cardName));

    expect(runA).toEqual(runB);
    expect(runA).toEqual(A2_10_ANCHOR_NAMES.map((cardName) => EXPECTED_REAL_ORACLE_SNAPSHOT_BY_CARD[cardName]));
  });

  it("keeps covered-anchor invariants and documents the Castle multi-ability selection gap without overclaiming full coverage", () => {
    const payload = loadCardsIndex();
    const byName = new Map(
      A2_10_ANCHOR_NAMES.map((cardName) => [cardName, snapshotFromRealOracle(payload, cardName)]),
    );

    const village = byName.get("Village Rites");
    expect(village?.known_gap).toBeNull();
    expect(village?.cost_kinds).toContain("SACRIFICE");
    expect(village?.target_count).toBe(0);
    expect(village?.target_kinds).toEqual([]);
    expect(village?.cost_kinds).not.toContain("DRAW_CARDS");

    const bone = byName.get("Bone Splinters");
    expect(bone?.known_gap).toBeNull();
    expect(bone?.cost_kinds).toContain("SACRIFICE");
    expect(bone?.target_kinds).toContain("CREATURE");
    expect((bone?.target_count ?? 0)).toBeGreaterThanOrEqual(1);
    expect(bone?.target_kinds).not.toContain("DESTROY");

    const icy = byName.get("Icy Manipulator");
    expect(icy?.known_gap).toBeNull();
    expect(icy?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(icy?.target_kinds).toEqual(expect.arrayContaining(["ARTIFACT", "CREATURE", "LAND"]));
    expect((icy?.target_count ?? 0)).toBeGreaterThanOrEqual(1);
    expect(icy?.target_kinds).not.toContain("TAP_PERMANENT");

    const castle = byName.get("Castle Vantress");
    expect(castle?.known_gap).toBe(CASTLE_REAL_ORACLE_KNOWN_GAP);
    expect(castle?.cost_kinds).toEqual(["TAP"]);
    expect(castle?.legality_kinds).toEqual([]);
    expect(castle?.cost_kinds).toContain("TAP");
    // No-leakage se mantiene, pero aqui se interpreta bajo el known gap documentado.
    expect(castle?.legality_kinds).not.toContain("SCRY");
  });
});
