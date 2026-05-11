import { describe, expect, it } from "vitest";
import {
  buildCostTargetLegalityHints,
  lowerToAbilityIrMinV1,
} from "../lowering/lower_to_ability_ir_min_v1";

describe("cost target legality lowering hint wiring v1", () => {
  it("maps Village Rites into SACRIFICE cost hint without formal target and without effect leakage", () => {
    const hints = buildCostTargetLegalityHints(
      "As an additional cost to cast this spell, sacrifice a creature. Draw two cards.",
      "Instant",
    );

    expect(hints.costTargetLegalityMin).toBeTruthy();
    expect(hints.costTargetLegalityMin?.cost_kinds).toContain("SACRIFICE");
    expect(hints.costTargetLegalityMin?.target_kinds).toEqual([]);
    expect(hints.costTargetLegalityMin?.target_count).toBe(0);
    expect(hints.costTargetLegalityMin?.cost_kinds).not.toContain("DRAW_CARDS");
  });

  it("maps Bone Splinters into SACRIFICE + CREATURE target hint", () => {
    const hints = buildCostTargetLegalityHints(
      "As an additional cost to cast this spell, sacrifice a creature. Destroy target creature.",
      "Sorcery",
    );

    expect(hints.costTargetLegalityMin).toBeTruthy();
    expect(hints.costTargetLegalityMin?.cost_kinds).toContain("SACRIFICE");
    expect(hints.costTargetLegalityMin?.target_kinds).toContain("CREATURE");
    expect(hints.costTargetLegalityMin?.target_count).toBeGreaterThanOrEqual(1);
  });

  it("maps Icy Manipulator into MANA+TAP costs and ARTIFACT/CREATURE/LAND targets without effect kind leakage", () => {
    const hints = buildCostTargetLegalityHints(
      "{1}, {T}: Tap target artifact, creature, or land.",
      "Artifact",
    );

    expect(hints.costTargetLegalityMin).toBeTruthy();
    expect(hints.costTargetLegalityMin?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(hints.costTargetLegalityMin?.target_kinds).toEqual(
      expect.arrayContaining(["ARTIFACT", "CREATURE", "LAND"]),
    );
    expect(hints.costTargetLegalityMin?.target_kinds).not.toContain("TAP_PERMANENT");
  });

  it("maps Castle Vantress into MANA+TAP costs and legality gate without effect leakage", () => {
    const hints = buildCostTargetLegalityHints(
      "{2}{U}{U}, {T}: Scry 2. Activate only if you control an Island.",
      "Land",
    );

    expect(hints.costTargetLegalityMin).toBeTruthy();
    expect(hints.costTargetLegalityMin?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(hints.costTargetLegalityMin?.legality_kinds).toContain("CONTROLS_PERMANENT_TYPE");
    expect(hints.costTargetLegalityMin?.legality_count).toBeGreaterThanOrEqual(1);
    expect(hints.costTargetLegalityMin?.legality_kinds).not.toContain("SCRY");
  });

  it("selects Castle Vantress non-mana activated line from real multi-ability oracle text", () => {
    const hints = buildCostTargetLegalityHints(
      "This land enters tapped unless you control an Island.\n{T}: Add {U}.\n{2}{U}{U}, {T}: Scry 2.",
      "Land",
    );

    expect(hints.costTargetLegalityMin).toBeTruthy();
    expect(hints.costTargetLegalityMin?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(hints.costTargetLegalityMin?.target_kinds).toEqual([]);
    expect(hints.costTargetLegalityMin?.target_count).toBe(0);
    expect(hints.costTargetLegalityMin?.legality_kinds).toEqual([]);
    expect(hints.costTargetLegalityMin?.legality_count).toBe(0);
    expect(hints.costTargetLegalityMin?.legality_kinds).not.toContain("SCRY");
  });

  it("maps Activate only as a sorcery into legality gate without leaking into target channel", () => {
    const hints = buildCostTargetLegalityHints(
      "{T}, Sacrifice Bloodtithe Harvester: Target creature gets -X/-X until end of turn, where X is twice the number of Blood tokens you control. Activate only as a sorcery.",
      "Creature — Vampire",
    );

    expect(hints.costTargetLegalityMin).toBeTruthy();
    expect(hints.costTargetLegalityMin?.cost_kinds).toEqual(expect.arrayContaining(["SACRIFICE", "TAP"]));
    expect(hints.costTargetLegalityMin?.target_kinds).toContain("CREATURE");
    expect(hints.costTargetLegalityMin?.target_count).toBeGreaterThanOrEqual(1);
    expect(hints.costTargetLegalityMin?.legality_kinds).toContain("ACTIVATE_ONLY_AS_SORCERY");
    expect(hints.costTargetLegalityMin?.legality_count).toBeGreaterThanOrEqual(1);
    expect(hints.costTargetLegalityMin?.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
  });

  it("adds cost_target_legality_min hint additively without breaking existing semantic_hints", () => {
    const loweredCrystalBall = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      oracle_text: "{1}, {T}: Scry 2.",
    });

    expect(loweredCrystalBall).toBeTruthy();
    expect(loweredCrystalBall?.semantic_hints?.cost_min_v1).toEqual({
      classes: ["MANA", "TAP"],
    });
    expect(loweredCrystalBall?.semantic_hints?.cost_target_legality_min).toEqual({
      cost_kinds: ["MANA", "TAP"],
      target_kinds: [],
      legality_kinds: [],
      target_count: 0,
      legality_count: 0,
    });

    const loweredHowlingMine = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      oracle_text:
        "At the beginning of each player's draw step, if this artifact is untapped, that player draws an additional card.",
    });

    expect(loweredHowlingMine).toBeTruthy();
    expect(loweredHowlingMine?.semantic_hints?.triggered_ability_min).toBeDefined();
    expect(loweredHowlingMine?.semantic_hints?.cost_target_legality_min).toBeUndefined();
  });
});
