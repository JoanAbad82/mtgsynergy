import { ActionId, CostId, EventId, FrameKind, ResourceId, TokenKindId } from "../contract";
import type { SemanticCardIR } from "../contract";

export enum KeyKind {
  EVENT = 1,
  ACTION = 2,
  RESOURCE = 3,
}

export function keyOf(kind: KeyKind, id: number): number {
  return (kind << 16) | id;
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

function addToMap(map: Map<number, number>, key: number, delta: number): void {
  const next = (map.get(key) ?? 0) + delta;
  map.set(key, next);
}

export function buildSemanticCardProfile(
  ir: SemanticCardIR
): { produced: Map<number, number>; consumed: Map<number, number> } {
  const produced = new Map<number, number>();
  const consumed = new Map<number, number>();

  for (const frame of ir.frames) {
    if (frame.kind === FrameKind.SPELL) {
      addToMap(produced, keyOf(KeyKind.EVENT, EventId.CAST_SPELL), 1);
    }
    for (const watch of frame.watch) {
      addToMap(consumed, keyOf(KeyKind.EVENT, watch.id), 1);
    }
    if (frame.cost.some((cost) => cost.cost === CostId.SACRIFICE_AS_COST)) {
      addToMap(produced, keyOf(KeyKind.EVENT, EventId.SACRIFICE), 1);
    }
    for (const cost of frame.cost) {
      if (cost.res !== undefined) {
        addToMap(consumed, keyOf(KeyKind.RESOURCE, cost.res), cost.n ?? 1);
      }
    }

    for (const eff of frame.do) {
      addToMap(produced, keyOf(KeyKind.ACTION, eff.action), 1);
      if (eff.action === ActionId.CREATE_TOKEN && eff.tokenData) {
        const res = tokenResourceFromKind(eff.tokenData.kind);
        addToMap(produced, keyOf(KeyKind.RESOURCE, res), eff.tokenData.n ?? 1);
        addToMap(produced, keyOf(KeyKind.EVENT, EventId.TOKEN_CREATED), 1);
        if (tokenIsCreature(eff.tokenData.kind)) {
          addToMap(produced, keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD), 1);
        }
      }
      if (eff.action === ActionId.DRAW_CARDS || eff.action === ActionId.DISCARD_CARDS) {
        const n = eff.args?.[0] ?? 1;
        addToMap(produced, keyOf(KeyKind.RESOURCE, ResourceId.CARD), n);
      }
      if (eff.action === ActionId.DRAW_CARDS) {
        addToMap(produced, keyOf(KeyKind.EVENT, EventId.DRAW_SECOND_CARD_TURN), 1);
      }
      if (
        eff.action === ActionId.GAIN_LIFE ||
        eff.action === ActionId.LOSE_LIFE ||
        eff.action === ActionId.DEAL_DAMAGE
      ) {
        const n = eff.args?.[0] ?? 1;
        addToMap(produced, keyOf(KeyKind.RESOURCE, ResourceId.LIFE), n);
      }
      if (eff.action === ActionId.GAIN_LIFE) {
        addToMap(produced, keyOf(KeyKind.EVENT, EventId.LIFE_GAIN), 1);
      }
    }
  }

  return { produced, consumed };
}

export function mergeProfiles(
  profiles: Array<{ produced: Map<number, number>; consumed: Map<number, number> }>
): { produced: Map<number, number>; consumed: Map<number, number> } {
  const produced = new Map<number, number>();
  const consumed = new Map<number, number>();
  for (const profile of profiles) {
    for (const [key, value] of profile.produced.entries()) {
      addToMap(produced, key, value);
    }
    for (const [key, value] of profile.consumed.entries()) {
      addToMap(consumed, key, value);
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
    if (rest === "DRAW_SECOND_CARD_TURN") return "Robas la segunda carta del turno (experimental)";
    return `Event · ${rest}`;
  }
  if (prefix === "ACTION") return `Action · ${rest}`;
  if (prefix === "RESOURCE") return `Resource · ${rest}`;
  return "Unknown";
}
