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

describe("enrich roles cast spell token engine", () => {
  test("Young Pyromancer cast instant or sorcery token trigger is ENGINE", () => {
    const card = makeCard(
      "Young Pyromancer",
      "Creature — Human Shaman",
      "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
      2,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).toBe("ENGINE");
  });

  test("Third Path Iconoclast cast noncreature token trigger is ENGINE and not PAYOFF", () => {
    const card = makeCard(
      "Third Path Iconoclast",
      "Creature — Human Monk",
      "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.",
      2,
    );
    const features = extractFeatures(card);
    const role = __testing.inferRole(features, card.oracle_text);
    expect(role).toBe("ENGINE");
    expect(role).not.toBe("PAYOFF");
  });

  test("Monastery Mentor cast noncreature token trigger is ENGINE", () => {
    const card = makeCard(
      "Monastery Mentor",
      "Creature — Human Monk",
      "Whenever you cast a noncreature spell, create a 1/1 white Monk creature token with prowess.",
      3,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).toBe("ENGINE");
  });

  test("Guttersnipe remains PAYOFF and not ENGINE", () => {
    const card = makeCard(
      "Guttersnipe",
      "Creature — Goblin Shaman",
      "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      3,
    );
    const features = extractFeatures(card);
    const role = __testing.inferRole(features, card.oracle_text);
    expect(role).toBe("PAYOFF");
    expect(role).not.toBe("ENGINE");
  });

  test("Firebrand Archer remains PAYOFF and not ENGINE", () => {
    const card = makeCard(
      "Firebrand Archer",
      "Creature — Human Archer",
      "Whenever you cast a noncreature spell, Firebrand Archer deals 1 damage to each opponent.",
      2,
    );
    const features = extractFeatures(card);
    const role = __testing.inferRole(features, card.oracle_text);
    expect(role).toBe("PAYOFF");
    expect(role).not.toBe("ENGINE");
  });

  test("Kiln Fiend does not become ENGINE", () => {
    const card = makeCard(
      "Kiln Fiend",
      "Creature — Elemental Beast",
      "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      2,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).not.toBe("ENGINE");
  });
});
