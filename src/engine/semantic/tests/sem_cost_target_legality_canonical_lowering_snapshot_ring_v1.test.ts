import { describe, expect, it } from "vitest";
import { buildCostTargetLegalityHints } from "../lowering/lower_to_ability_ir_min_v1";

type LoweringAnchor = {
  cardName: string;
  oracleText: string;
  typeLine: string;
};

type CanonicalLoweringSnapshot = {
  cardName: string;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number;
  legality_count: number;
};

const A2_10_ANCHORS: LoweringAnchor[] = [
  {
    cardName: "Village Rites",
    oracleText: "As an additional cost to cast this spell, sacrifice a creature. Draw two cards.",
    typeLine: "Instant",
  },
  {
    cardName: "Bone Splinters",
    oracleText: "As an additional cost to cast this spell, sacrifice a creature. Destroy target creature.",
    typeLine: "Sorcery",
  },
  {
    cardName: "Icy Manipulator",
    oracleText: "{1}, {T}: Tap target artifact, creature, or land.",
    typeLine: "Artifact",
  },
  {
    cardName: "Castle Vantress",
    oracleText: "{2}{U}{U}, {T}: Scry 2. Activate only if you control an Island.",
    typeLine: "Land",
  },
];

const EXPECTED_CANONICAL_SNAPSHOT_BY_CARD: Record<string, CanonicalLoweringSnapshot> = {
  "Village Rites": {
    cardName: "Village Rites",
    cost_kinds: ["SACRIFICE"],
    target_kinds: [],
    legality_kinds: [],
    target_count: 0,
    legality_count: 0,
  },
  "Bone Splinters": {
    cardName: "Bone Splinters",
    cost_kinds: ["SACRIFICE"],
    target_kinds: ["CREATURE"],
    legality_kinds: [],
    target_count: 1,
    legality_count: 0,
  },
  "Icy Manipulator": {
    cardName: "Icy Manipulator",
    cost_kinds: ["MANA", "TAP"],
    target_kinds: ["ARTIFACT", "CREATURE", "LAND"],
    legality_kinds: [],
    target_count: 1,
    legality_count: 0,
  },
  "Castle Vantress": {
    cardName: "Castle Vantress",
    cost_kinds: ["MANA", "TAP"],
    target_kinds: [],
    legality_kinds: ["CONTROLS_PERMANENT_TYPE"],
    target_count: 0,
    legality_count: 1,
  },
};

function snapshotFromLowering(anchor: LoweringAnchor): CanonicalLoweringSnapshot {
  const hints = buildCostTargetLegalityHints(anchor.oracleText, anchor.typeLine);
  const min = hints.costTargetLegalityMin;
  if (!min) {
    throw new Error(`Expected cost_target_legality_min for ${anchor.cardName}`);
  }

  return {
    cardName: anchor.cardName,
    cost_kinds: [...min.cost_kinds],
    target_kinds: [...min.target_kinds],
    legality_kinds: [...min.legality_kinds],
    target_count: min.target_count,
    legality_count: min.legality_count,
  };
}

describe("cost target legality canonical lowering snapshot ring v1", () => {
  it("freezes canonical lowering snapshot for the four A2.10 anchors deterministically", () => {
    for (const anchor of A2_10_ANCHORS) {
      const runA = snapshotFromLowering(anchor);
      const runB = snapshotFromLowering(anchor);

      expect(runA).toEqual(runB);
      expect(runA).toEqual(EXPECTED_CANONICAL_SNAPSHOT_BY_CARD[anchor.cardName]);
    }
  });

  it("keeps separation and non-leakage invariants for cost vs target vs legality channels", () => {
    const byName = new Map(
      A2_10_ANCHORS.map((anchor) => [anchor.cardName, snapshotFromLowering(anchor)]),
    );

    const village = byName.get("Village Rites");
    expect(village?.cost_kinds).toContain("SACRIFICE");
    expect(village?.target_count).toBe(0);
    expect(village?.cost_kinds).not.toContain("DRAW_CARDS");

    const bone = byName.get("Bone Splinters");
    expect(bone?.cost_kinds).toContain("SACRIFICE");
    expect(bone?.target_kinds).toContain("CREATURE");
    expect((bone?.target_count ?? 0)).toBeGreaterThanOrEqual(1);

    const icy = byName.get("Icy Manipulator");
    expect(icy?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(icy?.target_kinds).toEqual(expect.arrayContaining(["ARTIFACT", "CREATURE", "LAND"]));
    expect(icy?.target_kinds).not.toContain("TAP_PERMANENT");

    const castle = byName.get("Castle Vantress");
    expect(castle?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(castle?.legality_kinds).toContain("CONTROLS_PERMANENT_TYPE");
    expect((castle?.legality_count ?? 0)).toBeGreaterThanOrEqual(1);
    expect(castle?.legality_kinds).not.toContain("SCRY");
  });
});
