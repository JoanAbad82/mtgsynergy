import { describe, expect, test } from "vitest";
import type { CardRecordMin } from "../cards/types";
import { extractFeatures } from "../cards/features";
import { __testing } from "../analyzer/enrich";

function makeCard(
  name: string,
  type_line: string,
  oracle_text: string,
  cmc: number,
): CardRecordMin {
  return {
    oracle_id: name,
    name,
    name_norm: name.toLowerCase(),
    type_line,
    oracle_text,
    cmc,
  };
}

describe("aggro features + roles", () => {
  test("Monastery Swiftspear => PAYOFF", () => {
    const card = makeCard(
      "Monastery Swiftspear",
      "Creature — Human Monk",
      "Prowess",
      1,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features)).toBe("PAYOFF");
  });

  test("Phoenix Chick => PAYOFF", () => {
    const card = makeCard(
      "Phoenix Chick",
      "Creature — Phoenix",
      "Flying, haste",
      1,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features)).toBe("PAYOFF");
  });

  test("Anthem effect => ENGINE", () => {
    const card = makeCard(
      "Glorious Anthem",
      "Enchantment",
      "Creatures you control get +1/+1.",
      3,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features)).toBe("ENGINE");
  });

  test("vanilla 1-drop => UTILITY", () => {
    const card = makeCard("Grizzly", "Creature — Bear", "", 1);
    const features = extractFeatures(card);
    expect(__testing.inferRole(features)).toBe("UTILITY");
  });
});
