import { describe, expect, it } from "vitest";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

describe("semantic parser v1 normalization", () => {
  it("ignores parenthetical reminder text in oracle text", () => {
    const base = {
      name: "Test Card",
      type_line: "Sorcery",
    };
    const withParens = parseSemanticIrV0({
      ...base,
      oracle_text: "Deal 3 damage (this is reminder text) to any target.",
    });
    const withoutParens = parseSemanticIrV0({
      ...base,
      oracle_text: "Deal 3 damage to any target.",
    });
    expect(withParens).toEqual(withoutParens);
  });
});
