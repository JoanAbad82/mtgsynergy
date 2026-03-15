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

describe("enrich roles draw-second matters min v1", () => {
  test("Improbable Alliance draw-second token trigger is ENGINE", () => {
    const card = makeCard(
      "Improbable Alliance",
      "Enchantment",
      "Whenever you draw your second card each turn, create a 1/1 blue Faerie creature token with flying.",
      2,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).toBe("ENGINE");
  });

  test("Jolrael, Mwonvuli Recluse draw-second token trigger is ENGINE", () => {
    const card = makeCard(
      "Jolrael, Mwonvuli Recluse",
      "Legendary Creature — Human Druid",
      "Whenever you draw your second card each turn, create a 2/2 green Cat creature token.",
      2,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).toBe("ENGINE");
  });

  test("Irencrag Pyromancer draw-second damage trigger is PAYOFF", () => {
    const card = makeCard(
      "Irencrag Pyromancer",
      "Creature — Human Wizard",
      "Whenever you draw your second card each turn, Irencrag Pyromancer deals 3 damage to any target.",
      3,
    );
    const features = extractFeatures(card);
    expect(__testing.inferRole(features, card.oracle_text)).toBe("PAYOFF");
  });

  test("Faerie Vandal draw-second without token/damage is neither ENGINE nor PAYOFF", () => {
    const card = makeCard(
      "Faerie Vandal",
      "Creature — Faerie Rogue",
      "Whenever you draw your second card each turn, put a +1/+1 counter on Faerie Vandal.",
      2,
    );
    const features = extractFeatures(card);
    const role = __testing.inferRole(features, card.oracle_text);
    expect(role).not.toBe("ENGINE");
    expect(role).not.toBe("PAYOFF");
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

  test("Young Pyromancer remains ENGINE and not PAYOFF", () => {
    const card = makeCard(
      "Young Pyromancer",
      "Creature — Human Shaman",
      "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
      2,
    );
    const features = extractFeatures(card);
    const role = __testing.inferRole(features, card.oracle_text);
    expect(role).toBe("ENGINE");
    expect(role).not.toBe("PAYOFF");
  });
});
