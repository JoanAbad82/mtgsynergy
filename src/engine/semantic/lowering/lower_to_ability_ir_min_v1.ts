import { ActionId, FrameKind } from "../contract";
import {
  parseSemanticIrV0,
  classifyTriggeredAbilityMinV1,
  type TriggeredAbilityClassificationMinV1,
} from "../parser/sem_parser_v1";
import { analyzeCostTargetLegalityMinV1 } from "../services/sem_cost_target_legality_min_v1";

type AbilityIrEffect = {
  type: "ADD_MANA" | "SCRY" | "MILL_CARDS" | "DRAW_CARDS";
  detail: string;
};

export type AbilityIrMin = {
  kind: "Activated" | "ConditionalTriggered";
  cost: string[] | null;
  trigger_event: string | null;
  condition: string | null;
  effects: AbilityIrEffect[];
  guarded_follow_up: null;
  opaque_remainder: string | null;
  metadata: {
    source_card: string;
    corpus_group: "base";
    ability_slot: 1;
  };
  semantic_hints?: {
    possible_zone_change?: boolean;
    possible_lki_required?: boolean;
    possible_creature_dies_derivation?: boolean;
    triggered_ability_min?: TriggeredAbilityClassificationMinV1;
    cost_target_legality_min?: {
      cost_kinds: string[];
      target_kinds: string[];
      legality_kinds: string[];
      target_count: number;
      legality_count: number;
    };
  };
};

type LowerInput = {
  name: string;
  oracle_text: string;
  type_line?: string | null;
};

type BaseAbilityTemplate = Omit<AbilityIrMin, "metadata">;

const BASE_ABILITY_TEMPLATES: Record<string, BaseAbilityTemplate> = {
  "Elvish Mystic": {
    kind: "Activated",
    cost: ["TAP"],
    trigger_event: null,
    condition: null,
    effects: [{ type: "ADD_MANA", detail: "{G}" }],
    guarded_follow_up: null,
    opaque_remainder: null,
  },
  "Darksteel Ingot": {
    kind: "Activated",
    cost: ["TAP"],
    trigger_event: null,
    condition: null,
    effects: [{ type: "ADD_MANA", detail: "any color" }],
    guarded_follow_up: null,
    opaque_remainder: "Indestructible static clause intentionally left out of current v1 anchor coverage",
  },
  "Gilded Lotus": {
    kind: "Activated",
    cost: ["TAP"],
    trigger_event: null,
    condition: null,
    effects: [{ type: "ADD_MANA", detail: "three mana of any one color" }],
    guarded_follow_up: null,
    opaque_remainder: null,
  },
  "Worn Powerstone": {
    kind: "Activated",
    cost: ["TAP"],
    trigger_event: null,
    condition: null,
    effects: [{ type: "ADD_MANA", detail: "{C}{C}" }],
    guarded_follow_up: null,
    opaque_remainder: "ETB tapped clause intentionally left out of current v1 anchor coverage",
  },
  "Crystal Ball": {
    kind: "Activated",
    cost: ["TAP"],
    trigger_event: null,
    condition: null,
    effects: [{ type: "SCRY", detail: "2" }],
    guarded_follow_up: null,
    opaque_remainder: "Mana cost intentionally left out of current v1 anchor coverage",
  },
  "Millstone": {
    kind: "Activated",
    cost: ["TAP"],
    trigger_event: null,
    condition: null,
    effects: [{ type: "MILL_CARDS", detail: "2" }],
    guarded_follow_up: null,
    opaque_remainder: "Mana cost and target player clause intentionally left out of current v1 anchor coverage",
  },
  "Howling Mine": {
    kind: "ConditionalTriggered",
    cost: null,
    trigger_event: "AT_BEGINNING_OF_EACH_PLAYERS_DRAW_STEP",
    condition: "SELF_UNTAPPED",
    effects: [{ type: "DRAW_CARDS", detail: "additional card" }],
    guarded_follow_up: null,
    opaque_remainder: null,
  },
};

const EXPECTED_ACTION_BY_CARD: Record<string, ActionId> = {
  "Elvish Mystic": ActionId.PRODUCE_MANA,
  "Darksteel Ingot": ActionId.PRODUCE_MANA,
  "Gilded Lotus": ActionId.PRODUCE_MANA,
  "Worn Powerstone": ActionId.PRODUCE_MANA,
  "Crystal Ball": ActionId.SCRY,
  "Millstone": ActionId.MILL_CARDS,
  "Howling Mine": ActionId.DRAW_CARDS,
};

