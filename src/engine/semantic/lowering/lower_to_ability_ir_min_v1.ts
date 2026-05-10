import { ActionId, FrameKind } from "../contract";
import {
  parseSemanticIrV0,
  classifyCostMinV1,
  classifyTargetMinV1,
  classifyLegalityGateMinV1,
  classifyTriggeredAbilityMinV1,
  classifyReplacementPreventionMinV1,
  classifyLinkedAbilityMinV1,
  classifyContinuousLayersDependencyTimestampMinV1,
  type CostMinClassificationMinV1,
  type ContinuousLayersClassMinV1,
  type ContinuousLayersOrderingRiskMinV1,
  type LegalityGateMinV1,
  type LegalityActorConstraintMinV1,
  type LegalityConditionMinV1,
  type LegalityStaticAbilityRestrictionMinV1,
  type LoyaltyAbilityMinV1,
  type LoyaltySymbolCostMinV1,
  type ManaAbilityMinV1,
  type ModeSelectionMinV1,
  type TriggeredManaAbilityMinV1,
  type LinkedAbilityClassMinV1,
  type ReplacementPreventionClassMinV1,
  type TargetMinSpecMinV1,
  type TriggeredAbilityClassificationMinV1,
  type ZonePermissionMinV1,
} from "../parser/sem_parser_v1";
import { type SummoningSicknessTapQMin } from "../types/sem_cost_target_legality_types";
import {
  analyzeCostTargetLegalityCaseV1,
  type CostTargetLegalityCaseV1,
} from "../cost_target_legality/sem_cost_target_legality_service_v1";
import { analyzeCostTargetLegalityMinV1 } from "../services/sem_cost_target_legality_min_v1";

type AbilityIrEffect = {
  type: "ADD_MANA" | "SCRY" | "MILL_CARDS" | "DRAW_CARDS";
  detail: string;
};

type LegalityActionBindingMinV1 = "CAST_ONLY" | "ACTIVATE_ONLY";
type LoyaltyActivationRestrictionKindMinV1 = "ACTIVATE_ONLY_AS_SORCERY";
type LoyaltyOnceEachTurnRestrictionMinV1 = "ONCE_EACH_TURN";
type LoyaltySymbolCostTokenMinV1 = "LOYALTY_PLUS" | "LOYALTY_MINUS" | "LOYALTY_ZERO";

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
  legality?: (Record<string, unknown> & {
    kind?: LoyaltyActivationRestrictionKindMinV1;
    loyalty_once_each_turn_restriction_min_v1?: LoyaltyOnceEachTurnRestrictionMinV1;
    action_context?: LegalityActionBindingMinV1;
    zone_permission_min?: ZonePermissionMinV1;
    actor_constraint_min?: LegalityActorConstraintMinV1;
    condition_min?: LegalityConditionMinV1;
    static_ability_restrictions_min_v1?: LegalityStaticAbilityRestrictionMinV1;
    loyalty_ability_min?: LoyaltyAbilityMinV1;
    mana_ability_min?: ManaAbilityMinV1;
    triggered_mana_ability_min?: TriggeredManaAbilityMinV1;
    summoning_sickness_tap_q_min?: SummoningSicknessTapQMin;
  });
  semantic_hints?: {
    possible_zone_change?: boolean;
    possible_lki_required?: boolean;
    possible_creature_dies_derivation?: boolean;
    triggered_ability_min?: TriggeredAbilityClassificationMinV1;
    replacement_prevention_min?: ReplacementPreventionClassMinV1;
    linked_ability_min?: LinkedAbilityClassMinV1;
    continuous_layers_min?: {
      class: ContinuousLayersClassMinV1;
      ordering_risk: ContinuousLayersOrderingRiskMinV1;
    };
    cost_min_v1?: CostMinClassificationMinV1;
    target_min_v1?: TargetMinSpecMinV1;
    mode_selection_min?: ModeSelectionMinV1;
    legality_gate_min_v1?: LegalityGateMinV1;
    legality_action_binding_min?: LegalityActionBindingMinV1;
    zone_permission_min?: ZonePermissionMinV1;
    legality_actor_constraint_min?: LegalityActorConstraintMinV1;
    legality_condition_min?: LegalityConditionMinV1;
    legality_static_ability_restrictions_min_v1?: LegalityStaticAbilityRestrictionMinV1;
    loyalty_ability_min?: LoyaltyAbilityMinV1;
    loyalty_once_each_turn_restriction_min_v1?: LoyaltyOnceEachTurnRestrictionMinV1;
    loyalty_symbol_cost_min_v1?: LoyaltySymbolCostMinV1;
    mana_ability_min?: ManaAbilityMinV1;
    triggered_mana_ability_min?: TriggeredManaAbilityMinV1;
    legality_summoning_sickness_tap_q_min?: SummoningSicknessTapQMin;
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
  "Q Symbol Canonical Carrier": {
    kind: "Activated",
    cost: ["UNTAP"],
    trigger_event: null,
    condition: null,
    effects: [{ type: "DRAW_CARDS", detail: "a card" }],
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
  "Q Symbol Canonical Carrier": ActionId.DRAW_CARDS,
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

function splitClausesMinV1(text: string): string[] {
  return text
    .split(".")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `${part}.`);
}

function looksLikeActivatedCostPrefixMinV1(text: string): boolean {
  return (
    /\{[^}]+\}/.test(text) ||
    /\bsacrifice\b/i.test(text) ||
    /\bdiscard\b/i.test(text) ||
    /\bpay\b[^.]*\blife\b/i.test(text) ||
    /\bremove\b[^.]*\bcounter\b/i.test(text)
  );
}

