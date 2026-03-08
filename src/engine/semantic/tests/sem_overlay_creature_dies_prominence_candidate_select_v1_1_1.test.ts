import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";
import { explainKey } from "../overlay/sem_profile";

type CardRecordMin = {
  name: string;
  name_norm: string;
  oracle_text?: string | null;
  type_line?: string | null;
};

type CardFixture = { oracle_text: string; type_line?: string | null };

const cardCatalog: Record<string, CardFixture> = {
  "Token Maker A": { oracle_text: "Create a 1/1 Soldier token." },
  "Token Maker B": { oracle_text: "Create a 1/1 Soldier token." },
  "Token Maker C": { oracle_text: "Create a 1/1 Soldier token." },
  "Token Maker D": { oracle_text: "Create a 1/1 Soldier token." },
  "ETB Listener A": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "ETB Listener B": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "ETB Listener C": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "ETB Listener D": { oracle_text: "Whenever a creature enters the battlefield, you gain 1 life." },
  "Dies Payoff Single": { oracle_text: "Whenever a creature dies, target player loses 1 life." },
  "Dies Payoff Multi": { oracle_text: "Whenever a creature dies, it deals 1 damage to any target and you gain 1 life." },
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

function edgeHasReason(edge: { reasons: Array<{ key: number }> }, label: string): boolean {
  return edge.reasons.some((reason) => explainKey(reason.key).includes(label));
}

describe("semantic overlay creature dies prominence candidate select v1.1.1", () => {
  it("selects the best local CREATURE_DIES candidate among multiple eligible edges", async () => {
    const entries = buildDeckEntries();
    const result = await computeSemanticOverlayFromDeckEntries(entries, lookupLocal);

    const topLocalDies = result.edgesTop.filter(
      (edge) => edge.local_only && edgeHasReason(edge, "EVENT:CREATURE_DIES"),
    );

    expect(topLocalDies.length).toBe(1);

    const chosen = topLocalDies[0];
    const chosenName = result.idToName[chosen.from];

    expect(chosenName).toBe("Dies Payoff Multi");
    expect(edgeHasReason(chosen, "ACTION:DEAL_DAMAGE")).toBe(true);
    expect(edgeHasReason(chosen, "ACTION:GAIN_LIFE")).toBe(true);

    const { cards, idToName } = buildCardInputs();
    const allEdges = buildSemanticEdges(cards);
    const localDiesEdges = allEdges.filter(
      (edge) => edge.local_only && edgeHasReason(edge, "EVENT:CREATURE_DIES"),
    );
    const localDiesNames = localDiesEdges.map((edge) => idToName[edge.from]);

    expect(localDiesEdges.length).toBeGreaterThanOrEqual(2);
    expect(localDiesNames).toContain("Dies Payoff Single");
    expect(localDiesNames).toContain("Dies Payoff Multi");
  });
});
