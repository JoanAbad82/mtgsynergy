import { ActionId, CostId, EventId, FrameKind, GateId, ResourceId, TokenKindId } from "../contract";
import type { SemanticCardIR } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  x: 1,
};

function parseCount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (WORD_NUMBERS[trimmed] !== undefined) return WORD_NUMBERS[trimmed];
  const num = Number.parseInt(trimmed, 10);
  return Number.isFinite(num) ? num : undefined;
}

function addUnique<T>(arr: T[], item: T, eq: (a: T, b: T) => boolean): void {
  if (!arr.some((existing) => eq(existing, item))) arr.push(item);
}

function normalizeIds<T>(arr: T[], getKey: (item: T) => number, tie?: (a: T, b: T) => number): void {
  arr.sort((a, b) => {
    const ka = getKey(a);
    const kb = getKey(b);
    if (ka !== kb) return ka - kb;
    return tie ? tie(a, b) : 0;
  });
}

function tokenKindFromText(text: string): TokenKindId | null {
  const lower = text.toLowerCase();
  if (lower.includes("treasure")) return TokenKindId.TREASURE;
  if (lower.includes("food")) return TokenKindId.FOOD;
  if (lower.includes("blood")) return TokenKindId.BLOOD;
  if (lower.includes("clue")) return TokenKindId.CLUE;
  if (lower.includes("soldier")) return TokenKindId.SOLDIER;
  if (lower.includes("zombie")) return TokenKindId.ZOMBIE;
  if (/\bcreature\b/.test(lower)) return TokenKindId.UNKNOWN_TOKEN;
  return null;
}

function tokenResourceFromKind(kind: TokenKindId): ResourceId {
  switch (kind) {
    case TokenKindId.TREASURE:
      return ResourceId.TOKEN_TREASURE;
    case TokenKindId.FOOD:
      return ResourceId.TOKEN_FOOD;
    case TokenKindId.BLOOD:
      return ResourceId.TOKEN_BLOOD;
    case TokenKindId.CLUE:
      return ResourceId.TOKEN_CLUE;
    default:
      return ResourceId.TOKEN_GENERIC;
  }
}

export type TriggeredAbilityClassMinV1 = "NONE" | "NORMAL" | "INTERVENING_IF" | "ZONE_CHANGE" | "DELAYED" | "REFLEXIVE";
export type TriggeredAbilityFallbackMinV1 = "LINKED";
export type TriggeredAbilityClassificationMinV1 = {
  is_triggered: boolean;
  class: TriggeredAbilityClassMinV1;
  fallback: TriggeredAbilityFallbackMinV1 | null;
};
export type CostMinClassV1 = "MANA" | "TAP" | "SACRIFICE" | "DISCARD" | "PAY_LIFE";
export type CostMinClassificationMinV1 = {
  classes: CostMinClassV1[];
};
export type TargetZoneHintMinV1 = "battlefield" | "graveyard" | "stack";
export type TargetControllerConstraintMinV1 = "any" | "you" | "opponent";
export type TargetMinSpecMinV1 = {
  required: boolean;
  minTargets: number;
  maxTargets: number;
  targetKinds: string[];
  zoneHint: TargetZoneHintMinV1 | null;
  controllerConstraint: TargetControllerConstraintMinV1 | null;
  sourceSpan: string;
};
export type LegalityGateMinTypeV1 =
  | "ACTIVATE_ONLY_IF"
  | "ACTIVATE_ONLY_AS_SORCERY"
  | "ACTIVATE_ONLY_AS_INSTANT"
  | "ACTIVATE_ONLY_DURING_YOUR_TURN"
  | "ACTIVATE_ONLY_ONCE_EACH_TURN"
  | "CAST_ONLY_IF"
  | "OTHER";
export type LegalityGateMinTimingV1 = "SORCERY_SPEED" | "INSTANT_SPEED";
export type LegalityGateMinV1 = {
  type: LegalityGateMinTypeV1;
  condition?: string;
  timing?: LegalityGateMinTimingV1;
};
export type ZonePermissionMinTypeV1 = "ALLOW_FROM_ZONE" | "ONLY_FROM_ZONE";
export type ZonePermissionMinZoneV1 = "GRAVEYARD" | "EXILE";
export type ZonePermissionMinV1 = {
  type: ZonePermissionMinTypeV1;
  zone: ZonePermissionMinZoneV1;
};
export type LegalityActorConstraintMinV1 = "ANY_PLAYER" | "YOU_ONLY" | "OPPONENT_ONLY" | "OWNER_ONLY";
export type LegalityConditionAppliesToMinV1 = "ACTIVATE" | "CAST";
export type LegalityConditionClassMinV1 =
  | "CONTROLS_X"
  | "OPPONENT_STATE"
  | "ATTACKED_THIS_TURN"
  | "OTHER_LEGALITY_TEXT";
export type LegalityConditionMinV1 = {
  appliesTo: LegalityConditionAppliesToMinV1;
  hasCondition: true;
  conditionTextNormalized: string;
  conditionClass: LegalityConditionClassMinV1;
};
export type LegalityStaticAbilityRestrictionClassMinV1 =
  | "ONLY_DURING_YOUR_TURN"
  | "ONLY_ONCE_EACH_TURN"
  | "OTHER_STATIC_ABILITY_RESTRICTION_TEXT";