function buildCostTargetLegalityCaseMinV1(
  oracleText: string,
): CostTargetLegalityCaseV1 {
  const normalized = oracleText.replace(/\s+/g, " ").trim();
  const costClauses: string[] = [];
  const targetClauses: string[] = [];
  const legalityClauses: string[] = [];
  const effectClauses: string[] = [];
  const colonIndex = normalized.indexOf(":");
  let remainder = normalized;

  if (colonIndex > -1) {
    const prefix = normalized.slice(0, colonIndex).trim();
    const after = normalized.slice(colonIndex + 1).trim();
    if (prefix.length > 0 && looksLikeActivatedCostPrefixMinV1(prefix)) {
      costClauses.push(prefix);
    }
    remainder = after;
  }

  for (const clause of splitClausesMinV1(remainder)) {
    if (/^\s*activate only if\b/i.test(clause) || /^\s*cast only if\b/i.test(clause)) {
      legalityClauses.push(clause);
      continue;
    }
    if (/^\s*as an additional cost to cast this spell\b/i.test(clause)) {
      costClauses.push(clause);
      continue;
    }
    if (/\btarget\b/i.test(clause)) {
      targetClauses.push(clause);
    }
    effectClauses.push(clause);
  }

  return {
    cardName: "lowering-hint-source",
    context: colonIndex > -1 ? "ACTIVATE" : "CAST",
    clauses: {
      costClauses,
      targetClauses,
      legalityClauses,
      effectClauses,
    },
  };
}

type CostTargetLegalityHintsBundle = {
  costTargetLegalityMin?: NonNullable<AbilityIrMin["semantic_hints"]>["cost_target_legality_min"];
  legalitySummoningSicknessTapQMin?: SummoningSicknessTapQMin;
};

type TriggeredZoneChangeGuardMinV1 = {
  possibleZoneChange: boolean;
  possibleLkiRequired: boolean;
  possibleCreatureDiesDerivation: boolean;
};

function hasExplicitLkiReferenceMinV1(normalized: string): boolean {
  return (
    normalized.includes("that card") ||
    normalized.includes("the exiled card") ||
    normalized.includes("cards exiled with") ||
    normalized.includes("exiled with")
  );
}

export function detectTriggeredZoneChangeGuardMinV1(
  oracleText: string,
  triggeredAbilityMin: TriggeredAbilityClassificationMinV1 = classifyTriggeredAbilityMinV1(oracleText),
): TriggeredZoneChangeGuardMinV1 {
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

  const isTriggeredZoneChangeOrLinked =
    triggeredAbilityMin.is_triggered &&
    (triggeredAbilityMin.class === "ZONE_CHANGE" || triggeredAbilityMin.fallback === "LINKED");
  const possibleLkiRequired = isTriggeredZoneChangeOrLinked && hasExplicitLkiReferenceMinV1(normalized);

  return {
    possibleZoneChange,
    possibleLkiRequired,
    possibleCreatureDiesDerivation,
  };
}

