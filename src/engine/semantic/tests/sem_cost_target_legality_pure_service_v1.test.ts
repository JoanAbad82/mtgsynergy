import { describe, expect, it } from "vitest";
import {
  analyzeCostTargetLegalityCaseV1,
  type CostTargetLegalityCaseV1,
} from "../cost_target_legality/sem_cost_target_legality_service_v1";

const VILLAGE_RITES_CASE: CostTargetLegalityCaseV1 = {
  cardName: "Village Rites",
  context: "CAST",
  clauses: {
    costClauses: ["As an additional cost to cast this spell, sacrifice a creature."],
    targetClauses: [],
    legalityClauses: [],
    effectClauses: ["Draw two cards."],
  },
};

const BONE_SPLINTERS_CASE: CostTargetLegalityCaseV1 = {
  cardName: "Bone Splinters",
  context: "CAST",
  clauses: {
    costClauses: ["As an additional cost to cast this spell, sacrifice a creature."],
    targetClauses: ["target creature"],
    legalityClauses: [],
    effectClauses: ["Destroy target creature."],
  },
};

const ICY_MANIPULATOR_CASE: CostTargetLegalityCaseV1 = {
  cardName: "Icy Manipulator",
  context: "ACTIVATE",
  clauses: {
    costClauses: ["{1}, {T}"],
    targetClauses: ["target artifact, creature, or land"],
    legalityClauses: [],
    effectClauses: ["Tap target permanent."],
  },
};

const CASTLE_VANTRESS_CASE: CostTargetLegalityCaseV1 = {
  cardName: "Castle Vantress",
  context: "ACTIVATE",
  clauses: {
    costClauses: ["{2}{U}{U}, {T}"],
    targetClauses: [],
    legalityClauses: ["Activate only if you control an Island."],
    effectClauses: ["Scry 2."],
  },
};

function costKindsOf(result: ReturnType<typeof analyzeCostTargetLegalityCaseV1>): string[] {
  return result.costs.items.map((item) => item.kind);
}

function effectKindsOf(result: ReturnType<typeof analyzeCostTargetLegalityCaseV1>): string[] {
  return result.effects.map((item) => item.kind);
}

describe("cost target legality pure service v1", () => {
  it("is pure, deterministic, and does not mutate input", () => {
    const input: CostTargetLegalityCaseV1 = JSON.parse(JSON.stringify(BONE_SPLINTERS_CASE));
    const before = JSON.stringify(input);

    const resultA = analyzeCostTargetLegalityCaseV1(input);
    const resultB = analyzeCostTargetLegalityCaseV1(input);

    expect(resultA).toEqual(resultB);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("maps Village Rites into SACRIFICE cost plus DRAW_CARDS effect without formal target", () => {
    const result = analyzeCostTargetLegalityCaseV1(VILLAGE_RITES_CASE);

    expect(costKindsOf(result)).toContain("SACRIFICE");
    expect(effectKindsOf(result)).toContain("DRAW_CARDS");
    expect(result.targets).toEqual([]);
    expect(result.legality).toEqual([]);

    expect(result.costs.items.some((item) => /draw two cards/i.test(item.sourceTextSpan ?? ""))).toBe(false);
    expect(result.effects.some((item) => /sacrifice/i.test(item.sourceTextSpan ?? ""))).toBe(false);
  });

  it("maps Bone Splinters into SACRIFICE cost, CREATURE target, and DESTROY effect", () => {
    const result = analyzeCostTargetLegalityCaseV1(BONE_SPLINTERS_CASE);

    expect(costKindsOf(result)).toContain("SACRIFICE");
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.targetKinds).toEqual(["CREATURE"]);
    expect(effectKindsOf(result)).toContain("DESTROY");
    expect(result.legality).toEqual([]);

    expect(result.costs.items.some((item) => /target creature/i.test(item.sourceTextSpan ?? ""))).toBe(false);
    expect(result.targets[0]?.sourceTextSpan?.toLowerCase()).toContain("target creature");
  });

  it("maps Icy Manipulator into MANA+TAP costs, formal multi-kind target, and TAP_PERMANENT effect", () => {
    const result = analyzeCostTargetLegalityCaseV1(ICY_MANIPULATOR_CASE);

    expect(costKindsOf(result)).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.targetKinds).toEqual(["ARTIFACT", "CREATURE", "LAND"]);
    expect(effectKindsOf(result)).toContain("TAP_PERMANENT");
    expect(result.legality).toEqual([]);
  });

  it("maps Castle Vantress legality gate separately from effects and does not invent targets", () => {
    const result = analyzeCostTargetLegalityCaseV1(CASTLE_VANTRESS_CASE);

    expect(costKindsOf(result)).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(result.targets).toEqual([]);
    expect(result.legality).toHaveLength(1);
    expect(result.legality[0]?.kind).toBe("CONTROLS_PERMANENT_TYPE");
    expect(result.legality[0]?.detail).toContain("island");
    expect(effectKindsOf(result)).toEqual(["SCRY"]);

    expect(result.effects.some((item) => /activate only if/i.test(item.sourceTextSpan ?? ""))).toBe(false);
  });
});