export type LegalityStaticAbilityRestrictionMinV1 = {
  hasRestriction: true;
  restrictionClass: LegalityStaticAbilityRestrictionClassMinV1;
  sourceSpan: string;
};
export type ManaAbilityMinClassV1 = "MANA_ABILITY" | "NON_MANA_ABILITY";
export type ManaAbilityMinReasonV1 =
  | "NO_TARGET"
  | "ADDS_MANA"
  | "NOT_LOYALTY"
  | "HAS_TARGET"
  | "IS_LOYALTY"
  | "NO_EXPLICIT_MANA_ADD";
export type ManaAbilityMinV1 = {
  class: ManaAbilityMinClassV1;
  reasons: ManaAbilityMinReasonV1[];
};
export type TriggeredManaAbilityMinClassV1 = "NONE" | "TRIGGERED_MANA_ABILITY";
export type TriggeredManaAbilityMinReasonV1 =
  | "IS_TRIGGERED"
  | "NO_TARGET"
  | "ADDS_MANA"
  | "MANA_RELATED_TRIGGER"
  | "HAS_TARGET"
  | "IS_LOYALTY"
  | "NO_EXPLICIT_MANA_ADD"
  | "NON_MANA_TRIGGER_CONTEXT";
export type TriggeredManaAbilityMinV1 = {
  class: TriggeredManaAbilityMinClassV1;
  reasons: TriggeredManaAbilityMinReasonV1[];
};
export type ReplacementPreventionClassMinV1 = "REPLACEMENT" | "PREVENTION";
export type LinkedAbilityClassMinV1 = "LINKED";
export type ContinuousLayersClassMinV1 = "TYPE_CHANGE" | "COLOR_CHANGE" | "ABILITY_CHANGE" | "PT_CHANGE" | "MULTI_LAYER";
export type ContinuousLayersOrderingRiskMinV1 = "NONE" | "TIMESTAMP_OR_DEPENDENCY";
export type ContinuousLayersDependencyTimestampMinV1 = {
  class: ContinuousLayersClassMinV1;
  ordering_risk: ContinuousLayersOrderingRiskMinV1;
};

function hasTriggeredAbilityPrefix(text: string): boolean {
  return (
    /(?:^|[.;]\s*)(?:when|whenever)\b/i.test(text) ||
    /(?:^|[.;]\s*)at\s+[^.]*,\s*/i.test(text)
  );
}

function hasInterveningIfPattern(text: string): boolean {
  return /\b(?:when|whenever|at)\b[^.]*,\s*if\b/i.test(text);
}

function hasZoneChangePattern(text: string): boolean {
  return (
    /\bdies\b/i.test(text) ||
    /\bleaves?\s+the\s+battlefield\b/i.test(text) ||
    /\benters?\s+the\s+battlefield\b/i.test(text) ||
    /\bis\s+put\s+into\s+a\s+graveyard\b/i.test(text)
  );
}

function hasReflexivePattern(text: string): boolean {
  return /\bwhen\s+you\s+do\b/i.test(text) || /\bwhen\b[^.]*\bthis way\b/i.test(text);
}

function hasDelayedPattern(text: string): boolean {
  return /\bat the beginning of the next (?:end step|upkeep|cleanup step)\b/i.test(text);
}

function hasLinkedPattern(text: string): boolean {
  return /\bexiled with\b/i.test(text) || /\bthe exiled card\b/i.test(text) || /\bcards exiled with\b/i.test(text);
}

function hasLinkedAbilityMinPattern(text: string): boolean {
  return (
    hasLinkedPattern(text) ||
    /\bexile\b[^.]*\buntil\b[^.]*\bleaves?\s+the\s+battlefield\b/i.test(text) ||
    /\bfor\s+as\s+long\s+as\s+that\s+card\s+remains\s+exiled\b/i.test(text)
  );
}

function hasReplacementPattern(text: string): boolean {
  return (
    /\bif\b[^.]*\bwould\b[^.]*\binstead\b/i.test(text) ||
    /\bwould\b[^.]*\binstead\b/i.test(text) ||
    /\benters?\b[^.]*\binstead\b/i.test(text) ||
    /\bexile\b[^.]*\binstead\b/i.test(text) ||
    /\bput\b[^.]*\binstead\b/i.test(text)
  );
}

function hasPreventionPattern(text: string): boolean {
  return (
    /\bprevent\s+all\s+combat\s+damage\b/i.test(text) ||
    /\bprevent\s+all\s+damage\b/i.test(text) ||
    /\bprevent\s+the\s+next\b/i.test(text) ||
    (/\bdamage\s+that\s+would\s+be\s+dealt\b/i.test(text) && /\bprevent\b/i.test(text))
  );
}

function hasTypeChangeContinuousPattern(text: string): boolean {
  return (
    /\bnonbasic lands are mountains\b/i.test(text) ||
    /\beach land is a swamp in addition to its other land types\b/i.test(text)
  );
}

function hasPtChangeContinuousPattern(text: string): boolean {
  return /\bcreatures?\s+you\s+control\s+get\s*[+-]?\d+\/[+-]?\d+\b/i.test(text);
}

function hasAbilityChangeContinuousPattern(text: string): boolean {
  return /\blose all abilities\b/i.test(text);
}

function hasMultiLayerContinuousPattern(text: string): boolean {
  return hasAbilityChangeContinuousPattern(text) && /\bhave base power and toughness\b/i.test(text);
}

