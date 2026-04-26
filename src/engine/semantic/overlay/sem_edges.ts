import type { SemanticCardIR } from "../contract";
import { ActionId, EventId } from "../contract";
import { buildSemanticCardProfile, KeyKind, keyOf } from "./sem_profile";

export type SemanticEdgeReason = {
  key: number;
  weight: number;
};

export type SemanticEdge = {
  from: number;
  to: number;
  score: number;
  reasons: SemanticEdgeReason[];
  local_only?: boolean;
};

type CardInput = {
  card_id: number;
  ir: SemanticCardIR;
  oracle_text?: string;
};

type BuildSemanticEdgesOptions = {
  includeLocalOnly?: boolean;
};

function applyCreatureDiesPayoffBridge(profile: ReturnType<typeof buildSemanticCardProfile>): number[] {
  const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
  if (!profile.consumed.has(diesKey)) return [];
  const payoffActionKeys = [
    keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE),
    keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE),
    keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE),
  ];
  const matched = payoffActionKeys.filter((key) => profile.produced.has(key));
  return matched.length > 0 ? matched : [];
}

function explicitDiesTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\bdies\b/.test(normalized) ||
    normalized.includes("creature dies") ||
    normalized.includes("another creature dies")
  );
}

function applyDealDamageLoseLifeBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.produced.has(dealDamageKey);
}

function applySacrificeAsCostDrawCardsBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return profile.produced.has(sacrificeKey) && profile.produced.has(drawCardsKey);
}

function applyLeavesBattlefieldCreateTokenBridge(
  profile: ReturnType<typeof buildSemanticCardProfile>,
): boolean {
  const leavesBattlefieldKey = keyOf(KeyKind.EVENT, EventId.LEAVES_BATTLEFIELD);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return profile.consumed.has(leavesBattlefieldKey) && profile.produced.has(createTokenKey);
}

function applyLeavesBattlefieldDrawCardsBridge(
  profile: ReturnType<typeof buildSemanticCardProfile>,
): boolean {
  const leavesBattlefieldKey = keyOf(KeyKind.EVENT, EventId.LEAVES_BATTLEFIELD);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return profile.consumed.has(leavesBattlefieldKey) && profile.produced.has(drawCardsKey);
}

function explicitLeavesBattlefieldTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return normalized.includes("leaves the battlefield");
}

function explicitDamageToPlayerTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\bdeal\w*\s+\d+\s+damage\s+to\s+target\s+player\b/.test(normalized) ||
    /\bdeal\w*\s+\d+\s+damage\s+to\s+an?\s+opponent\b/.test(normalized) ||
    /\bdeal\w*\s+\d+\s+damage\s+to\s+each\s+opponent\b/.test(normalized) ||
    /\bdeal\w*\s+\d+\s+damage\s+to\s+each\s+player\b/.test(normalized)
  );
}

function explicitPreventDamageNoDamageEventGuardTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  if (/\bcan(?:not|'t)\s+be\s+prevented\b/.test(normalized)) return false;

  return (
    /\bprevent\b[^.]*\bdamage\b[^.]*\bwould\s+be\s+dealt\b/.test(normalized) ||
    /\bprevent\b[^.]*\bwould\s+deal\b[^.]*\bdamage\b/.test(normalized) ||
    /\bprevent\b[^.]*\bdeal\w*\s+\d+\s+damage\b/.test(normalized)
  );
}

function explicitSacrificeAsCostDrawCardsTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasAdditionalCostToCastSacrificeAndDraw =
    /\bas\s+an\s+additional\s+cost\s+to\s+cast\b[^.]*\bsacrifice\b[^.]*\bdraws?\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(
      normalized,
    ) ||
    /\bas\s+an\s+additional\s+cost\s+to\s+cast\b[^.]*\bsacrifice\b[^.]*\.\s*[^.]*\bdraws?\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(
      normalized,
    );
  const hasActivatedSacrificeCostDraw =
    /(?:^|[.]\s*)(?:\{t\}\s*,\s*)?sacrifice\s+(?:another\s+creature|this\s+artifact)\s*:\s*[^.]*\bdraws?\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(
      normalized,
    );
  return hasAdditionalCostToCastSacrificeAndDraw || hasActivatedSacrificeCostDraw;
}

function applyLifeGainAddCountersBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return profile.consumed.has(lifeGainEventKey) && profile.produced.has(addCountersKey);
}

function applyLifeGainDrawCardsBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return profile.consumed.has(lifeGainEventKey) && profile.produced.has(drawCardsKey);
}

function applyDamageWithLifelinkLifeGainBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.produced.has(dealDamageKey);
}

function applyCastSpellDamageBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.consumed.has(castSpellKey) && profile.produced.has(dealDamageKey);
}

function applyCastSpellDrawCardsBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return profile.consumed.has(castSpellKey) && profile.produced.has(drawCardsKey);
}

function applyCastSpellCreateTokenBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return profile.consumed.has(castSpellKey) && profile.produced.has(createTokenKey);
}

function applyCreatureAttacksCreateTokenBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(createTokenKey);
}

function applyCreatureAttacksDrawCardsBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(drawCardsKey);
}

function applyCreatureAttacksDealDamageBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(dealDamageKey);
}

function applyCreatureAttacksAddCountersBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(addCountersKey);
}

function applyCreatureAttacksLoseLifeBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(loseLifeKey);
}

function applyCreatureAttacksGainLifeBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const gainLifeKey = keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(gainLifeKey);
}

function applyCreatureAttacksMillBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const millCardsKey = keyOf(KeyKind.ACTION, ActionId.MILL_CARDS);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(millCardsKey);
}

function applyCreatureAttacksDiscardCardsBridge(
  profile: ReturnType<typeof buildSemanticCardProfile>,
): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const discardCardsKey = keyOf(KeyKind.ACTION, ActionId.DISCARD_CARDS);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(discardCardsKey);
}

function applyCreatureAttacksProduceManaBridge(
  profile: ReturnType<typeof buildSemanticCardProfile>,
): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const produceManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(produceManaKey);
}

function applyCreatureAttacksPtChangeBridge(
  profile: ReturnType<typeof buildSemanticCardProfile>,
): boolean {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const ptChangeKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
  return profile.consumed.has(creatureAttacksKey) && profile.produced.has(ptChangeKey);
}

function applyCastSpellPtChangeBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const ptChangeKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
  return profile.consumed.has(castSpellKey) && profile.produced.has(ptChangeKey);
}

function applyCastSpellAddCountersBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return profile.produced.has(addCountersKey);
}

function applyCreateTokenEtbBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  const entersBattlefieldKey = keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD);
  return profile.produced.has(createTokenKey) && profile.produced.has(entersBattlefieldKey);
}

function applyDrawCardsDealDamageBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.produced.has(drawCardsKey) && profile.produced.has(dealDamageKey);
}

function applyDrawCardsCreateTokenBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return profile.produced.has(drawCardsKey) && profile.produced.has(createTokenKey);
}

function applyDrawCardsMillBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const millCardsKey = keyOf(KeyKind.ACTION, ActionId.MILL_CARDS);
  return profile.produced.has(drawCardsKey) && profile.produced.has(millCardsKey);
}

function applyDrawCardsLoseLifeBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  return profile.produced.has(drawCardsKey) && profile.produced.has(loseLifeKey);
}

function applyDrawCardsAddCountersBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return profile.produced.has(drawCardsKey) && profile.produced.has(addCountersKey);
}

function applyDrawCardsAddManaBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const addManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  return profile.produced.has(drawCardsKey) && profile.produced.has(addManaKey);
}

function applyDrawSecondCreateTokenBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawSecondKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return profile.consumed.has(drawSecondKey) && profile.produced.has(createTokenKey);
}

function applyDrawSecondDealDamageBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const drawSecondKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.consumed.has(drawSecondKey) && profile.produced.has(dealDamageKey);
}

function applyTappedStatusLocalEnablementBridge(
  profile: ReturnType<typeof buildSemanticCardProfile>,
): number[] {
  const localEnablementActionKeys = [keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS)];
  const matched = localEnablementActionKeys.filter((key) => profile.produced.has(key));
  return matched.length > 0 ? matched : [];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasLocalUntappedStatusCondition(text: string, cardName?: string): boolean {
  const normalized = text.toLowerCase();
  const selfSubjects = ["this artifact", "this creature", "this permanent"];
  const trimmedCardName = (cardName ?? "").trim().toLowerCase();
  if (trimmedCardName.length > 0) {
    selfSubjects.push(trimmedCardName);
  }
  const subjectPattern = selfSubjects.map((subject) => escapeRegex(subject)).join("|");
  const untappedConditionPattern = new RegExp(
    `\\b(?:if|for as long as|as long as)\\s+(?:${subjectPattern})\\s+is\\s+untapped\\b`,
    "i",
  );
  return untappedConditionPattern.test(normalized);
}

function applyCountersMatterLocalBridge(profile: ReturnType<typeof buildSemanticCardProfile>): number[] {
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  if (!profile.produced.has(addCountersKey)) return [];

  const countersMatterPayoffKeys = [
    keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS),
    keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE),
    keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE),
    keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN),
  ];
  const matched = countersMatterPayoffKeys.filter((key) => profile.produced.has(key));
  return matched.length > 0 ? matched : [];
}

function explicitCountersMatterTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasCounterSignal = /\bcounters?\b/.test(normalized);
  const hasCountersMatterPattern =
    /\bfor each\b[^.]*\bcounters?\b/.test(normalized) ||
    /\bone or more\b[^.]*\bcounters?\b/.test(normalized) ||
    (/\bwhenever\b[^.]*\bcounters?\b/.test(normalized) &&
      /\b(draw|deal|create|gain)\b/.test(normalized));
  return hasCounterSignal && hasCountersMatterPattern;
}

