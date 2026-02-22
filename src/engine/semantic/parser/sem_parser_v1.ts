import {
  ActionId,
  CostId,
  EventId,
  FrameKind,
  GateId,
  ResourceId,
  SemanticCardIR,
  TokenKindId,
} from "../contract";

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
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

export function parseSemanticIrV0(input: {
  name: string;
  oracle_text: string;
  type_line?: string | null;
}): SemanticCardIR {
  const text = input.oracle_text ?? "";
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
  if (kind === FrameKind.TRIGGERED) {
    if (/\benters(?: the battlefield)?\b/i.test(text)) {
      watch.push({ id: EventId.ENTERS_BATTLEFIELD });
    }
    if (/\b(when|whenever|at the beginning)[^.]*\bsacrifice\w*\b/i.test(text)) {
      watch.push({ id: EventId.SACRIFICE });
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
  if (kind === FrameKind.ACTIVATED) {
    const activatedCostMatch = /sacrifice[^:]*:/i.exec(text);
    if (activatedCostMatch) {
      const tokenKind = tokenKindFromText(activatedCostMatch[0]);
      const res = tokenKind ? tokenResourceFromKind(tokenKind) : ResourceId.UNKNOWN_RESOURCE;
      cost.push({ cost: CostId.SACRIFICE_AS_COST, res, n: 1 });
    }
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

  const tokenMatch = /create\s+(a|an|one|two|three|four|\d+)\s+(treasure|food|blood|clue)\s+tokens?/i.exec(text);
  if (tokenMatch) {
    const n = parseCount(tokenMatch[1]) ?? 1;
    const kind = tokenKindFromText(tokenMatch[2]) ?? TokenKindId.UNKNOWN_TOKEN;
    doList.push({ action: ActionId.CREATE_TOKEN, tokenData: { kind, n } });
    addUnique(touch, { id: tokenResourceFromKind(kind) }, (a, b) => a.id === b.id);
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

  return ir;
}