const COST_MIN_ORDER: ReadonlyArray<CostMinClassV1> = ["MANA", "TAP", "SACRIFICE", "DISCARD", "PAY_LIFE"];
const TARGET_MIN_PATTERNS: ReadonlyArray<{ regex: RegExp; kinds: string[] }> = [
  { regex: /\btarget\s+artifact,\s*creature,\s*or\s*land\b/i, kinds: ["artifact", "creature", "land"] },
  { regex: /\btarget\s+creature\b/i, kinds: ["creature"] },
  { regex: /\btarget\s+artifact\b/i, kinds: ["artifact"] },
  { regex: /\btarget\s+land\b/i, kinds: ["land"] },
];
type LegalityActionBindingMinV1 = "CAST_ONLY" | "ACTIVATE_ONLY";

function detectLegalityActionBindingMinV1(
  text: string,
  kind: FrameKind,
): LegalityActionBindingMinV1 | null {
  const normalized = normalizeOracleTextV1(text ?? "");
  if (!normalized) return null;

  if (/\bcast this spell only\b/i.test(normalized)) return "CAST_ONLY";
  if (/\bcast only if\b/i.test(normalized)) return "CAST_ONLY";
  if (/\byou may cast this spell only\b/i.test(normalized)) return "CAST_ONLY";
  if (kind !== FrameKind.ACTIVATED) return null;

  if (/\bactivate only if\b/i.test(normalized)) return "ACTIVATE_ONLY";
  if (/\bactivate only as a sorcery\b/i.test(normalized)) return "ACTIVATE_ONLY";
  if (/\bactivate only during your turn\b/i.test(normalized)) return "ACTIVATE_ONLY";
  if (/\bactivate only once each turn\b/i.test(normalized)) return "ACTIVATE_ONLY";

  return null;
}

function classifyZonePermissionMinV1(oracleText: string): ZonePermissionMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;
  if (!/\bcast\b/i.test(text) || !/\bfrom\b/i.test(text)) return null;

  if (/\byou may cast this card from your graveyard\b/i.test(text)) {
    return { type: "ALLOW_FROM_ZONE", zone: "GRAVEYARD" };
  }
  if (/\byou may cast this card from exile\b/i.test(text)) {
    return { type: "ALLOW_FROM_ZONE", zone: "EXILE" };
  }
  if (/\bcast this card only from your graveyard\b/i.test(text)) {
    return { type: "ONLY_FROM_ZONE", zone: "GRAVEYARD" };
  }

  return null;
}

function classifyLegalityActorConstraintMinV1(oracleText: string): LegalityActorConstraintMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;

  if (/\bany player may activate\b/i.test(text)) return "ANY_PLAYER";
  if (/\bonly an opponent may activate\b/i.test(text)) return "OPPONENT_ONLY";
  if (/\bits owner may cast\b/i.test(text)) return "OWNER_ONLY";
  if (/\byou may cast\b/i.test(text)) return "YOU_ONLY";

  return null;
}

function classifyLegalityConditionClassMinV1(conditionTextNormalized: string): LegalityConditionClassMinV1 {
  if (conditionTextNormalized.includes("you control")) return "CONTROLS_X";
  if (conditionTextNormalized.includes("attacked this turn")) return "ATTACKED_THIS_TURN";
  if (conditionTextNormalized.includes("opponent")) return "OPPONENT_STATE";
  return "OTHER_LEGALITY_TEXT";
}

function classifyLegalityConditionMinV1(oracleText: string): LegalityConditionMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;

  const clauses = text
    .split(".")
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);

  for (const clause of clauses) {
    const activateMatch = /^activate only if (.+)$/i.exec(clause);
    if (activateMatch) {
      const conditionTextNormalized = activateMatch[1].trim().toLowerCase();
      return {
        appliesTo: "ACTIVATE",
        hasCondition: true,
        conditionTextNormalized,
        conditionClass: classifyLegalityConditionClassMinV1(conditionTextNormalized),
      };
    }

    const castMatch = /^cast(?: this spell)? only if (.+)$/i.exec(clause);
    if (castMatch) {
      const conditionTextNormalized = castMatch[1].trim().toLowerCase();
      return {
        appliesTo: "CAST",
        hasCondition: true,
        conditionTextNormalized,
        conditionClass: classifyLegalityConditionClassMinV1(conditionTextNormalized),
      };
    }
  }

  return null;
}

function classifyLegalityStaticAbilityRestrictionsMinV1(
  oracleText: string,
): LegalityStaticAbilityRestrictionMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;

  const onlyDuringYourTurnMatch = /\bactivate only during your turn\b/i.exec(text);
  if (onlyDuringYourTurnMatch) {
    return {
      hasRestriction: true,
      restrictionClass: "ONLY_DURING_YOUR_TURN",
      sourceSpan: onlyDuringYourTurnMatch[0].trim(),
    };
  }

  const onlyOnceEachTurnMatch = /\bactivate only once each turn\b/i.exec(text);
  if (onlyOnceEachTurnMatch) {
    return {
      hasRestriction: true,
      restrictionClass: "ONLY_ONCE_EACH_TURN",
      sourceSpan: onlyOnceEachTurnMatch[0].trim(),
    };
  }

  if (
    /\bactivate only as a sorcery\b/i.test(text) ||
    /\bactivate only as an instant\b/i.test(text) ||
    /\bactivate only if\b/i.test(text)
  ) {
    return null;
  }

  const otherRestrictiveActivateOnlyMatch = /\bactivate only\b[^.]*/i.exec(text);
  if (otherRestrictiveActivateOnlyMatch) {
    return {
      hasRestriction: true,
      restrictionClass: "OTHER_STATIC_ABILITY_RESTRICTION_TEXT",
      sourceSpan: otherRestrictiveActivateOnlyMatch[0].trim(),
    };
  }

  return null;
}