function applyProduceManaEnablementClosureBridge(
  profile: ReturnType<typeof buildSemanticCardProfile>,
): number[] {
  const produceManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  if (!profile.produced.has(produceManaKey)) return [];

  const enablementActionKeys = [
    keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS),
    keyOf(KeyKind.ACTION, ActionId.SCRY),
    keyOf(KeyKind.ACTION, ActionId.MILL_CARDS),
    keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE),
    keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS),
    keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN),
  ];
  const matched = enablementActionKeys.filter((key) => profile.produced.has(key));
  return matched.length > 0 ? matched : [];
}

function explicitProduceManaEnablementTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasProduceMana = /\{t\}:\s*add\s+(?:\{[wubrgc]\}|\{c\}\{c\}|one\s+mana\s+of\s+any\s+color|three\s+mana\s+of\s+any\s+one\s+color)\b/i.test(
    normalized,
  );
  const hasManaCostedActivatedSink = /(?:^|[.]\s*)(?:\{(?:\d+|[wubrgcxy]|[wubrgc]\/[wubrgc])\}\s*,\s*)+\{t\}\s*:/i.test(
    normalized,
  );
  const hasExplicitPayoffVerb = /\b(draw|scry|mill|deal|create|put)\b/i.test(normalized);
  return hasProduceMana && hasManaCostedActivatedSink && hasExplicitPayoffVerb;
}

function explicitCastInstantOrSorceryDamagePayoffTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("whenever you cast an instant or sorcery spell") &&
    normalized.includes("deal") &&
    normalized.includes("damage")
  );
}

function explicitCastInstantOrSorceryDrawPayoffTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasDraw = /\bdraw\b/.test(normalized);
  const hasCastInstantOrSorcery =
    /\bwhenever\s+you\s+cast\s+an?\s+instant\s+or\s+sorcery\s+spell\b/i.test(normalized);
  const hasCastNoncreature =
    /\bwhenever\s+you\s+cast\s+a\s+noncreature\s+spell\b/i.test(normalized);
  const hasCastOrCopyInstantOrSorcery =
    /\bwhenever\s+you\s+cast\s+or\s+copy\s+an?\s+instant\s+or\s+sorcery\s+spell\b/i.test(normalized);
  const hasSecondSpellPattern = /\bsecond\s+spell\b[^.]*\beach\s+turn\b/i.test(normalized);
  const hasDrawSecondPattern = /\bdraw\b[^.]*\bsecond\s+card\b[^.]*\beach\s+turn\b/i.test(normalized);

  return (
    hasDraw &&
    (hasCastInstantOrSorcery || hasCastNoncreature || hasCastOrCopyInstantOrSorcery) &&
    !hasSecondSpellPattern &&
    !hasDrawSecondPattern
  );
}

function explicitCastSpellCreateTokenPayoffTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasCreateToken = normalized.includes("create") && normalized.includes("token");
  const isCastInstantOrSorcery = normalized.includes("whenever you cast an instant or sorcery spell");
  const isCastNoncreatureSpell = normalized.includes("whenever you cast a noncreature spell");
  return hasCreateToken && (isCastInstantOrSorcery || isCastNoncreatureSpell);
}

function explicitCreatureAttacksCreateTokenTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasNarrowAttackTrigger = /\bwhenever\s+this\s+creature\s+attacks\s*,/i.test(normalized);
  const hasCreateTokenClause = /\bcreate\b[^.]*\btoken\b/i.test(normalized);
  return hasNarrowAttackTrigger && hasCreateTokenClause;
}

function explicitCreatureAttacksDrawCardsTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\bdraws?\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(
    normalized,
  );
}

function explicitCreatureAttacksDealDamageTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\b(?:it|this creature|this card|[a-z][a-z0-9,' -]{0,60})\s+deals?\s+\d+\s+damage\b/i.test(
    normalized,
  );
}

function explicitCreatureAttacksAddCountersTextEvidence(text: string, cardName?: string): boolean {
  const normalized = text.toLowerCase();
  const narrowPattern =
    "\\bwhenever\\s+this\\s+creature\\s+attacks\\s*,[^.]*\\bput\\s+(?:a|an|one|two|three|four|\\d+)\\s+\\+1\\/\\+1\\s+counters?\\s+on\\s+";

  const selfReferencePattern = new RegExp(`${narrowPattern}(?:it|this\\s+creature)\\b`, "i");
  if (selfReferencePattern.test(normalized)) return true;

  const normalizedCardName = (cardName ?? "").trim().toLowerCase();
  if (!normalizedCardName) return false;

  const cardNamePattern = new RegExp(`${narrowPattern}${escapeRegex(normalizedCardName)}\\b`, "i");
  return cardNamePattern.test(normalized);
}

function explicitCreatureAttacksLoseLifeTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\b(?:each\s+opponents?|target\s+opponents?|defending\s+player)\s+loses?\s+(?:a|an|one|two|three|four|\d+)\s+life\b/i.test(
    normalized,
  );
}

function explicitCreatureAttacksGainLifeTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\byou\s+gain\s+(?:a|an|one|two|three|four|\d+)\s+life\b/i.test(
    normalized,
  );
}

function explicitCreatureAttacksMillTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\btarget\s+(?:opponent|player)\s+mills?\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(
    normalized,
  );
}

function explicitCreatureAttacksDiscardCardsTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\b(?:target\s+(?:player|opponent)|defending\s+player)\s+discards?\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(
    normalized,
  );
}

function explicitCreatureAttacksProduceManaTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\badd\s+\{[wubrgcxyz0-9/]+\}(?:\{[wubrgcxyz0-9/]+\})*/i.test(
    normalized,
  );
}

function explicitCreatureAttacksPtChangeTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bwhenever\s+this\s+creature\s+attacks\s*,[^.]*\b(?:it|this\s+creature)\s+gets\s+\+(\d+)\/\+\1\s+until\s+end\s+of\s+turn\b/i.test(
    normalized,
  );
}

function explicitCastSpellPtChangePayoffTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasCastTrigger =
    normalized.includes("whenever you cast an instant or sorcery spell") ||
    normalized.includes("whenever you cast a noncreature spell");
  const hasPtPumpUntilEot = /\bgets\s+\+\d+\/(?:\+\d+|0)\s+until\s+end\s+of\s+turn\b/i.test(normalized);
  return hasCastTrigger && hasPtPumpUntilEot;
}

function explicitCastSpellAddCountersPayoffTextEvidence(text: string, cardName?: string): boolean {
  const normalized = text.toLowerCase();
  const hasSecondSpellPattern = /\bsecond\s+spell\b[^.]*\beach\s+turn\b/i.test(normalized);
  if (hasSecondSpellPattern) return false;

  const hasCastOrCopyPattern =
    /\bwhen(?:ever)?\s+you\s+cast\s+or\s+copy\b[^.]*\bspell\b/i.test(normalized);
  if (hasCastOrCopyPattern) return false;

  const castSpellClause = "\\bwhen(?:ever)?\\s+you\\s+cast\\b[^.]*\\bspell\\b";
  const putCounterClause =
    "\\bput\\s+(?:a|an|one|two|three|four|\\d+)\\s+\\+1\\/\\+1\\s+counters?\\s+on\\s+";

  const thisCreaturePattern = new RegExp(
    `${castSpellClause}[^.]*${putCounterClause}this\\s+creature\\b`,
    "i",
  );
  if (thisCreaturePattern.test(normalized)) return true;

  const normalizedCardName = (cardName ?? "").trim().toLowerCase();
  if (normalizedCardName.length === 0) return false;
  const cardNamePattern = new RegExp(
    `${castSpellClause}[^.]*${putCounterClause}${escapeRegex(normalizedCardName)}\\b`,
    "i",
  );
  return cardNamePattern.test(normalized);
}

function explicitCastSpellAddManaPayoffTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const castTriggerPattern =
    "when(?:ever)?\\s+you\\s+cast\\s+(?:a\\s+spell|an?\\s+instant\\s+or\\s+sorcery\\s+spell|a\\s+noncreature\\s+spell)";
  const hasCastAddManaSameSentence =
    /\bwhen(?:ever)?\s+you\s+cast\s+(?:a\s+spell|an?\s+instant\s+or\s+sorcery\s+spell|a\s+noncreature\s+spell)\b[^.]*\badd\s+(?:\{[wubrgc]\}|one\s+mana\s+of\s+any\s+color|mana)/i.test(
      normalized,
    );
  const hasCastAddManaNextSentence = new RegExp(
    `\\b${castTriggerPattern}\\b[^.]*\\.\\s*add\\s+(?:\\{[wubrgc]\\}|one\\s+mana\\s+of\\s+any\\s+color|mana)`,
    "i",
  ).test(normalized);
  const hasCastAddManaSentence = hasCastAddManaSameSentence || hasCastAddManaNextSentence;
  const hasCastCreateTokenSentence =
    /\bwhen(?:ever)?\s+you\s+cast\b[^.]*\bcreate\b[^.]*\btoken\b/i.test(normalized);
  return hasCastAddManaSentence && !hasCastCreateTokenSentence;
}

function explicitDrawSecondCreateTokenTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\b(?:when|whenever)[^.]*\bdraw\b[^.]*\bsecond\s+card\b[^.]*\beach\s+turn\b/.test(normalized) &&
    normalized.includes("create") &&
    normalized.includes("token")
  );
}

function explicitDrawSecondDealDamageTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\b(?:when|whenever)[^.]*\bdraw\b[^.]*\bsecond\s+card\b[^.]*\beach\s+turn\b/.test(normalized) &&
    normalized.includes("deal") &&
    normalized.includes("damage")
  );
}

function explicitDrawCardsDealDamageTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasDrawSecondPattern = /\bsecond\s+card\b[^.]*\beach\s+turn\b/i.test(normalized);
  if (hasDrawSecondPattern) return false;

  const hasDrawTrigger =
    /\bwhen(?:ever)?\s+you\s+draw\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(normalized) ||
    /\bwhen(?:ever)?\s+one\s+or\s+more\s+cards?\s+are\s+drawn\b/i.test(normalized);
  const hasDealDamageInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\bdeal\w*\b[^.]*\bdamage\b/i.test(normalized);

  return hasDrawTrigger && hasDealDamageInSameSentence;
}

function explicitDrawCardsCreateTokenTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasDrawSecondPattern = /\bsecond\s+card\b[^.]*\beach\s+turn\b/i.test(normalized);
  if (hasDrawSecondPattern) return false;

  const hasDrawTrigger =
    /\bwhen(?:ever)?\s+you\s+draw\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(normalized) ||
    /\bwhen(?:ever)?\s+one\s+or\s+more\s+cards?\s+are\s+drawn\b/i.test(normalized);
  const hasCreateTokenInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\bcreate\b[^.]*\btoken\b/i.test(normalized);

  return hasDrawTrigger && hasCreateTokenInSameSentence;
}

function explicitDrawCardsMillTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasDrawSecondPattern = /\bsecond\s+card\b[^.]*\beach\s+turn\b/i.test(normalized);
  if (hasDrawSecondPattern) return false;

  const hasDrawTrigger =
    /\bwhen(?:ever)?\s+you\s+draw\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(normalized);
  const hasMillInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\btarget\s+opponents?\s+mills\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(
      normalized,
    );
  if (!hasDrawTrigger || !hasMillInSameSentence) return false;

  const hasCreateTokenInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\bcreate\b[^.]*\btoken\b/i.test(normalized);
  if (hasCreateTokenInSameSentence) return false;
  const hasLoseLifeInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\bloses?\b[^.]*\blife\b/i.test(normalized);
  if (hasLoseLifeInSameSentence) return false;
  const hasDealDamageInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\bdeal\w*\b[^.]*\bdamage\b/i.test(normalized);
  if (hasDealDamageInSameSentence) return false;
  const hasAddCountersInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\bput\b[^.]*\+1\/\+1\b[^.]*\bcounters?\b/i.test(normalized);
  if (hasAddCountersInSameSentence) return false;

  return true;
}

function explicitDrawCardsLoseLifeTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasDrawSecondPattern = /\bsecond\s+card\b[^.]*\beach\s+turn\b/i.test(normalized);
  if (hasDrawSecondPattern) return false;

  const hasDrawTrigger =
    /\bwhen(?:ever)?\s+you\s+draw\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(normalized);
  const hasLoseLifeInSameSentence =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\beach\s+opponents?\s+loses?\s+(?:a|an|one|two|three|four|\d+)\s+life\b/i.test(
      normalized,
    );

  return hasDrawTrigger && hasLoseLifeInSameSentence;
}

function explicitDrawCardsAddManaTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasDrawSecondPattern = /\bsecond\s+card\b[^.]*\beach\s+turn\b/i.test(normalized);
  if (hasDrawSecondPattern) return false;

  const drawClause = "\\bdraw\\s+(?:a|an|one|two|three|four|\\d+)\\s+cards?\\b";
  const addManaClause =
    "\\badd\\s+(?:\\{[wubrgc]\\}|\\{c\\}\\{c\\}|one\\s+mana\\s+of\\s+any\\s+color|three\\s+mana\\s+of\\s+any\\s+one\\s+color|mana)";
  const hasDrawThenAddManaSameSentence = new RegExp(`${drawClause}[^.]*${addManaClause}`, "i").test(normalized);
  const hasDrawThenAddManaNextSentence = new RegExp(`${drawClause}[^.]*\\.\\s*${addManaClause}`, "i").test(
    normalized,
  );

  return hasDrawThenAddManaSameSentence || hasDrawThenAddManaNextSentence;
}

function explicitDrawCardsAddCountersTextEvidence(text: string, cardName?: string): boolean {
  const normalized = text.toLowerCase();
  const hasDrawSecondPattern = /\bsecond\s+card\b[^.]*\beach\s+turn\b/i.test(normalized);
  if (hasDrawSecondPattern) return false;

  const hasDrawTrigger =
    /\bwhen(?:ever)?\s+you\s+draw\s+(?:a|an|one|two|three|four|\d+)\s+cards?\b/i.test(normalized) ||
    /\bwhen(?:ever)?\s+one\s+or\s+more\s+cards?\s+are\s+drawn\b/i.test(normalized);
  if (!hasDrawTrigger) return false;

  const hasTargetCreatureCounters =
    /\bwhen(?:ever)?\b[^.]*\bdraw\b[^.]*\bput\b[^.]*\+1\/\+1\b[^.]*\bcounters?\b[^.]*\bon\s+target\s+creature\b/i.test(
      normalized,
    );
  if (hasTargetCreatureCounters) return false;

  const hasCastSpellTrigger = /\bwhen(?:ever)?\s+you\s+cast\b[^.]*\bspell\b/i.test(normalized);
  if (hasCastSpellTrigger) return false;

  const hasLifeGainTrigger = /\bwhen(?:ever)?\s+you\s+gain\s+life\b/i.test(normalized);
  if (hasLifeGainTrigger) return false;

  const putCounterClause =
    "\\bput\\s+(?:a|an|one|two|three|four|\\d+)\\s+\\+1\\/\\+1\\s+counters?\\s+on\\s+";
  const drawTriggerClause = "\\bwhen(?:ever)?\\s+you\\s+draw\\s+(?:a|an|one|two|three|four|\\d+)\\s+cards?\\b";

  const selfReferencePattern = new RegExp(
    `${drawTriggerClause}[^.]*${putCounterClause}(?:this\\s+creature|this\\s+permanent|itself)\\b`,
    "i",
  );
  if (selfReferencePattern.test(normalized)) return true;

  const normalizedCardName = (cardName ?? "").trim().toLowerCase();
  if (normalizedCardName.length === 0) return false;

  const cardNamePattern = new RegExp(
    `${drawTriggerClause}[^.]*${putCounterClause}${escapeRegex(normalizedCardName)}\\b`,
    "i",
  );
  return cardNamePattern.test(normalized);
}