function matchesRuntimeHowlingMine(text: string): boolean {
  return /if this artifact is untapped/i.test(text);
}

function kindMatchesFrame(expected: BaseAbilityTemplate, frameKind: FrameKind): boolean {
  if (expected.kind === "Activated") return frameKind === FrameKind.ACTIVATED;
  if (expected.kind === "ConditionalTriggered") return frameKind === FrameKind.TRIGGERED;
  return false;
}

function hasExpectedAction(cardName: string, actions: ReadonlyArray<{ action: ActionId }>): boolean {
  const expected = EXPECTED_ACTION_BY_CARD[cardName];
  if (expected === undefined) return false;
  return actions.some((entry) => entry.action === expected);
}

function sortedUnique(items: string[]): string[] {
  return Array.from(new Set(items)).sort();
}

function buildCostTargetLegalityHint(oracleText: string): NonNullable<AbilityIrMin["semantic_hints"]>["cost_target_legality_min"] | undefined {
  const analyzed = analyzeCostTargetLegalityMinV1(oracleText);
  const costKinds = sortedUnique(analyzed.costIr.items.map((item) => item.kind));
  const targetKinds = sortedUnique(analyzed.targetSpecs.flatMap((spec) => spec.targetKinds));
  const legalityKinds = sortedUnique(analyzed.legalityGates.map((gate) => gate.kind));
  const targetCount = analyzed.targetSpecs.length;
  const legalityCount = analyzed.legalityGates.length;

  if (
    costKinds.length === 0 &&
    targetKinds.length === 0 &&
    legalityKinds.length === 0 &&
    targetCount === 0 &&
    legalityCount === 0
  ) {
    return undefined;
  }

  return {
    cost_kinds: costKinds,
    target_kinds: targetKinds,
    legality_kinds: legalityKinds,
    target_count: targetCount,
    legality_count: legalityCount
  };
}

function buildSemanticHints(
  oracleText: string,
): AbilityIrMin["semantic_hints"] | undefined {
  const normalized = oracleText.toLowerCase();
  const hasDiesWord = /\bdies\b/.test(normalized);

  const possibleCreatureDiesDerivation = hasDiesWord;
  const possibleZoneChange =
    hasDiesWord ||
    normalized.includes("leaves the battlefield") ||
    normalized.includes("return target") ||
    normalized.includes("exile target") ||
    normalized.includes("from your graveyard") ||
    normalized.includes("from a graveyard");
  const possibleLkiRequired =
    normalized.includes("that card") &&
    (normalized.includes("graveyard") ||
      normalized.includes("exile") ||
      normalized.includes("leaves the battlefield"));

  const hints: NonNullable<AbilityIrMin["semantic_hints"]> = {};

  if (possibleZoneChange) {
    hints.possible_zone_change = true;
  }
  if (possibleLkiRequired) {
    hints.possible_lki_required = true;
  }
  if (possibleCreatureDiesDerivation) {
    hints.possible_creature_dies_derivation = true;
  }

  const triggeredAbilityMin = classifyTriggeredAbilityMinV1(oracleText);
  if (triggeredAbilityMin.is_triggered || triggeredAbilityMin.fallback) {
    hints.triggered_ability_min = triggeredAbilityMin;
  }

  const costTargetLegalityHint = buildCostTargetLegalityHint(oracleText);
  if (costTargetLegalityHint) {
    hints.cost_target_legality_min = costTargetLegalityHint;
  }

  if (Object.keys(hints).length === 0) {
    return undefined;
  }

  return hints;
}

export function lowerToAbilityIrMinV1(input: LowerInput): AbilityIrMin | null {
  const template = BASE_ABILITY_TEMPLATES[input.name];
  if (!template) return null;

  const ir = parseSemanticIrV0({
    name: input.name,
    oracle_text: input.oracle_text,
    type_line: input.type_line ?? null,
  });
  const frame = ir.frames[0];
  if (!frame || !kindMatchesFrame(template, frame.kind)) {
    return null;
  }

  if (input.name === "Howling Mine" && !matchesRuntimeHowlingMine(input.oracle_text)) {
    return null;
  }

  if (!hasExpectedAction(input.name, frame.do)) {
    return null;
  }

  const lowered: AbilityIrMin = {
    ...template,
    metadata: {
      source_card: input.name,
      corpus_group: "base",
      ability_slot: 1,
    },
  };

  const semanticHints = buildSemanticHints(input.oracle_text);
  if (semanticHints) {
    return {
      ...lowered,
      semantic_hints: semanticHints,
    };
  }

  return lowered;
}