function getActivatedCostPrefix(text: string): string | null {
  const colonIndex = text.indexOf(":");
  if (colonIndex <= 0) return null;

  const prefix = text.slice(0, colonIndex).trim();
  if (!prefix) return null;

  if (/^\s*(?:when|whenever|at)\b/i.test(prefix)) {
    return null;
  }

  return prefix;
}

function classifyManaAbilityMinV1(oracleText: string): ManaAbilityMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;

  const costPrefix = getActivatedCostPrefix(text);
  if (!costPrefix) return null;

  const colonIndex = text.indexOf(":");
  if (colonIndex < 0) return null;
  const effectText = text.slice(colonIndex + 1).trim();

  const hasTarget = /\btarget\b/i.test(text);
  const addsMana = /^\s*add\b/i.test(effectText);
  const compactCostPrefix = costPrefix.replace(/\s+/g, "");
  const isLoyalty = /^[+-]\d+$/.test(compactCostPrefix);

  const reasons: ManaAbilityMinReasonV1[] = [];
  reasons.push(hasTarget ? "HAS_TARGET" : "NO_TARGET");
  reasons.push(addsMana ? "ADDS_MANA" : "NO_EXPLICIT_MANA_ADD");
  reasons.push(isLoyalty ? "IS_LOYALTY" : "NOT_LOYALTY");

  return {
    class: !hasTarget && addsMana && !isLoyalty ? "MANA_ABILITY" : "NON_MANA_ABILITY",
    reasons,
  };
}

function hasExplicitManaAddTextV1(text: string): boolean {
  return /\badds?\b[^.]*\bmana\b/i.test(text) || /\badds?\b[^.]*\{[wubrgcxyz0-9/]+\}/i.test(text);
}

function hasManaRelatedTriggerContextV1(text: string): boolean {
  return (
    /\b(?:when|whenever)\b[^.]*\bactivat(?:e|es|ed)\b[^.]*\b(?:an?\s+)?mana ability\b/i.test(text) ||
    /\b(?:when|whenever)\b[^.]*\b(?:an?\s+)?activated mana ability\b[^.]*\bresolve(?:s|d)\b/i.test(text) ||
    /\b(?:when|whenever)\b[^.]*\bresolve(?:s|d)\b[^.]*\b(?:an?\s+)?activated mana ability\b/i.test(text) ||
    /\b(?:when|whenever)\b[^.]*\bmana is added\b/i.test(text) ||
    /\b(?:when|whenever)\b[^.]*\btaps?\b[^.]*\bfor mana\b/i.test(text) ||
    /\b(?:when|whenever)\b[^.]*\bis tapped for mana\b/i.test(text)
  );
}

export function classifyTriggeredManaAbilityMinV1(oracleText: string): TriggeredManaAbilityMinV1 {
  const text = normalizeOracleTextV1(oracleText ?? "");
  const costPrefix = getActivatedCostPrefix(text);
  const compactCostPrefix = (costPrefix ?? "").replace(/\s+/g, "");

  const isTriggered = hasTriggeredAbilityPrefix(text);
  const hasTarget = /\btarget\b/i.test(text);
  const addsMana = hasExplicitManaAddTextV1(text);
  const isLoyalty = /^[+-]\d+$/.test(compactCostPrefix);
  const hasManaRelatedTrigger = hasManaRelatedTriggerContextV1(text);

  const reasons: TriggeredManaAbilityMinReasonV1[] = [];
  if (isTriggered) reasons.push("IS_TRIGGERED");
  reasons.push(hasTarget ? "HAS_TARGET" : "NO_TARGET");
  reasons.push(addsMana ? "ADDS_MANA" : "NO_EXPLICIT_MANA_ADD");
  reasons.push(hasManaRelatedTrigger ? "MANA_RELATED_TRIGGER" : "NON_MANA_TRIGGER_CONTEXT");
  if (isLoyalty) reasons.push("IS_LOYALTY");

  const isTriggeredManaAbility =
    isTriggered && !hasTarget && addsMana && !isLoyalty && hasManaRelatedTrigger;

  return {
    class: isTriggeredManaAbility ? "TRIGGERED_MANA_ABILITY" : "NONE",
    reasons,
  };
}

function sortedCostClasses(classes: CostMinClassV1[]): CostMinClassV1[] {
  const unique = Array.from(new Set(classes));
  return unique.sort((a, b) => COST_MIN_ORDER.indexOf(a) - COST_MIN_ORDER.indexOf(b));
}

export function classifyCostMinV1(oracleText: string): CostMinClassificationMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;

  const costPrefix = getActivatedCostPrefix(text);
  if (!costPrefix) return null;

  const symbolMatches = costPrefix.match(/\{[^}]+\}/g) ?? [];
  const hasTap = symbolMatches.some((symbol) => /^\{T\}$/i.test(symbol));
  const hasMana = symbolMatches.some((symbol) => !/^\{T\}$/i.test(symbol) && !/^\{Q\}$/i.test(symbol));
  const hasSacrifice = /\bsacrifice\b/i.test(costPrefix);
  const hasDiscard = /\bdiscard\b/i.test(costPrefix);
  const hasPayLife = /\bpay\s+(?:x|\d+|a|an|one|two|three|four)\s+life\b/i.test(costPrefix);

  const classes: CostMinClassV1[] = [];
  if (hasMana) classes.push("MANA");
  if (hasTap) classes.push("TAP");
  if (hasSacrifice) classes.push("SACRIFICE");
  if (hasDiscard) classes.push("DISCARD");
  if (hasPayLife) classes.push("PAY_LIFE");

  if (classes.length === 0) return null;
  return { classes: sortedCostClasses(classes) };
}