function explicitLifelinkTextEvidence(text: string): boolean {
  return /\blifelink\b/.test(text.toLowerCase());
}

function explicitLifeGainDrawCardsTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasDirectTriggerPayoff =
    /\bwhen(?:ever)?\s+you\s+gain\s+life,\s*draw\s+a\s+card\b/i.test(normalized);
  if (!hasDirectTriggerPayoff) return false;

  const hasCostGate = /\byou\s+may\s+pay\b/i.test(normalized) || /\bif\s+you\s+do\b/i.test(normalized);
  if (hasCostGate) return false;

  const hasFirstTimeEachTurn = /\bfirst\s+time\s+each\s+turn\b/i.test(normalized);
  if (hasFirstTimeEachTurn) return false;

  const hasCounterChain = /\bcounters?\b[^.]*\bdraw\s+a\s+card\b/i.test(normalized);
  if (hasCounterChain) return false;

  const hasActivatedDrawClause =
    /(?:^|[.]\s*)(?:\{(?:\d+|[wubrgcxy]|[wubrgc]\/[wubrgc])\}\s*,\s*)+\{t\}\s*:[^.]*\bdraw\s+a\s+card\b/i.test(
      normalized,
    );
  if (hasActivatedDrawClause) return false;

  return true;
}

function explicitCreateTokenTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return normalized.includes("create") && normalized.includes("token");
}

