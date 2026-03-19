import { describe, expect, it } from "vitest";
import { CostId } from "../contract";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { classifyCostMinV1, classifyTargetMinV1, parseSemanticIrV0 } from "../parser/sem_parser_v1";

describe("target formal minimum semantics v1", () => {
  it("extracts target creature for Bone Splinters and keeps cost/target separated", () => {
    const oracleText =
      "As an additional cost to cast this spell, sacrifice a creature. Destroy target creature.";
    const parsed = parseSemanticIrV0({
      name: "Bone Splinters",
      oracle_text: oracleText,
      type_line: "Sorcery",
    });
    const target = classifyTargetMinV1(oracleText);

    expect(parsed.frames[0]?.cost.some((entry) => entry.cost === CostId.SACRIFICE_AS_COST)).toBe(true);
    expect(target).toEqual({
      required: true,
      minTargets: 1,
      maxTargets: 1,
      targetKinds: ["creature"],
      zoneHint: "battlefield",
      controllerConstraint: null,
      sourceSpan: "target creature",
    });
  });

  it("extracts composite target kinds for Icy Manipulator and does not leak into cost", () => {
    const oracleText = "{1}, {T}: Tap target artifact, creature, or land.";
    const cost = classifyCostMinV1(oracleText);
    const target = classifyTargetMinV1(oracleText);

    expect(cost).toEqual({ classes: ["MANA", "TAP"] });
    expect(target).toEqual({
      required: true,
      minTargets: 1,
      maxTargets: 1,
      targetKinds: ["artifact", "creature", "land"],
      zoneHint: "battlefield",
      controllerConstraint: null,
      sourceSpan: "target artifact, creature, or land",
    });
  });

  it("does not emit target_min_v1 for Village Rites", () => {
    const oracleText = "As an additional cost to cast this spell, sacrifice a creature. Draw two cards.";
    expect(classifyTargetMinV1(oracleText)).toBeNull();
  });

  it("does not emit target_min_v1 for pronoun-only references", () => {
    const oracleText = "Return it to its owner's hand.";
    expect(classifyTargetMinV1(oracleText)).toBeNull();
  });

  it("propagates target_min_v1 through lowering without changing cost/effects", () => {
    const lowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      oracle_text:
        "{1}, {T}: Scry 2. Tap target artifact, creature, or land.",
    });

    expect(lowered).toBeTruthy();
    expect(lowered?.semantic_hints?.target_min_v1).toEqual({
      required: true,
      minTargets: 1,
      maxTargets: 1,
      targetKinds: ["artifact", "creature", "land"],
      zoneHint: "battlefield",
      controllerConstraint: null,
      sourceSpan: "target artifact, creature, or land",
    });
    expect(lowered?.cost).toEqual(["TAP"]);
    expect(lowered?.effects).toEqual([{ type: "SCRY", detail: "2" }]);
  });
});
