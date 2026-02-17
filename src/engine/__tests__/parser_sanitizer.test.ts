import { describe, expect, test } from "vitest";
import { parseMtgaExport } from "../parser";

describe("parser sanitizer", () => {
  test("parses set + collector suffix", () => {
    const result = parseMtgaExport("4 Mishra's Foundry (BRO) 265");
    const entry = result.deck.entries[0];
    expect(entry.name_norm).toBe("mishra's foundry");
    expect(entry.count).toBe(4);
    expect(result.issues.find((i) => i.code === "LINE_UNPARSEABLE")).toBeUndefined();
  });

  test("parses bullet line", () => {
    const result = parseMtgaExport("• 4 Lightning Strike");
    const entry = result.deck.entries[0];
    expect(entry.name_norm).toBe("lightning strike");
    expect(entry.count).toBe(4);
  });

  test("ignores empty after sanitize", () => {
    const result = parseMtgaExport("(BRO) 265");
    expect(result.deck.entries.length).toBe(0);
    expect(result.issues.find((i) => i.code === "LINE_UNPARSEABLE")).toBeUndefined();
  });
});
