import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../cards/normalize";
import { ActionId, EventId } from "../semantic/contract";
import { normalizeOracleTextV1 } from "../semantic/normalize";
import { parseSemanticIrV0 } from "../semantic/parser/sem_parser_v1";
import { buildSemanticEdges } from "../semantic/overlay/sem_edges";
import { computeSemanticOverlayFromDeckEntries } from "../semantic/overlay/sem_overlay_compute";
import { explainKeyHuman, KeyKind, keyOf } from "../semantic/overlay/sem_profile";

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

function drawSecondLabelFromEdge(edge: { reasons: Array<{ key: number }> }, drawSecondKey: number): string {
  const reasonKeys = edge.reasons.map((reason) => reason.key);
  return explainKeyHuman(drawSecondKey, reasonKeys);
}

describe("semantic draw-second to damage overlay visibility min v1", () => {
  it("shows specific damage label and promotes draw-second->damage bridge in edgesTop without breaking token branch", async () => {
    const drawSecondKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
    const damageLabelRegex = /segunda carta.*haces daño/i;
    const tokenLabelRegex = /segunda carta.*ficha/i;

    const entries = buildDeckEntries();
    const overlay = await computeSemanticOverlayFromDeckEntries(entries, lookupLocal);

    const { cards, idToName } = buildCardInputs();
    const allEdges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const baseTop = allEdges.slice(0, 10);

    const isDrawSecondDamageEdge = (edge: { local_only?: boolean; reasons: Array<{ key: number }> }) =>
      !!edge.local_only && hasReason(edge, drawSecondKey) && hasReason(edge, dealDamageKey);
    const isDrawSecondTokenEdge = (edge: { local_only?: boolean; reasons: Array<{ key: number }> }) =>
      !!edge.local_only && hasReason(edge, drawSecondKey) && hasReason(edge, createTokenKey);

    const damageEdges = allEdges.filter(isDrawSecondDamageEdge);
    expect(damageEdges.length).toBe(1);
    expect(idToName[damageEdges[0].from]).toBe("Irencrag Pyromancer");
    expect(drawSecondLabelFromEdge(damageEdges[0], drawSecondKey)).toMatch(damageLabelRegex);

    expect(baseTop.some(isDrawSecondDamageEdge)).toBe(false);
    const promotedDamage = overlay.edgesTop.filter(isDrawSecondDamageEdge);
    expect(promotedDamage.length).toBe(1);
    expect(overlay.idToName[promotedDamage[0].from]).toBe("Irencrag Pyromancer");

    const allianceCardId = Number(
      Object.entries(idToName).find(([, name]) => name === "Improbable Alliance")?.[0] ?? 0,
    );
    const allianceTokenEdge = allEdges.find(
      (edge) => edge.from === allianceCardId && edge.to === allianceCardId && isDrawSecondTokenEdge(edge),
    );
    expect(allianceTokenEdge).toBeDefined();
    expect(drawSecondLabelFromEdge(allianceTokenEdge!, drawSecondKey)).toMatch(tokenLabelRegex);

    expect(overlay.edgesTop.some((edge) => isDrawSecondTokenEdge(edge))).toBe(true);

    const vandalLabels = allEdges
      .filter((edge) => idToName[edge.from] === "Faerie Vandal" && edge.from === edge.to)
      .map((edge) => drawSecondLabelFromEdge(edge, drawSecondKey));
    const jolraelLabels = allEdges
      .filter((edge) => idToName[edge.from] === "Jolrael, Mwonvuli Recluse" && edge.from === edge.to)
      .map((edge) => drawSecondLabelFromEdge(edge, drawSecondKey));

    expect(vandalLabels.some((label) => damageLabelRegex.test(label))).toBe(false);
    expect(jolraelLabels.some((label) => damageLabelRegex.test(label))).toBe(false);
  });
});