export function buildCostTargetLegalityHints(
  oracleText: string,
  sourceTypeLine?: string | null,
): CostTargetLegalityHintsBundle {
  const analysisCase = buildCostTargetLegalityCaseMinV1(oracleText);
  const analyzed = analyzeCostTargetLegalityCaseV1(analysisCase);
  const legacy = analyzeCostTargetLegalityMinV1(oracleText, { sourceTypeLine });
  const hasSummoningSicknessTapQ = !!legacy.summoningSicknessTapQMin;
  const costKinds = sortedUnique(analyzed.costs.items.map((item) => item.kind));
  const targetKinds = sortedUnique(analyzed.targets.flatMap((spec) => spec.targetKinds));
  const legalityKinds = sortedUnique([
    ...analyzed.legality.map((gate) => gate.kind),
    ...(hasSummoningSicknessTapQ ? (["SUMMONING_SICKNESS_TAP_Q_RESTRICTION"] as const) : []),
  ]);
  const targetCount = analyzed.targets.length;
  const legalityCount = analyzed.legality.length + (hasSummoningSicknessTapQ ? 1 : 0);

  const shouldEmitCostTargetLegalityMin = !(
    costKinds.length === 0 &&
    targetKinds.length === 0 &&
    legalityKinds.length === 0 &&
    targetCount === 0 &&
    legalityCount === 0
  );

  return {
    costTargetLegalityMin: shouldEmitCostTargetLegalityMin
      ? {
        cost_kinds: costKinds,
        target_kinds: targetKinds,
        legality_kinds: legalityKinds,
        target_count: targetCount,
        legality_count: legalityCount,
      }
      : undefined,
    legalitySummoningSicknessTapQMin: legacy.summoningSicknessTapQMin,
  };
}