export function buildSemanticEdges(inputCards: CardInput[], options?: BuildSemanticEdgesOptions): SemanticEdge[] {
  const includeLocalOnly = options?.includeLocalOnly ?? true;
  const cards = inputCards.map((card) => ({
    ...card,
    profile:
      (card as { profile?: ReturnType<typeof buildSemanticCardProfile> }).profile ??
      buildSemanticCardProfile(card.ir, card.oracle_text ?? ""),
  }));
  const edges: SemanticEdge[] = [];

  for (let i = 0; i < cards.length; i += 1) {
    for (let j = 0; j < cards.length; j += 1) {
      if (i === j) continue;
      const from = cards[i];
      const to = cards[j];
      if (from.card_id === to.card_id) continue;

      let score = 0;
      const reasons: SemanticEdgeReason[] = [];
      const producedEntries = Array.from(from.profile.produced.entries()).sort((a, b) => a[0] - b[0]);
      for (const [key, prodEntry] of producedEntries) {
        const consEntry = to.profile.consumed.get(key);
        const consWeight = consEntry?.count ?? 0;
        if (!consWeight) continue;
        if (prodEntry.origin === "cost" && consEntry?.origin === "cost") continue;
        const weight = Math.min(prodEntry.count, consWeight);
        if (weight <= 0) continue;
        score += weight;
        reasons.push({ key, weight });
      }

      if (score > 0) {
        reasons.sort((a, b) => a.key - b.key);
        edges.push({ from: from.card_id, to: to.card_id, score, reasons });
      }
    }
  }

  const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
  for (const card of cards) {
    const matchedPayoffs = applyCreatureDiesPayoffBridge(card.profile);
    if (matchedPayoffs.length === 0) continue;
    if (!explicitDiesTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [{ key: diesKey, weight: 1 }];
    for (const key of matchedPayoffs) {
      reasons.push({ key, weight: 1 });
    }
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const leavesBattlefieldKey = keyOf(KeyKind.EVENT, EventId.LEAVES_BATTLEFIELD);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  for (const card of cards) {
    if (!applyLeavesBattlefieldCreateTokenBridge(card.profile)) continue;
    if (!explicitLeavesBattlefieldTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: leavesBattlefieldKey, weight: 1 },
      { key: createTokenKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const leavesBattlefieldDrawKey = keyOf(KeyKind.EVENT, EventId.LEAVES_BATTLEFIELD);
  const drawCardsLeavesKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  for (const card of cards) {
    if (!applyLeavesBattlefieldDrawCardsBridge(card.profile)) continue;
    if (!explicitLeavesBattlefieldTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: leavesBattlefieldDrawKey, weight: 1 },
      { key: drawCardsLeavesKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const createTokenEtbKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  const entersBattlefieldEtbKey = keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD);
  for (const card of cards) {
    if (!applyCreateTokenEtbBridge(card.profile)) continue;
    if (!explicitCreateTokenTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: createTokenEtbKey, weight: 1 },
      { key: entersBattlefieldEtbKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const sacrificeAsCostKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
  const drawCardsSacrificeAsCostKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  for (const card of cards) {
    if (!applySacrificeAsCostDrawCardsBridge(card.profile)) continue;
    if (!explicitSacrificeAsCostDrawCardsTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: sacrificeAsCostKey, weight: 1 },
      { key: drawCardsSacrificeAsCostKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  for (const card of cards) {
    if (!applyDealDamageLoseLifeBridge(card.profile)) continue;
    if (!explicitDamageToPlayerTextEvidence(card.oracle_text ?? "")) continue;
    if (explicitPreventDamageNoDamageEventGuardTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: dealDamageKey, weight: 1 },
      { key: loseLifeKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const dealDamageCastSpellKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  for (const card of cards) {
    const cardName = (card as { name?: string }).name ?? `card_id:${card.card_id}`;
    const apply = applyCastSpellDamageBridge(card.profile);
    const textEvidence = explicitCastInstantOrSorceryDamagePayoffTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: castSpellKey, weight: 1 },
      { key: dealDamageCastSpellKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsCastSpellKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  for (const card of cards) {
    const apply = applyCastSpellDrawCardsBridge(card.profile);
    const textEvidence = explicitCastInstantOrSorceryDrawPayoffTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: castSpellKey, weight: 1 },
      { key: drawCardsCastSpellKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const createTokenCastSpellKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  for (const card of cards) {
    const apply = applyCastSpellCreateTokenBridge(card.profile);
    const textEvidence = explicitCastSpellCreateTokenPayoffTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: castSpellKey, weight: 1 },
      { key: createTokenCastSpellKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const createTokenCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  for (const card of cards) {
    const apply = applyCreatureAttacksCreateTokenBridge(card.profile);
    const textEvidence = explicitCreatureAttacksCreateTokenTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: createTokenCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  for (const card of cards) {
    const apply = applyCreatureAttacksDrawCardsBridge(card.profile);
    const textEvidence = explicitCreatureAttacksDrawCardsTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: drawCardsCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const dealDamageCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  for (const card of cards) {
    const apply = applyCreatureAttacksDealDamageBridge(card.profile);
    const textEvidence = explicitCreatureAttacksDealDamageTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: dealDamageCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const addCountersCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  for (const card of cards) {
    const apply = applyCreatureAttacksAddCountersBridge(card.profile);
    const cardName = (card as { name?: string }).name ?? "";
    const textEvidence = explicitCreatureAttacksAddCountersTextEvidence(card.oracle_text ?? "", cardName);
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: addCountersCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const loseLifeCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  for (const card of cards) {
    const apply = applyCreatureAttacksLoseLifeBridge(card.profile);
    const textEvidence = explicitCreatureAttacksLoseLifeTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: loseLifeCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const gainLifeCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE);
  for (const card of cards) {
    const apply = applyCreatureAttacksGainLifeBridge(card.profile);
    const textEvidence = explicitCreatureAttacksGainLifeTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: gainLifeCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const millCardsCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.MILL_CARDS);
  for (const card of cards) {
    const apply = applyCreatureAttacksMillBridge(card.profile);
    const textEvidence = explicitCreatureAttacksMillTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: millCardsCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const discardCardsCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.DISCARD_CARDS);
  for (const card of cards) {
    const apply = applyCreatureAttacksDiscardCardsBridge(card.profile);
    const textEvidence = explicitCreatureAttacksDiscardCardsTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: discardCardsCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const produceManaCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  for (const card of cards) {
    const apply = applyCreatureAttacksProduceManaBridge(card.profile);
    const textEvidence = explicitCreatureAttacksProduceManaTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: produceManaCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const ptChangeCreatureAttacksKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
  for (const card of cards) {
    const apply = applyCreatureAttacksPtChangeBridge(card.profile);
    const textEvidence = explicitCreatureAttacksPtChangeTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: creatureAttacksKey, weight: 1 },
      { key: ptChangeCreatureAttacksKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const ptChangeCastSpellKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
  for (const card of cards) {
    const apply = applyCastSpellPtChangeBridge(card.profile);
    const textEvidence = explicitCastSpellPtChangePayoffTextEvidence(card.oracle_text ?? "");
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: castSpellKey, weight: 1 },
      { key: ptChangeCastSpellKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const addCountersCastSpellKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  for (const card of cards) {
    const apply = applyCastSpellAddCountersBridge(card.profile);
    const cardName = (card as { name?: string }).name ?? "";
    const textEvidence = explicitCastSpellAddCountersPayoffTextEvidence(card.oracle_text ?? "", cardName);
    if (!apply) continue;
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: castSpellKey, weight: 1 },
      { key: addCountersCastSpellKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const produceManaCastSpellKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  for (const card of cards) {
    const textEvidence = explicitCastSpellAddManaPayoffTextEvidence(card.oracle_text ?? "");
    if (!textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: castSpellKey, weight: 1 },
      { key: produceManaCastSpellKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawSecondKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
  const createTokenDrawSecondKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  for (const card of cards) {
    if (!applyDrawSecondCreateTokenBridge(card.profile)) continue;
    if (!explicitDrawSecondCreateTokenTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawSecondKey, weight: 1 },
      { key: createTokenDrawSecondKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsCreateTokenKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const createTokenDrawCardsKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  for (const card of cards) {
    if (!applyDrawCardsCreateTokenBridge(card.profile)) continue;
    if (!explicitDrawCardsCreateTokenTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawCardsCreateTokenKey, weight: 1 },
      { key: createTokenDrawCardsKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsMillKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const millCardsDrawKey = keyOf(KeyKind.ACTION, ActionId.MILL_CARDS);
  for (const card of cards) {
    if (!applyDrawCardsMillBridge(card.profile)) continue;
    if (!explicitDrawCardsMillTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawCardsMillKey, weight: 1 },
      { key: millCardsDrawKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawSecondDamageKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
  const dealDamageDrawSecondKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  for (const card of cards) {
    if (!applyDrawSecondDealDamageBridge(card.profile)) continue;
    if (!explicitDrawSecondDealDamageTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawSecondDamageKey, weight: 1 },
      { key: dealDamageDrawSecondKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsDealDamageKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const dealDamageDrawCardsKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  for (const card of cards) {
    if (!applyDrawCardsDealDamageBridge(card.profile)) continue;
    if (!explicitDrawCardsDealDamageTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawCardsDealDamageKey, weight: 1 },
      { key: dealDamageDrawCardsKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsAddManaKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const addManaDrawCardsKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  for (const card of cards) {
    const apply = applyDrawCardsAddManaBridge(card.profile);
    const textEvidence = explicitDrawCardsAddManaTextEvidence(card.oracle_text ?? "");
    if (!apply && !textEvidence) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawCardsAddManaKey, weight: 1 },
      { key: addManaDrawCardsKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsLoseLifeKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const loseLifeDrawCardsKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  for (const card of cards) {
    if (!applyDrawCardsLoseLifeBridge(card.profile)) continue;
    if (!explicitDrawCardsLoseLifeTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawCardsLoseLifeKey, weight: 1 },
      { key: loseLifeDrawCardsKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const drawCardsAddCountersKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const addCountersDrawCardsKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  for (const card of cards) {
    if (!applyDrawCardsAddCountersBridge(card.profile)) continue;
    const cardName = (card as { name?: string }).name ?? "";
    if (!explicitDrawCardsAddCountersTextEvidence(card.oracle_text ?? "", cardName)) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: drawCardsAddCountersKey, weight: 1 },
      { key: addCountersDrawCardsKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  const drawCardsLifeGainKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  for (const card of cards) {
    if (!applyLifeGainDrawCardsBridge(card.profile)) continue;
    if (!explicitLifeGainDrawCardsTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: lifeGainEventKey, weight: 1 },
      { key: drawCardsLifeGainKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  for (const card of cards) {
    if (!applyLifeGainAddCountersBridge(card.profile)) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: lifeGainEventKey, weight: 1 },
      { key: addCountersKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const countersBridgeAddCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  for (const card of cards) {
    const matchedPayoffs = applyCountersMatterLocalBridge(card.profile);
    if (matchedPayoffs.length === 0) continue;
    if (!explicitCountersMatterTextEvidence(card.oracle_text ?? "")) continue;

    const reasons: SemanticEdgeReason[] = [{ key: countersBridgeAddCountersKey, weight: 1 }];
    for (const key of matchedPayoffs) {
      reasons.push({ key, weight: 1 });
    }
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const dealDamageLifelinkKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  const lifeGainLifelinkKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  for (const card of cards) {
    if (!applyDamageWithLifelinkLifeGainBridge(card.profile)) continue;
    if (!explicitLifelinkTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: dealDamageLifelinkKey, weight: 1 },
      { key: lifeGainLifelinkKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const produceManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  for (const card of cards) {
    const matchedEnablementActions = applyProduceManaEnablementClosureBridge(card.profile);
    if (matchedEnablementActions.length === 0) continue;
    if (!explicitProduceManaEnablementTextEvidence(card.oracle_text ?? "")) continue;

    const reasons: SemanticEdgeReason[] = [{ key: produceManaKey, weight: 1 }];
    for (const key of matchedEnablementActions) {
      reasons.push({ key, weight: 1 });
    }
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  for (const card of cards) {
    const matchedEnablementActions = applyTappedStatusLocalEnablementBridge(card.profile);
    if (matchedEnablementActions.length === 0) continue;
    if (!hasLocalUntappedStatusCondition(card.oracle_text ?? "", (card as { name?: string }).name ?? "")) continue;

    const reasons: SemanticEdgeReason[] = [{ key: keyOf(KeyKind.EVENT, EventId.UNTAP), weight: 1 }];
    for (const key of matchedEnablementActions) {
      reasons.push({ key, weight: 1 });
    }
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const outputEdges = includeLocalOnly ? edges : edges.filter((edge) => !edge.local_only);

  outputEdges.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.from !== b.from) return a.from - b.from;
    return a.to - b.to;
  });

  return outputEdges;
}
