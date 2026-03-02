import { ActionId, CostId, EventId, FrameKind, ResourceId, TokenKindId } from "../contract";
import { normalizeResourceId } from "./sem_inventory";
import type { SemanticCardIR } from "../contract";

export enum KeyKind {
  EVENT = 1,
  ACTION = 2,
  RESOURCE = 3,
}

export function keyOf(kind: KeyKind, id: number): number {
  return (kind << 16) | id;
}

export type SemanticProfileEntry = {
  count: number;
  origin: "cost" | "effect";
};

function isSacrificeCost(text: string): boolean {
  return /^\s*Sacrifice a creature[: ,]/i.test(text);
}

function isFoodSacrificeCost(text: string): boolean {
  return /^\s*Sacrifice a Food[: ,]/i.test(text);
}

function isTreasureSacrificeCost(text: string): boolean {
  return /^\s*Sacrifice a Treasure[: ,]/i.test(text);
}

function isClueSacrificeCost(text: string): boolean {
  return /^\s*Sacrifice a Clue[: ,]/i.test(text);
}

function isBloodSacrificeCost(text: string): boolean {
  return /^\s*Sacrifice a Blood[: ,]/i.test(text);
}

function createsTreasureToken(text: string): boolean {
  return /create\s+(?:a|two|three|x)?\s*treasure token/i.test(text);
}

function createsClueToken(text: string): boolean {
  return /create\s+(?:a|two|three|x)?\s*clue token/i.test(text);
}

function createsBloodToken(text: string): boolean {
  return /create\s+(?:a|two|three|x)?\s*blood token/i.test(text);
}

function tokenResourceFromKind(kind: TokenKindId): ResourceId {
  switch (kind) {
    case TokenKindId.TREASURE:
      return ResourceId.TOKEN_TREASURE;
    case TokenKindId.FOOD:
      return ResourceId.TOKEN_FOOD;
    case TokenKindId.CLUE:
      return ResourceId.TOKEN_CLUE;
    case TokenKindId.BLOOD:
      return ResourceId.TOKEN_BLOOD;
    case TokenKindId.SOLDIER:
      return ResourceId.TOKEN_SOLDIER;
    case TokenKindId.ZOMBIE:
      return ResourceId.TOKEN_ZOMBIE;
    default:
      return ResourceId.TOKEN_GENERIC;
  }
}

function tokenIsCreature(kind: TokenKindId): boolean {
  switch (kind) {
    case TokenKindId.TREASURE:
    case TokenKindId.FOOD:
    case TokenKindId.CLUE:
    case TokenKindId.BLOOD:
      return false;
    default:
      return true;
  }
}

function addToMap(
  map: Map<number, SemanticProfileEntry>,
  key: number,
  delta: number,
  origin: "cost" | "effect" = "effect",
): void {
  const current = map.get(key);
  if (current) {
    current.count += delta;
    if (current.origin !== origin) {
      current.origin = "effect";
    }
    return;
  }
  map.set(key, { count: delta, origin });
}

function addResource(
  map: Map<number, SemanticProfileEntry>,
  id: ResourceId,
  delta: number,
  origin: "cost" | "effect" = "effect",
): void {
  const normalized = normalizeResourceId(id);
  addToMap(map, keyOf(KeyKind.RESOURCE, normalized), delta, origin);
}

