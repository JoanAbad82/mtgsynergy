import { describe, expect, test } from "vitest";
import type { CardRecordMin } from "../cards/types";

const REQUIRED_KEYS = ["type_line", "oracle_text", "cmc"] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

function assertHasRequired(obj: Record<string, unknown>): asserts obj is Record<RequiredKey, unknown> {
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) {
      throw new Error(`Missing required key: ${key}`);
    }
  }
}

describe("cards index contract", () => {
  test("CardRecordMin includes required keys", () => {
    const card: CardRecordMin = {
      oracle_id: "x",
      name: "Test",
      name_norm: "test",
      type_line: "Instant",
      oracle_text: "Do something",
      cmc: 2,
    };
    expect(() => assertHasRequired(card as Record<string, unknown>)).not.toThrow();
  });

  test("missing oracle_text fails", () => {
    const bad = {
      oracle_id: "x",
      name: "Test",
      name_norm: "test",
      type_line: "Instant",
      cmc: 2,
    } as Record<string, unknown>;
    expect(() => assertHasRequired(bad)).toThrow();
  });
});
