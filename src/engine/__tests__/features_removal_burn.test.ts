import { describe, expect, test } from "vitest";
import type { CardRecordMin } from "../cards/types";
import { extractFeatures } from "../cards/features";

function makeCard(oracle_text: string): CardRecordMin {
  return {
    oracle_id: "x",
    name: "Test",
    name_norm: "test",
    type_line: "Instant",
    oracle_text,
    cmc: 2,
  };
}

describe("extractFeatures removal burn", () => {
  test("Lightning Strike is removal", () => {
    const card = makeCard("Lightning Strike deals 3 damage to any target.");
    expect(extractFeatures(card).removes).toBe(true);
  });

  test("Play with Fire is removal", () => {
    const card = makeCard(
      "Play with Fire deals 2 damage to any target. If a player is dealt damage this way, scry 1.",
    );
    const features = extractFeatures(card);
    expect(features.removes).toBe(true);
  });

  test("non-removal text remains false", () => {
    const card = makeCard("Gain 3 life. Scry 1.");
    expect(extractFeatures(card).removes).toBe(false);
  });
});
