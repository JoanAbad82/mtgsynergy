import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";

type AbilityIrMin = {
  kind: string;
  cost: string[] | null;
  trigger_event: string | null;
  condition: string | null;
  effects: Array<{ type: string; detail: string }>;
  guarded_follow_up: null;
  opaque_remainder: string | null;
  metadata: { source_card: string; corpus_group: string; ability_slot: number };
  semantic_hints?: {
    possible_zone_change?: boolean;
    possible_lki_required?: boolean;
    possible_creature_dies_derivation?: boolean;
    cost_target_legality_min?: {
      cost_kinds: string[];
      target_kinds: string[];
      legality_kinds: string[];
      target_count: number;
      legality_count: number;
    };
  };
};

type AbilityContract = {
  base_card_skeletons: Array<{
    ability_ir_min: AbilityIrMin;
  }>;
};

type AnchorMatrix = {
  anchor_cards: Array<{
    card_name: string;
    corpus_group: string;
    oracle_runtime_text: string | null;
  }>;
};

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = join(here, "../contract/sem_ability_ir_min_v1.json");
const anchorPath = join(here, "../contract/sem_anchor_corpus_matrix_v1.json");

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function buildOracleLookup(matrix: AnchorMatrix): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of matrix.anchor_cards) {
    if (row.corpus_group !== "base") continue;
    if (typeof row.oracle_runtime_text === "string") {
      map.set(row.card_name, row.oracle_runtime_text);
    }
  }
  return map;
}

describe("lowerToAbilityIrMinV1", () => {
  it("lowers the 7 base cards to the canonical AbilityIR skeletons", () => {
    const contract = loadJson<AbilityContract>(contractPath);
    const matrix = loadJson<AnchorMatrix>(anchorPath);
    const oracleByName = buildOracleLookup(matrix);

    for (const entry of contract.base_card_skeletons) {
      const expected = entry.ability_ir_min;
      const name = expected.metadata.source_card;
      const oracleText = oracleByName.get(name);
      expect(oracleText).toBeTruthy();

      const lowered = lowerToAbilityIrMinV1({
        name,
        oracle_text: oracleText ?? "",
      });

      expect(lowered).toBeTruthy();
      expect(lowered?.kind).toEqual(expected.kind);
      expect(lowered?.cost).toEqual(expected.cost);
      expect(lowered?.trigger_event).toEqual(expected.trigger_event);
      expect(lowered?.condition).toEqual(expected.condition);
      expect(lowered?.effects).toEqual(expected.effects);
      expect(lowered?.opaque_remainder).toEqual(expected.opaque_remainder);
      expect(lowered?.metadata).toEqual(expected.metadata);
      if (expected.semantic_hints) {
        expect(lowered?.semantic_hints).toEqual(expected.semantic_hints);
      }
    }
  });

  it("uses the runtime wording for Howling Mine (if this artifact is untapped)", () => {
    const matrix = loadJson<AnchorMatrix>(anchorPath);
    const oracleByName = buildOracleLookup(matrix);
    const oracleText = oracleByName.get("Howling Mine") ?? "";

    expect(oracleText).toMatch(/if this artifact is untapped/i);

    const lowered = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      oracle_text: oracleText,
    });

    expect(lowered?.kind).toBe("ConditionalTriggered");
    expect(lowered?.trigger_event).toBe("AT_BEGINNING_OF_EACH_PLAYERS_DRAW_STEP");
    expect(lowered?.condition).toBe("SELF_UNTAPPED");
  });

  it("returns null for unsupported cards", () => {
    const lowered = lowerToAbilityIrMinV1({
      name: "Serra Angel",
      oracle_text: "Flying, vigilance",
    });

    expect(lowered).toBeNull();
  });

  it("returns null for Howling Mine with non-runtime wording", () => {
    const oracleText =
      "At the beginning of each player's draw step, if Howling Mine is untapped, that player draws an additional card.";

    const lowered = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      oracle_text: oracleText,
    });

    expect(lowered).toBeNull();
  });

  it("does not accept a FrameKind match without the expected semantic action", () => {
    const oracleText =
      "At the beginning of each player's draw step, if this artifact is untapped, that player gains 1 life.";

    const lowered = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      oracle_text: oracleText,
    });

    expect(lowered).toBeNull();
  });

  it("emits cost_target_legality_min for Crystal Ball", () => {
    const matrix = loadJson<AnchorMatrix>(anchorPath);
    const oracleByName = buildOracleLookup(matrix);
    const oracleText = oracleByName.get("Crystal Ball") ?? "";

    const lowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      oracle_text: oracleText,
    });

    expect(lowered?.semantic_hints?.cost_target_legality_min).toEqual({
      cost_kinds: ["MANA", "TAP"],
      target_kinds: [],
      legality_kinds: [],
      target_count: 0,
      legality_count: 0,
    });
  });

  it("does not emit cost_target_legality_min for Howling Mine", () => {
    const matrix = loadJson<AnchorMatrix>(anchorPath);
    const oracleByName = buildOracleLookup(matrix);
    const oracleText = oracleByName.get("Howling Mine") ?? "";

    const lowered = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      oracle_text: oracleText,
    });

    expect(lowered?.semantic_hints?.cost_target_legality_min).toBeUndefined();
  });
});
