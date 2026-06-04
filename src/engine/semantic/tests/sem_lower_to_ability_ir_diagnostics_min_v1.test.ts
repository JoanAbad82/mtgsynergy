import { describe, expect, it } from "vitest";
import {
  explainLowerToAbilityIrMinV1,
  type LoweringNullReasonMinV1,
} from "../lowering/lower_to_ability_ir_diagnostics_min_v1";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";

describe("lower_to_ability_ir_diagnostics_min_v1", () => {
  it("explains successful canonical lowering without changing runtime lowering output", () => {
    const input = {
      name: "Elvish Mystic",
      oracle_text: "{T}: Add {G}.",
      type_line: "Creature — Elf Druid",
    };

    const before = lowerToAbilityIrMinV1(input);
    const diagnostic = explainLowerToAbilityIrMinV1(input);
    const after = lowerToAbilityIrMinV1(input);

    expect(before).toEqual(after);
    expect(diagnostic).toEqual({
      card_name: "Elvish Mystic",
      lowered: true,
      reason: "LOWERED" satisfies LoweringNullReasonMinV1,
      frame_kind: "ACTIVATED",
      expected_template_kind: "Activated",
      notes: [],
    });
  });

  it("explains unsupported card names as NO_BASE_TEMPLATE", () => {
    const diagnostic = explainLowerToAbilityIrMinV1({
      name: "Totally Unsupported Card",
      oracle_text: "{T}: Add {G}.",
      type_line: "Artifact",
    });

    expect(diagnostic.lowered).toBe(false);
    expect(diagnostic.reason).toBe("NO_BASE_TEMPLATE");
    expect(diagnostic.card_name).toBe("Totally Unsupported Card");
    expect(diagnostic.notes).toContain("No base AbilityIR template exists for this card name.");
  });

  it("explains Howling Mine non-runtime wording mismatch explicitly", () => {
    const input = {
      name: "Howling Mine",
      oracle_text: "At the beginning of each player's draw step, if Howling Mine is untapped, that player draws an additional card.",
      type_line: "Artifact",
    };

    expect(lowerToAbilityIrMinV1(input)).toBeNull();

    const diagnostic = explainLowerToAbilityIrMinV1(input);

    expect(diagnostic.lowered).toBe(false);
    expect(diagnostic.reason).toBe("RUNTIME_WORDING_MISMATCH");
    expect(diagnostic.expected_template_kind).toBe("ConditionalTriggered");
    expect(diagnostic.notes).toContain("Howling Mine runtime wording must contain: if this artifact is untapped.");
  });

  it("explains expected-action mismatch explicitly", () => {
    const input = {
      name: "Crystal Ball",
      oracle_text: "{1}, {T}: Draw a card.",
      type_line: "Artifact",
    };

    expect(lowerToAbilityIrMinV1(input)).toBeNull();

    const diagnostic = explainLowerToAbilityIrMinV1(input);

    expect(diagnostic.lowered).toBe(false);
    expect(diagnostic.reason).toBe("EXPECTED_ACTION_MISMATCH");
    expect(diagnostic.expected_template_kind).toBe("Activated");
    expect(diagnostic.notes).toContain("Parsed frame did not contain the expected semantic action for this card.");
  });
});
