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

describe("enrich roles cast spell damage payoff", () => {
  test("Guttersnipe trigger with damage is PAYOFF", () => {
    const card = makeCard(
      "Guttersnipe",
      "Creature — Goblin Shaman",
      "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      3,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).toBe("PAYOFF");
  });

  test("Shock is not PAYOFF without cast trigger payoff text", () => {
    const card = makeCard(
      "Shock",
      "Instant",
      "Shock deals 2 damage to any target.",
      1,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).not.toBe("PAYOFF");
  });

  test("Kiln Fiend cast trigger without damage is not PAYOFF by this heuristic", () => {
    const card = makeCard(
      "Kiln Fiend",
      "Creature — Elemental Beast",
      "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      2,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).not.toBe("PAYOFF");
  });

  test("Firebrand Archer noncreature spell trigger with damage is PAYOFF", () => {
    const card = makeCard(
      "Firebrand Archer",
      "Creature — Human Archer",
      "Whenever you cast a noncreature spell, Firebrand Archer deals 1 damage to each opponent.",
      2,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).toBe("PAYOFF");
  });

  test("Third Path Iconoclast noncreature trigger without damage is not PAYOFF", () => {
    const card = makeCard(
      "Third Path Iconoclast",
      "Creature — Human Monk",
      "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.",
      2,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).not.toBe("PAYOFF");
  });
});