export function classifyTargetMinV1(oracleText: string): TargetMinSpecMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text || !/\btarget\b/i.test(text)) return null;

  for (const pattern of TARGET_MIN_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (!match) continue;

    return {
      required: true,
      minTargets: 1,
      maxTargets: 1,
      targetKinds: pattern.kinds,
      zoneHint: "battlefield",
      controllerConstraint: null,
      sourceSpan: match[0],
    };
  }

  return null;
}

export function classifyLegalityGateMinV1(oracleText: string): LegalityGateMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;

  if (/\bactivate only once each turn\b/i.test(text)) {
    return {
      type: "ACTIVATE_ONLY_ONCE_EACH_TURN",
      condition: "once each turn",
    };
  }

  if (/\bactivate only during your turn\b/i.test(text)) {
    return {
      type: "ACTIVATE_ONLY_DURING_YOUR_TURN",
      condition: "during your turn",
    };
  }

  if (/\bactivate only as an instant\b/i.test(text)) {
    return {
      type: "ACTIVATE_ONLY_AS_INSTANT",
      timing: "INSTANT_SPEED",
    };
  }

  if (/\bactivate only as a sorcery\b/i.test(text)) {
    return {
      type: "ACTIVATE_ONLY_AS_SORCERY",
      timing: "SORCERY_SPEED",
    };
  }

  const activateOnlyIfMatch = /\bactivate only if\s+([^.;]+)/i.exec(text);
  if (activateOnlyIfMatch) {
    return {
      type: "ACTIVATE_ONLY_IF",
      condition: activateOnlyIfMatch[1].trim(),
    };
  }

  const castOnlyIfMatch = /\bcast only if\s+([^.;]+)/i.exec(text);
  if (castOnlyIfMatch) {
    return {
      type: "CAST_ONLY_IF",
      condition: castOnlyIfMatch[1].trim(),
    };
  }

  const otherLegalityMatch = /\b(?:activate|cast)\s+only\b[^.]*/i.exec(text);
  if (otherLegalityMatch) {
    return {
      type: "OTHER",
      condition: otherLegalityMatch[0].trim(),
    };
  }

  return null;
}

export function classifyContinuousLayersDependencyTimestampMinV1(
  oracleText: string,
): ContinuousLayersDependencyTimestampMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;

  if (hasMultiLayerContinuousPattern(text)) {
    return { class: "MULTI_LAYER", ordering_risk: "TIMESTAMP_OR_DEPENDENCY" };
  }
  if (hasTypeChangeContinuousPattern(text)) {
    return { class: "TYPE_CHANGE", ordering_risk: "TIMESTAMP_OR_DEPENDENCY" };
  }
  if (hasPtChangeContinuousPattern(text)) {
    return { class: "PT_CHANGE", ordering_risk: "NONE" };
  }
  if (hasAbilityChangeContinuousPattern(text)) {
    return { class: "ABILITY_CHANGE", ordering_risk: "TIMESTAMP_OR_DEPENDENCY" };
  }

  return null;
}

export function classifyReplacementPreventionMinV1(oracleText: string): ReplacementPreventionClassMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;
  if (hasPreventionPattern(text)) return "PREVENTION";
  if (hasReplacementPattern(text)) return "REPLACEMENT";
  return null;
}

export function classifyLinkedAbilityMinV1(oracleText: string): LinkedAbilityClassMinV1 | null {
  const text = normalizeOracleTextV1(oracleText ?? "");
  if (!text) return null;
  if (hasLinkedAbilityMinPattern(text)) return "LINKED";
  return null;
}

export function classifyTriggeredAbilityMinV1(oracleText: string): TriggeredAbilityClassificationMinV1 {
  const text = normalizeOracleTextV1(oracleText ?? "");
  const isDelayed = hasDelayedPattern(text);
  const isTriggered = hasTriggeredAbilityPrefix(text) || isDelayed;
  if (!isTriggered) {
    return { is_triggered: false, class: "NONE", fallback: null };
  }

  if (hasReflexivePattern(text)) {
    return { is_triggered: true, class: "REFLEXIVE", fallback: null };
  }
  if (hasLinkedPattern(text)) {
    return { is_triggered: true, class: "NONE", fallback: "LINKED" };
  }
  if (isDelayed) {
    return { is_triggered: true, class: "DELAYED", fallback: null };
  }
  if (hasInterveningIfPattern(text)) {
    return { is_triggered: true, class: "INTERVENING_IF", fallback: null };
  }
  if (hasZoneChangePattern(text)) {
    return { is_triggered: true, class: "ZONE_CHANGE", fallback: null };
  }
  return { is_triggered: true, class: "NORMAL", fallback: null };
}