function buildSemanticHints(
  oracleText: string,
  sourceTypeLine?: string | null,
  legalityActionBindingMinV1?: LegalityActionBindingMinV1,
  zonePermissionMinV1?: ZonePermissionMinV1,
  legalityActorConstraintMinV1?: LegalityActorConstraintMinV1,
  legalityConditionMinV1?: LegalityConditionMinV1,
  legalityStaticAbilityRestrictionsMinV1?: LegalityStaticAbilityRestrictionMinV1,
  modeSelectionMinV1?: ModeSelectionMinV1,
  loyaltyAbilityMinV1?: LoyaltyAbilityMinV1,
  loyaltySymbolCostMinV1?: LoyaltySymbolCostMinV1,
  manaAbilityMinV1?: ManaAbilityMinV1,
  triggeredManaAbilityMinV1?: TriggeredManaAbilityMinV1,
): AbilityIrMin["semantic_hints"] | undefined {
  const triggeredAbilityMin = classifyTriggeredAbilityMinV1(oracleText);
  const zoneChangeGuardMin = detectTriggeredZoneChangeGuardMinV1(oracleText, triggeredAbilityMin);
  const possibleCreatureDiesDerivation = zoneChangeGuardMin.possibleCreatureDiesDerivation;
  const possibleZoneChange = zoneChangeGuardMin.possibleZoneChange;
  const possibleLkiRequired = zoneChangeGuardMin.possibleLkiRequired;

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

  if (triggeredAbilityMin.is_triggered || triggeredAbilityMin.fallback) {
    hints.triggered_ability_min = triggeredAbilityMin;
  }

  const replacementPreventionMin = classifyReplacementPreventionMinV1(oracleText);
  if (replacementPreventionMin) {
    hints.replacement_prevention_min = replacementPreventionMin;
  }

  const linkedAbilityMin = classifyLinkedAbilityMinV1(oracleText);
  if (linkedAbilityMin) {
    hints.linked_ability_min = linkedAbilityMin;
  }

  const continuousLayersMin = classifyContinuousLayersDependencyTimestampMinV1(oracleText);
  if (continuousLayersMin) {
    hints.continuous_layers_min = continuousLayersMin;
  }

  const costMinV1 = classifyCostMinV1(oracleText);
  if (costMinV1) {
    hints.cost_min_v1 = costMinV1;
  }

  const targetMinV1 = classifyTargetMinV1(oracleText);
  if (targetMinV1) {
    hints.target_min_v1 = targetMinV1;
  }
  if (modeSelectionMinV1) {
    hints.mode_selection_min = modeSelectionMinV1;
  }

  const legalityGateMinV1 = classifyLegalityGateMinV1(oracleText);
  if (legalityGateMinV1) {
    hints.legality_gate_min_v1 = legalityGateMinV1;
  }

  const costTargetLegalityHints = buildCostTargetLegalityHints(oracleText, sourceTypeLine);
  if (costTargetLegalityHints.costTargetLegalityMin) {
    hints.cost_target_legality_min = costTargetLegalityHints.costTargetLegalityMin;
  }
  if (costTargetLegalityHints.legalitySummoningSicknessTapQMin) {
    hints.legality_summoning_sickness_tap_q_min = costTargetLegalityHints.legalitySummoningSicknessTapQMin;
  }

  if (legalityActionBindingMinV1) {
    hints.legality_action_binding_min = legalityActionBindingMinV1;
  }
  if (zonePermissionMinV1) {
    hints.zone_permission_min = zonePermissionMinV1;
  }
  if (legalityActorConstraintMinV1) {
    hints.legality_actor_constraint_min = legalityActorConstraintMinV1;
  }
  if (legalityConditionMinV1) {
    hints.legality_condition_min = legalityConditionMinV1;
  }
  if (legalityStaticAbilityRestrictionsMinV1) {
    hints.legality_static_ability_restrictions_min_v1 = legalityStaticAbilityRestrictionsMinV1;
  }
  if (loyaltyAbilityMinV1) {
    hints.loyalty_ability_min = loyaltyAbilityMinV1;
    hints.loyalty_once_each_turn_restriction_min_v1 = "ONCE_EACH_TURN";
  }
  if (loyaltySymbolCostMinV1) {
    hints.loyalty_symbol_cost_min_v1 = loyaltySymbolCostMinV1;
  }
  if (manaAbilityMinV1) {
    hints.mana_ability_min = manaAbilityMinV1;
  }
  if (triggeredManaAbilityMinV1?.class === "TRIGGERED_MANA_ABILITY") {
    hints.triggered_mana_ability_min = triggeredManaAbilityMinV1;
  }

  if (Object.keys(hints).length === 0) {
    return undefined;
  }

  return hints;
}

function mapLoyaltySymbolCostToTokenMinV1(
  loyaltySymbolCost: LoyaltySymbolCostMinV1,
): LoyaltySymbolCostTokenMinV1 {
  if (loyaltySymbolCost.kind === "POSITIVE") return "LOYALTY_PLUS";
  if (loyaltySymbolCost.kind === "NEGATIVE") return "LOYALTY_MINUS";
  return "LOYALTY_ZERO";
}

