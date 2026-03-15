import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../cards/normalize";
import { ActionId, EventId } from "../semantic/contract";
import { normalizeOracleTextV1 } from "../semantic/normalize";
import { parseSemanticIrV0 } from "../semantic/parser/sem_parser_v1";
import { buildSemanticEdges } from "../semantic/overlay/sem_edges";
import { computeSemanticOverlayFromDeckEntries } from "../semantic/overlay/sem_overlay_compute";
import { KeyKind, keyOf } from "../semantic/overlay/sem_profile";

type CardRecordMin = {
  name: string;
  name_norm: string;
  oracle_text?: string | null;
  type_line?: string | null;
};

type CardFixture = { oracle_text: string; type_line?: string | null };

const cardCatalog: Record<string, CardFixture> = {
  "Token Maker A": { oracle_text: "Create a 1/1 white Soldier creature token." },
  "Token Maker B": { oracle_text: "Create a 1/1 white Soldier creature token." },
  "Token Maker C": { oracle_text: "Create a 1/1 white Soldier creature token." },
  "Token Maker D": { oracle_text: "Create a 1/1 white Soldier creature token." },
  "ETB Listener A": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "ETB Listener B": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "ETB Listener C": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "ETB Listener D": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "Improbable Alliance": {
    oracle_text:
      "Whenever you draw your second card each turn, create a 1/1 blue Faerie creature token with flying.",
  },
  "Jolrael, Mwonvuli Recluse": {
    oracle_text:
      "Whenever you draw your second card each turn, create a 2/2 green Cat creature token.",
  },
  "Faerie Vandal": {
    oracle_text:
      "Whenever you draw your second card each turn, put a +1/+1 counter on Faerie Vandal.",
  },
  "Irencrag Pyromancer": {
    oracle_text:
      "Whenever you draw your second card each turn, Irencrag Pyromancer deals 3 damage to any target.",
  },
  Guttersnipe: {
    oracle_text:
      "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
  },
  "Dies Payoff Single": { oracle_text: "Whenever a creature dies, target player loses 1 life." },
  "Dies Payoff Multi": {
    oracle_text:
      "Whenever a creature dies, it deals 1 damage to any target and you gain 1 life.",
  },
};

function lookupLocal(name: string): Promise<CardRecordMin | null> {
  const card = cardCatalog[name];
  if (!card) return Promise.resolve(null);
  return Promise.resolve({
    name,
    name_norm: normalizeCardName(name),
    oracle_text: card.oracle_text,
    type_line: card.type_line ?? null,
  });
}

function buildDeckEntries(): Array<{ name: string }> {
  return Object.keys(cardCatalog).map((name) => ({ name }));
}

function buildCardInputs() {
  const ordered = Object.keys(cardCatalog)
    .map((name) => ({ name, ...cardCatalog[name] }))
    .sort((a, b) => normalizeCardName(a.name).localeCompare(normalizeCardName(b.name)));

  const idToName: Record<number, string> = {};
  const cards = ordered.map((card, index) => {
    const oracleText = normalizeOracleTextV1(card.oracle_text ?? "");
    const ir = parseSemanticIrV0({
      name: card.name,
      oracle_text: oracleText,
      type_line: card.type_line ?? null,
    });
    const card_id = index + 1;
    ir.card_id = card_id;
    idToName[card_id] = card.name;
    return { card_id, ir, oracle_text: oracleText };
  });

  return { cards, idToName };
}

function hasReason(edge: { reasons: Array<{ key: number }> }, key: number): boolean {
  return edge.reasons.some((reason) => reason.key === key);
}

describe("semantic overlay draw-second token edgesTop prominence min v1", () => {
  it("promotes one local draw-second->token edge into edgesTop without promoting generic local_only edges", async () => {
    const drawSecondKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);

    const entries = buildDeckEntries();
    const result = await computeSemanticOverlayFromDeckEntries(entries, lookupLocal);
    const topNames = (edge: { from: number }) => result.idToName[edge.from];

    const { cards, idToName } = buildCardInputs();
    const allEdges = buildSemanticEdges(cards);
    const baseTop = allEdges.slice(0, 10);

    const drawSecondTokenPattern = (edge: { local_only?: boolean; reasons: Array<{ key: number }> }) =>
      !!edge.local_only && hasReason(edge, drawSecondKey) && hasReason(edge, createTokenKey);
    const genericCastSpellDamagePattern = (edge: {
      local_only?: boolean;
      reasons: Array<{ key: number }>;
    }) => !!edge.local_only && hasReason(edge, castSpellKey) && hasReason(edge, dealDamageKey);

    const localDrawSecondCandidates = allEdges.filter(drawSecondTokenPattern);
    const localDrawSecondCandidateNames = localDrawSecondCandidates.map((edge) => idToName[edge.from]);

    expect(localDrawSecondCandidates.length).toBeGreaterThanOrEqual(2);
    expect(localDrawSecondCandidateNames).toContain("Improbable Alliance");
    expect(localDrawSecondCandidateNames).toContain("Jolrael, Mwonvuli Recluse");
    expect(localDrawSecondCandidateNames).not.toContain("Faerie Vandal");
    expect(localDrawSecondCandidateNames).not.toContain("Irencrag Pyromancer");

    expect(baseTop.some(drawSecondTokenPattern)).toBe(false);
    const promotedDrawSecond = result.edgesTop.filter(drawSecondTokenPattern);
    expect(promotedDrawSecond.length).toBe(1);
    expect(["Improbable Alliance", "Jolrael, Mwonvuli Recluse"]).toContain(topNames(promotedDrawSecond[0]));

    expect(allEdges.some(genericCastSpellDamagePattern)).toBe(true);
    expect(result.edgesTop.some(genericCastSpellDamagePattern)).toBe(false);
  });
});