export function buildSemanticCardProfile(
  ir: SemanticCardIR,
  oracleText?: string
): { produced: Map<number, SemanticProfileEntry>; consumed: Map<number, SemanticProfileEntry> } {
  const produced = new Map<number, SemanticProfileEntry>();
  const consumed = new Map<number, SemanticProfileEntry>();
  const text = typeof oracleText === "string" ? oracleText : "";
  const sacrificeOrigin = isSacrificeCost(text) ? "cost" : "effect";
  const foodSacrifice = isFoodSacrificeCost(text);
  const treasureSacrifice = isTreasureSacrificeCost(text);
  const clueSacrifice = isClueSacrificeCost(text);
  const bloodSacrifice = isBloodSacrificeCost(text);
  const treasureCreated = createsTreasureToken(text);
  const clueCreated = createsClueToken(text);
  const bloodCreated = createsBloodToken(text);
  let createdTreasure = false;
  let createdClue = false;
  let createdBlood = false;

  if (foodSacrifice) {
    addResource(consumed, ResourceId.FOOD, 1, "cost");
  }
  if (treasureSacrifice) {
    addResource(consumed, ResourceId.TREASURE, 1, "cost");
  }
  if (clueSacrifice) {
    addResource(consumed, ResourceId.CLUE, 1, "cost");
  }
  if (bloodSacrifice) {
    addResource(consumed, ResourceId.BLOOD, 1, "cost");
  }

  for (const frame of ir.frames) {
    if (frame.kind === FrameKind.SPELL) {
      addToMap(produced, keyOf(KeyKind.EVENT, EventId.CAST_SPELL), 1);
    }
    for (const watch of frame.watch) {
      addToMap(consumed, keyOf(KeyKind.EVENT, watch.id), 1);
    }
    const castsSpell = frame.watch.some((watch) => watch.id === EventId.CAST_SPELL);
    if (castsSpell) {
      let damageEffects = 0;
      for (const eff of frame.do) {
        if (eff.action === ActionId.DEAL_DAMAGE) {
          damageEffects += 1;
        }
      }
      if (damageEffects > 0) {
        addToMap(consumed, keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE), damageEffects);
      }
    }
    if (frame.cost.some((cost) => cost.cost === CostId.SACRIFICE_AS_COST)) {
      addToMap(produced, keyOf(KeyKind.EVENT, EventId.SACRIFICE), 1, sacrificeOrigin);
    }
    for (const cost of frame.cost) {
      if (cost.res !== undefined) {
        const normalized = normalizeResourceId(cost.res);
        if (foodSacrifice && normalized === ResourceId.FOOD) continue;
        if (treasureSacrifice && normalized === ResourceId.TREASURE) continue;
        if (clueSacrifice && normalized === ResourceId.CLUE) continue;
        if (bloodSacrifice && normalized === ResourceId.BLOOD) continue;
        addResource(consumed, cost.res, cost.n ?? 1);
      }
    }

    for (const eff of frame.do) {
      addToMap(produced, keyOf(KeyKind.ACTION, eff.action), 1);
      if (eff.action === ActionId.CREATE_TOKEN && eff.tokenData) {
        const res = tokenResourceFromKind(eff.tokenData.kind);
        addResource(produced, res, eff.tokenData.n ?? 1);
        if (eff.tokenData.kind === TokenKindId.TREASURE) {
          createdTreasure = true;
        }
        if (eff.tokenData.kind === TokenKindId.CLUE) {
          createdClue = true;
        }
        if (eff.tokenData.kind === TokenKindId.BLOOD) {
          createdBlood = true;
        }
        addToMap(produced, keyOf(KeyKind.EVENT, EventId.TOKEN_CREATED), 1);
        if (tokenIsCreature(eff.tokenData.kind)) {
          addToMap(produced, keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD), 1);
        }
      }
      if (eff.action === ActionId.DRAW_CARDS || eff.action === ActionId.DISCARD_CARDS) {
        const n = eff.args?.[0] ?? 1;
        addResource(produced, ResourceId.CARD, n);
      }
      if (eff.action === ActionId.DRAW_CARDS) {
        addToMap(produced, keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN), 1);
      }
      if (
        eff.action === ActionId.GAIN_LIFE ||
        eff.action === ActionId.LOSE_LIFE ||
        eff.action === ActionId.DEAL_DAMAGE
      ) {
        const n = eff.args?.[0] ?? 1;
        addResource(produced, ResourceId.LIFE, n);
      }
      if (eff.action === ActionId.GAIN_LIFE) {
        addToMap(produced, keyOf(KeyKind.EVENT, EventId.LIFE_GAIN), 1);
      }
    }
  }

  if (treasureCreated && !createdTreasure) {
    addResource(produced, ResourceId.TREASURE, 1, "effect");
  }
  if (clueCreated && !createdClue) {
    addResource(produced, ResourceId.CLUE, 1, "effect");
  }
  if (bloodCreated && !createdBlood) {
    addResource(produced, ResourceId.BLOOD, 1, "effect");
  }

  return { produced, consumed };
}

export function mergeProfiles(
  profiles: Array<{ produced: Map<number, SemanticProfileEntry>; consumed: Map<number, SemanticProfileEntry> }>
): { produced: Map<number, SemanticProfileEntry>; consumed: Map<number, SemanticProfileEntry> } {
  const produced = new Map<number, SemanticProfileEntry>();
  const consumed = new Map<number, SemanticProfileEntry>();
  for (const profile of profiles) {
    for (const [key, value] of profile.produced.entries()) {
      addToMap(produced, key, value.count, value.origin);
    }
    for (const [key, value] of profile.consumed.entries()) {
      addToMap(consumed, key, value.count, value.origin);
    }
  }
  return { produced, consumed };
}

function nameFromEnum<T extends Record<string, string | number>>(e: T, id: number): string | null {
  const value = (e as Record<number, string>)[id];
  return typeof value === "string" ? value : null;
}

export function explainKey(key: number): string {
  const kind = (key >> 16) & 0xffff;
  const id = key & 0xffff;
  if (kind === KeyKind.EVENT) {
    return `EVENT:${nameFromEnum(EventId, id) ?? "UNKNOWN"}`;
  }
  if (kind === KeyKind.ACTION) {
    return `ACTION:${nameFromEnum(ActionId, id) ?? "UNKNOWN"}`;
  }
  if (kind === KeyKind.RESOURCE) {
    return `RESOURCE:${nameFromEnum(ResourceId, id) ?? "UNKNOWN"}`;
  }
  return "UNKNOWN";
}

export function explainKeyHuman(key: number): string {
  const raw = explainKey(key);
  if (raw === "UNKNOWN") return "Unknown";
  const [prefix, rest] = raw.split(":");
  if (!prefix || !rest) return "Unknown";
  if (prefix === "EVENT") {
    if (rest === "CAST_SPELL") return "Lanzas instantáneo o conjuro (experimental)";
    if (rest === "DRAW_EXTRA_CARD_TURN") {
      return "Robas cartas adicionales en el turno (experimental)";
    }
    return `Event · ${rest}`;
  }
  if (prefix === "ACTION") return `Action · ${rest}`;
  if (prefix === "RESOURCE") return `Resource · ${rest}`;
  return "Unknown";
}
