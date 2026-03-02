import { describe, expect, it } from "vitest";
import { EventId } from "../contract";
import { buildSemanticEdges } from "../overlay/sem_edges";
import type { SemanticCardIR } from "../contract";
import { KeyKind, keyOf, type SemanticProfileEntry } from "../overlay/sem_profile";

type Profile = {
  produced: Map<number, SemanticProfileEntry>;
  consumed: Map<number, SemanticProfileEntry>;
};

function makeIr(card_id: number): SemanticCardIR {
  return { card_id, frames: [] };
}

function makeProfile(input: { produced?: "cost" | "effect"; consumed?: "cost" | "effect" }): Profile {
  const key = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
  const produced = new Map<number, SemanticProfileEntry>();
  const consumed = new Map<number, SemanticProfileEntry>();
  if (input.produced) {
    produced.set(key, { count: 1, origin: input.produced });
  }
  if (input.consumed) {
    consumed.set(key, { count: 1, origin: input.consumed });
  }
  return {
    produced,
    consumed,
  };
}

describe("semantic edges origin filter", () => {
  it("no crea edge cuando cost-cost", () => {
    const cards = [
      { card_id: 1, ir: makeIr(1), profile: makeProfile({ produced: "cost" }) } as any,
      { card_id: 2, ir: makeIr(2), profile: makeProfile({ consumed: "cost" }) } as any,
    ];
    const edges = buildSemanticEdges(cards);
    expect(edges.length).toBe(0);
  });

  it("crea edge cuando cost-effect", () => {
    const cards = [
      { card_id: 1, ir: makeIr(1), profile: makeProfile({ produced: "cost" }) } as any,
      { card_id: 2, ir: makeIr(2), profile: makeProfile({ consumed: "effect" }) } as any,
    ];
    const edges = buildSemanticEdges(cards);
    expect(edges.length).toBe(1);
  });

  it("crea edge cuando effect-effect", () => {
    const cards = [
      { card_id: 1, ir: makeIr(1), profile: makeProfile({ produced: "effect" }) } as any,
      { card_id: 2, ir: makeIr(2), profile: makeProfile({ consumed: "effect" }) } as any,
    ];
    const edges = buildSemanticEdges(cards);
    expect(edges.length).toBe(1);
  });
});
