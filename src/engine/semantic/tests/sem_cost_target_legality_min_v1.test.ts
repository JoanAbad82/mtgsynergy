import { describe, expect, it } from "vitest";
import { analyzeCostTargetLegalityMinV1 } from "../services/sem_cost_target_legality_min_v1";

describe("cost target legality min v1 service", () => {
  it("detects additional sacrifice cost without targets or legality gates for Village Rites", () => {
    const text = "As an additional cost to cast this spell, sacrifice a creature. Draw two cards.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "SACRIFICE")).toBe(true);
    expect(result.targetSpecs).toHaveLength(0);
    expect(result.legalityGates).toHaveLength(0);
  });

  it("detects additional sacrifice cost and one creature target for Bone Splinters", () => {
    const text = "As an additional cost to cast this spell, sacrifice a creature. Destroy target creature.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "SACRIFICE")).toBe(true);
    expect(result.targetSpecs).toHaveLength(1);
    expect(result.targetSpecs[0]?.targetKinds).toEqual(["CREATURE"]);
    expect(result.legalityGates).toHaveLength(0);
  });

  it("detects mana and tap costs plus artifact/creature/land target for Icy Manipulator", () => {
    const text = "{1}, {T}: Tap target artifact, creature, or land.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "MANA")).toBe(true);
    expect(result.costIr.items.some((item) => item.kind === "TAP")).toBe(true);
    expect(result.targetSpecs).toHaveLength(1);
    expect(result.targetSpecs[0]?.targetKinds).toEqual(["ARTIFACT", "CREATURE", "LAND"]);
    expect(result.legalityGates).toHaveLength(0);
  });

  it("detects mana and tap costs plus one control-island legality gate for Castle Vantress", () => {
    const text = "{2}{U}{U}, {T}: Scry 2. Activate only if you control an Island.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "MANA")).toBe(true);
    expect(result.costIr.items.some((item) => item.kind === "TAP")).toBe(true);
    expect(result.targetSpecs).toHaveLength(0);
    expect(result.legalityGates).toHaveLength(1);
    expect(result.legalityGates[0]?.kind).toBe("CONTROLS_PERMANENT_TYPE");
    expect(result.legalityGates[0]?.detail).toContain("island");
  });
});
