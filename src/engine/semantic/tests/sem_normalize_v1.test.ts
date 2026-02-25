import { describe, expect, it } from "vitest";
import { isIdempotentV1, normalizeOracleTextV1 } from "../normalize";

describe("semantic normalize v1", () => {
  it("replaces unicode quotes and dashes", () => {
    const input = "“Life—‘gain’”";
    expect(normalizeOracleTextV1(input)).toBe("\"Life-'gain'\"");
  });

  it("removes parenthetical text", () => {
    const input = "Deal 3 damage (reminder text) to any target (another clause)";
    expect(normalizeOracleTextV1(input)).toBe("Deal 3 damage to any target");
  });

  it("collapses whitespace", () => {
    const input = "  A\n\nB\t C   ";
    expect(normalizeOracleTextV1(input)).toBe("A B C");
  });

  it("is idempotent", () => {
    const input = "  “Draw a card” (reminder)  ";
    expect(isIdempotentV1(input)).toBe(true);
    const once = normalizeOracleTextV1(input);
    expect(normalizeOracleTextV1(once)).toBe(once);
  });

  it("returns empty for nullish input", () => {
    expect(normalizeOracleTextV1(undefined as unknown as string)).toBe("");
    expect(normalizeOracleTextV1(null as unknown as string)).toBe("");
  });
});