export function parseSemanticIrV0(input: {
  name: string;
  oracle_text: string;
  type_line?: string | null;
}): SemanticCardIR {
  const text = normalizeOracleTextV1(input.oracle_text ?? "");
  const lower = text.toLowerCase();
  const typeLine = (input.type_line ?? "").toLowerCase();

  let kind: FrameKind = FrameKind.STATIC;

  const isTriggered = /\b(when|whenever|at the beginning)\b/i.test(text);
  const isActivated = /:/.test(text);
  const isInstantSorcery = /\binstant\b|\bsorcery\b/i.test(typeLine);
  const isAdditionalCostSpell = /^\s*as an additional cost to cast\b/i.test(text);
  const startsWithSpellVerb =
    /^\s*(destroy|exile|counter|draw|discard|create|deal|gain control)\b/i.test(text);
  const hasStaticGuard = /this ability|this creature|this permanent/i.test(text);

  if (isTriggered) {
    kind = FrameKind.TRIGGERED;
  } else if (isActivated) {
    kind = FrameKind.ACTIVATED;
  } else if (isInstantSorcery) {
    kind = FrameKind.SPELL;
  } else if (isAdditionalCostSpell) {
    kind = FrameKind.SPELL;
  } else if (startsWithSpellVerb && !hasStaticGuard) {
    kind = FrameKind.SPELL;
  } else {
    kind = FrameKind.STATIC;
  }

  const watch: Array<{ id: EventId; args?: ReadonlyArray<number> }> = [];
  const addWatch = (id: EventId) => {
    if (!watch.some((entry) => entry.id === id)) {
      watch.push({ id });
    }
  };
  if (kind === FrameKind.TRIGGERED) {
    if (/\benters(?: the battlefield)?\b/i.test(text)) {
      addWatch(EventId.ENTERS_BATTLEFIELD);
    }
    if (/\bleaves(?: the battlefield)?\b/i.test(text)) {
      addWatch(EventId.LEAVES_BATTLEFIELD);
    }
    if (/\b(when|whenever|at the beginning)[^.]*\bgain\s+life\b/i.test(text)) {
      addWatch(EventId.LIFE_GAIN);
    }
    if (/\b(when|whenever|at the beginning)[^.]*\bsacrifice\w*\b/i.test(text)) {
      addWatch(EventId.SACRIFICE);
    }
    if (/\b(when|whenever|at the beginning)[^.]*\bdies\b/i.test(text)) {
      addWatch(EventId.CREATURE_DIES);
    }
    if (
      /\b(when|whenever)[^.]*\b(one or more\s+)?creatures?\s+enter(?:s)?\s+the battlefield\b[^.]*\bunder your control\b/i.test(
        text,
      )
    ) {
      addWatch(EventId.ENTERS_BATTLEFIELD);
    }
    if (
      /\b(when|whenever)[^.]*\byou\s+create\b[^.]*\btoken\b/i.test(text)
    ) {
      addWatch(EventId.TOKEN_CREATED);
    }
    if (
      /\b(when|whenever)[^.]*\b(one or more\s+)?tokens?\s+enter(?:s)?\s+the battlefield\b[^.]*\bunder your control\b/i.test(
        text,
      )
    ) {
      addWatch(EventId.TOKEN_CREATED);
    }
    if (/\b(when|whenever)[^.]*\bcast\b[^.]*\binstant\b[^.]*\bsorcery\b/i.test(text)) {
      addWatch(EventId.CAST_SPELL);
    }
    if (/\b(when|whenever)[^.]*\bdraw\b[^.]*\bsecond card\b[^.]*each turn\b/i.test(text)) {
      addWatch(EventId.DRAW_EXTRA_CARD_TURN);
    }
  }

  const cost: Array<{ cost: CostId; res?: ResourceId; n?: number; x?: boolean }> = [];
  const additionalCostMatch = /as an additional cost to cast[^.]*sacrifice[^.]*/i.test(text);
  if (additionalCostMatch) {
    cost.push({ cost: CostId.SACRIFICE_AS_COST, res: ResourceId.UNKNOWN_RESOURCE, n: 1 });
  }
  const additionalDiscardMatch = /as an additional cost to cast[^.]*discard[^.]*/i.test(text);
  if (additionalDiscardMatch) {
    cost.push({ cost: CostId.DISCARD_AS_COST, res: ResourceId.CARD, n: 1 });
  }
  const activatedCostMatch = /sacrifice[^:]*:/i.exec(text);
  if (activatedCostMatch) {
    const tokenKind = tokenKindFromText(activatedCostMatch[0]);
    const res = tokenKind ? tokenResourceFromKind(tokenKind) : ResourceId.UNKNOWN_RESOURCE;
    cost.push({ cost: CostId.SACRIFICE_AS_COST, res, n: 1 });
  }

  const doList: Array<{
    action: ActionId;
    args?: ReadonlyArray<number>;
    tokenData?: { kind: TokenKindId; n?: number };
  }> = [];
  const gates: Array<{ id: GateId }> = [];
  const touch: Array<{ id: ResourceId }> = [];

  const drawMatch = /draws?\s+(a|an|one|two|three|four|\d+)\s+cards?/i.exec(text);
  if (drawMatch) {
    const n = parseCount(drawMatch[1]) ?? 1;
    doList.push({ action: ActionId.DRAW_CARDS, args: [n] });
    addUnique(touch, { id: ResourceId.CARD }, (a, b) => a.id === b.id);
  }

  const howlingMineMatch =
    /^at the beginning of each player's draw step, if (?:howling mine|this artifact) is untapped, that player draws an additional card\.?$/i.test(
      text,
    );
  if (howlingMineMatch) {
    // Template v1: Howling Mine exact wording.
    doList.push({ action: ActionId.DRAW_CARDS, args: [1] });
    addUnique(touch, { id: ResourceId.CARD }, (a, b) => a.id === b.id);
  }

  const addGreenManaMatch = /\{t\}:\s*add\s+\{g\}/i.test(text);
  if (addGreenManaMatch) {
    // Template v1: add green mana from tap (e.g., "{T}: Add {G}.")
    doList.push({ action: ActionId.PRODUCE_MANA });
  }

  const addColorlessTwoManaMatch = /(?:^|\s)\{t\}:\s*add\s+\{c\}\{c\}(?:\.|$)/i.test(text);
  if (addColorlessTwoManaMatch) {
    // Template v1: add two colorless mana (e.g., "Worn Powerstone")
    doList.push({ action: ActionId.PRODUCE_MANA });
  }

  const addAnyColorManaMatch = /\{t\}:\s*add\s+one\s+mana\s+of\s+any\s+color/i.test(text);
  if (addAnyColorManaMatch) {
    // Template v1: add one mana of any color (e.g., "Darksteel Ingot")
    doList.push({ action: ActionId.PRODUCE_MANA });
  }

  const addThreeAnyOneColorManaMatch =
    /\{t\}:\s*add\s+three\s+mana\s+of\s+any\s+one\s+color/i.test(text);
  if (addThreeAnyOneColorManaMatch) {
    // Template v1: add three mana of any one color (e.g., "Gilded Lotus")
    doList.push({ action: ActionId.PRODUCE_MANA });
  }

  const scryMatch = /scry\s+(a|an|one|two|three|four|\d+)/i.exec(text);
  if (scryMatch) {
    const n = parseCount(scryMatch[1]) ?? 1;
    doList.push({ action: ActionId.SCRY, args: [n] });
  }

  const discardMatch =
    /discard\w*\s+(a|an|one|two|three|four|\d+|that)\s+cards?/i.exec(text);
  if (discardMatch && !additionalDiscardMatch) {
    const token = discardMatch[1].toLowerCase();
    const n = token === "that" ? 1 : parseCount(discardMatch[1]) ?? 1;
    doList.push({ action: ActionId.DISCARD_CARDS, args: [n] });
    addUnique(touch, { id: ResourceId.CARD }, (a, b) => a.id === b.id);
    if (/each opponent/i.test(text)) {
      addUnique(gates, { id: GateId.EACH_OPPONENT }, (a, b) => a.id === b.id);
    }
    if (/target/i.test(text)) {
      addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
    }
  }

  const millMatch = /\btarget player mills\s+(a|an|one|two|three|four|\d+)\s+cards?\b/i.exec(text);
  if (millMatch) {
    // Template v1: mill target player (e.g., "Target player mills two cards.")
    const n = parseCount(millMatch[1]) ?? 1;
    doList.push({ action: ActionId.MILL_CARDS, args: [n] });
    addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
  }

  const tokenMatch = /create\s+(a|an|one|two|three|four|\d+|x)\s+(treasure|food|blood|clue)\s+tokens?/i.exec(text);
  const genericTokenMatch = /create\s+(a|an|one|two|three|four|\d+|x)\s+([^.]+?)\s+tokens?/i.exec(text);
  const tokenBareMatch = /create\s+(a|an|one|two|three|four|\d+|x)\s+tokens?\b/i.exec(text);
  if (tokenMatch || genericTokenMatch || tokenBareMatch) {
    const match = tokenMatch ?? genericTokenMatch ?? tokenBareMatch!;
    const n = parseCount(match[1]) ?? 1;
    const kindText = tokenMatch ? match[2] : genericTokenMatch ? match[2] : "token";
    const kind = tokenKindFromText(kindText) ?? TokenKindId.UNKNOWN_TOKEN;
    doList.push({ action: ActionId.CREATE_TOKEN, tokenData: { kind, n } });
    addUnique(touch, { id: tokenResourceFromKind(kind) }, (a, b) => a.id === b.id);
  }

  const counterMatch = /put\s+(a|an|one|two|three|four|\d+)\s+\+1\/\+1\s+counters?/i.exec(text);
  if (counterMatch) {
    const n = parseCount(counterMatch[1]) ?? 1;
    doList.push({ action: ActionId.ADD_COUNTERS, args: [n] });
    addUnique(touch, { id: ResourceId.COUNTER_P1P1 }, (a, b) => a.id === b.id);
    if (/target/i.test(text)) {
      addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
    }
  }

  const damageMatch = /deal\w*\s+(\d+)\s+damage/i.exec(text);
  if (damageMatch) {
    const n = Number.parseInt(damageMatch[1], 10);
    doList.push({ action: ActionId.DEAL_DAMAGE, args: [n] });
    addUnique(touch, { id: ResourceId.LIFE }, (a, b) => a.id === b.id);
    if (/target/i.test(text)) {
      addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
    }
  }

  const gainLifeMatch = /you gain\s+(a|an|one|two|three|four|\d+)\s+life/i.exec(text);
  if (gainLifeMatch) {
    const n = parseCount(gainLifeMatch[1]) ?? 1;
    doList.push({ action: ActionId.GAIN_LIFE, args: [n] });
    addUnique(touch, { id: ResourceId.LIFE }, (a, b) => a.id === b.id);
  }

  const tapTargetMatch = /\btap\s+target\b/i.test(text);
  if (tapTargetMatch) {
    // Template v1: tap target effects (e.g., "Tap target creature.")
    doList.push({ action: ActionId.TAP });
    addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
  }

  const searchLibraryMatch = /\bsearch\s+your\s+library\b/i.test(text);
  if (searchLibraryMatch) {
    // Template v1: search library effects (e.g., "Search your library for a card...")
    doList.push({ action: ActionId.SEARCH_LIBRARY });
  }

  const loseLifeMatch = /loses\s+(a|an|one|two|three|four|\d+)\s+life/i.exec(text);
  if (loseLifeMatch) {
    const n = parseCount(loseLifeMatch[1]) ?? 1;
    doList.push({ action: ActionId.LOSE_LIFE, args: [n] });
    addUnique(touch, { id: ResourceId.LIFE }, (a, b) => a.id === b.id);
    if (/each opponent/i.test(text)) {
      addUnique(gates, { id: GateId.EACH_OPPONENT }, (a, b) => a.id === b.id);
    }
    if (/target/i.test(text)) {
      addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
    }
  }

  const youLoseLifeMatch = /you lose\s+(a|an|one|two|three|four|\d+)\s+life/i.exec(text);
  if (youLoseLifeMatch) {
    const n = parseCount(youLoseLifeMatch[1]) ?? 1;
    doList.push({ action: ActionId.LOSE_LIFE, args: [n] });
    addUnique(touch, { id: ResourceId.LIFE }, (a, b) => a.id === b.id);
  }

  if (/destroy\s+target/i.test(text)) {
    doList.push({ action: ActionId.DESTROY_PERMANENT });
    addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
  }

  if (/gain\s+control\s+of\s+target/i.test(text)) {
    doList.push({ action: ActionId.CHANGE_CONTROL });
    addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
  }

  if (/untap\s+(target|that)\b/i.test(text)) {
    doList.push({ action: ActionId.UNTAP });
    if (/target/i.test(text)) {
      addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
    }
  }

  if (/any target/i.test(text)) {
    addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
  }

  if (/up to\s+(a|an|one|two|three|four|\d+)\s+target/i.test(text)) {
    addUnique(gates, { id: GateId.UP_TO }, (a, b) => a.id === b.id);
    addUnique(gates, { id: GateId.TARGET_REQUIRED }, (a, b) => a.id === b.id);
  }

  normalizeIds(watch, (w) => w.id);
  normalizeIds(cost, (c) => c.cost, (a, b) => (a.res ?? 0) - (b.res ?? 0));
  normalizeIds(doList, (d) => d.action, (a, b) => (a.tokenData?.kind ?? 0) - (b.tokenData?.kind ?? 0));
  normalizeIds(touch, (t) => t.id);
  normalizeIds(gates, (g) => g.id);

  const frame = {
    kind,
    watch,
    cost,
    do: doList,
    touch,
    gates,
  };

  const ir: SemanticCardIR = {
    card_id: 0,
    frames: [frame],
  };

  const hasKnownAction = doList.some((eff) => eff.action !== ActionId.UNKNOWN_ACTION);
  const hasWatch = watch.length > 0;
  let confidence: "high" | "med" | "low" = "low";
  if (hasKnownAction || hasWatch) {
    confidence = "high";
  } else if (cost.length > 0 || gates.length > 0) {
    confidence = "med";
  }
  Object.defineProperty(ir, "confidence", { value: confidence, enumerable: false });

  const legalityActionBindingMinV1 = detectLegalityActionBindingMinV1(text, kind);
  const zonePermissionMinV1 = classifyZonePermissionMinV1(text);
  const legalityActorConstraintMinV1 = classifyLegalityActorConstraintMinV1(text);
  const legalityConditionMinV1 = classifyLegalityConditionMinV1(text);
  const legalityStaticAbilityRestrictionsMinV1 = classifyLegalityStaticAbilityRestrictionsMinV1(text);
  const manaAbilityMinV1 = classifyManaAbilityMinV1(text);
  const triggeredManaAbilityMinV1 = classifyTriggeredManaAbilityMinV1(text);
  if (
    legalityActionBindingMinV1 ||
    zonePermissionMinV1 ||
    legalityActorConstraintMinV1 ||
    legalityConditionMinV1 ||
    legalityStaticAbilityRestrictionsMinV1 ||
    manaAbilityMinV1 ||
    triggeredManaAbilityMinV1.class === "TRIGGERED_MANA_ABILITY"
  ) {
    const existingSemanticHints =
      (Reflect.get(ir, "semantic_hints") as Record<string, unknown> | undefined) ?? {};
    const nextSemanticHints: Record<string, unknown> = { ...existingSemanticHints };
    if (legalityActionBindingMinV1) {
      nextSemanticHints.legality_action_binding_min = legalityActionBindingMinV1;
    }
    if (zonePermissionMinV1) {
      nextSemanticHints.zone_permission_min = zonePermissionMinV1;
    }
    if (legalityActorConstraintMinV1) {
      nextSemanticHints.legality_actor_constraint_min = legalityActorConstraintMinV1;
    }
    if (legalityConditionMinV1) {
      nextSemanticHints.legality_condition_min = legalityConditionMinV1;
    }
    if (legalityStaticAbilityRestrictionsMinV1) {
      nextSemanticHints.legality_static_ability_restrictions_min_v1 = legalityStaticAbilityRestrictionsMinV1;
    }
    if (manaAbilityMinV1) {
      nextSemanticHints.mana_ability_min = manaAbilityMinV1;
    }
    if (triggeredManaAbilityMinV1.class === "TRIGGERED_MANA_ABILITY") {
      nextSemanticHints.triggered_mana_ability_min = triggeredManaAbilityMinV1;
    }
    Object.defineProperty(ir, "semantic_hints", {
      value: nextSemanticHints,
      enumerable: false,
    });
  }

  return ir;
}
