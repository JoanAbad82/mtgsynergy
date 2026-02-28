import { describe, expect, it } from "vitest";
import { EventId } from "../contract";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

describe("semantic parser v1: dies detection", () => {
  it("detects dies in trigger clauses with and without parentheses", () => {
    const base = {
      name: "Test Card",
      type_line: "Creature",
    };
    const withParens = parseSemanticIrV0({
      ...base,
      oracle_text: "Whenever a creature you control dies, (this is reminder text) you draw a card.",
    });
    const withoutParens = parseSemanticIrV0({
      ...base,
      oracle_text: "Whenever a creature you control dies, you draw a card.",
    });

    expect(withParens).toEqual(withoutParens);
    expect(withoutParens.frames[0]?.watch.some((w) => w.id === EventId.CREATURE_DIES)).toBe(true);
  });
});