export function lowerToAbilityIrMinV1(input: LowerInput): AbilityIrMin | null {
  const template = BASE_ABILITY_TEMPLATES[input.name];
  if (!template) return null;

  const ir = parseSemanticIrV0({
    name: input.name,
    oracle_text: input.oracle_text,
    type_line: input.type_line ?? null,
  });
  const parsedSemanticHints = (Reflect.get(ir, "semantic_hints") as
    | {
      legality_action_binding_min?: LegalityActionBindingMinV1;
      zone_permission_min?: ZonePermissionMinV1;
      legality_actor_constraint_min?: LegalityActorConstraintMinV1;
      legality_condition_min?: LegalityConditionMinV1;
      legality_static_ability_restrictions_min_v1?: LegalityStaticAbilityRestrictionMinV1;
      mode_selection_min?: ModeSelectionMinV1;
      loyalty_ability_min?: LoyaltyAbilityMinV1;
      loyalty_once_each_turn_restriction_min_v1?: LoyaltyOnceEachTurnRestrictionMinV1;
      loyalty_symbol_cost_min_v1?: LoyaltySymbolCostMinV1;
      mana_ability_min?: ManaAbilityMinV1;
      triggered_mana_ability_min?: TriggeredManaAbilityMinV1;
    }
    | undefined);
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

  const legalityActionBindingMinV1 = parsedSemanticHints?.legality_action_binding_min;
  const zonePermissionMinV1 = parsedSemanticHints?.zone_permission_min;
  const legalityActorConstraintMinV1 = parsedSemanticHints?.legality_actor_constraint_min;
  const legalityConditionMinV1 = parsedSemanticHints?.legality_condition_min;
  const legalityStaticAbilityRestrictionsMinV1 = parsedSemanticHints?.legality_static_ability_restrictions_min_v1;
  const modeSelectionMinV1 = parsedSemanticHints?.mode_selection_min;
  const loyaltyAbilityMinV1 = parsedSemanticHints?.loyalty_ability_min;
  const loyaltySymbolCostMinV1 = parsedSemanticHints?.loyalty_symbol_cost_min_v1;
  const manaAbilityMinV1 = parsedSemanticHints?.mana_ability_min;
  const triggeredManaAbilityMinV1 = parsedSemanticHints?.triggered_mana_ability_min;
  const semanticHints = buildSemanticHints(
    input.oracle_text,
    input.type_line ?? null,
    legalityActionBindingMinV1,
    zonePermissionMinV1,
    legalityActorConstraintMinV1,
    legalityConditionMinV1,
    legalityStaticAbilityRestrictionsMinV1,
    modeSelectionMinV1,
    loyaltyAbilityMinV1,
    loyaltySymbolCostMinV1,
    manaAbilityMinV1,
    triggeredManaAbilityMinV1,
  );
  let ability: AbilityIrMin = lowered;

  if (semanticHints) {
    ability = {
      ...ability,
      semantic_hints: semanticHints,
    };
  }

  if (semanticHints?.legality_action_binding_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        action_context: semanticHints.legality_action_binding_min,
      },
    };
  }

  if (semanticHints?.zone_permission_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        zone_permission_min: semanticHints.zone_permission_min,
      },
    };
  }

  if (semanticHints?.legality_actor_constraint_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        actor_constraint_min: semanticHints.legality_actor_constraint_min,
      },
    };
  }

  if (semanticHints?.legality_condition_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        condition_min: semanticHints.legality_condition_min,
      },
    };
  }

  if (semanticHints?.legality_static_ability_restrictions_min_v1) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        static_ability_restrictions_min_v1: semanticHints.legality_static_ability_restrictions_min_v1,
      },
    };
  }

  if (semanticHints?.mana_ability_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        mana_ability_min: semanticHints.mana_ability_min,
      },
    };
  }

  if (semanticHints?.loyalty_ability_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        loyalty_ability_min: semanticHints.loyalty_ability_min,
      },
    };
  }

  if (semanticHints?.loyalty_symbol_cost_min_v1 && ability.kind === "Activated") {
    ability = {
      ...ability,
      cost: [mapLoyaltySymbolCostToTokenMinV1(semanticHints.loyalty_symbol_cost_min_v1)],
    };
  }

  if (semanticHints?.loyalty_ability_min && ability.kind === "Activated") {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        kind: "ACTIVATE_ONLY_AS_SORCERY",
      },
    };
  }

  if (semanticHints?.loyalty_once_each_turn_restriction_min_v1 && ability.kind === "Activated") {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        loyalty_once_each_turn_restriction_min_v1: semanticHints.loyalty_once_each_turn_restriction_min_v1,
      },
    };
  }

  if (semanticHints?.triggered_mana_ability_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        triggered_mana_ability_min: semanticHints.triggered_mana_ability_min,
      },
    };
  }

  if (semanticHints?.legality_summoning_sickness_tap_q_min) {
    ability = {
      ...ability,
      legality: {
        ...(ability.legality ?? {}),
        summoning_sickness_tap_q_min: semanticHints.legality_summoning_sickness_tap_q_min,
      },
    };
  }

  return ability;
}
