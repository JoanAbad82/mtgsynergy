import { describe, expect, it } from "vitest";
import type { CardRecordMin } from "../../cards/types";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";
import { explainKey } from "../overlay/sem_profile";

type LocalCard = {
  name: string;
  type_line: string;
  oracle_text: string;
};

function createLocalLookup(cards: LocalCard[]) {
  const byName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
  return async (name: string): Promise<CardRecordMin | null> => {
    const found = byName.get(name.toLowerCase());
    if (!found) return null;
    return {
      name: found.name,
      name_norm: found.name.toLowerCase(),
      type_line: found.type_line,
      oracle_text: found.oracle_text,
    };
  };
}

type OverlayEdgeLabel = {
  from: string;
  to: string;
  kind: string;
};

function toDrawAddManaLabel(
  edge: { reasons: Array<{ key: number }>; local_only?: boolean },
): OverlayEdgeLabel | null {
  if (!edge.local_only) return null;
  const reasonSignals = edge.reasons.map((reason) => explainKey(reason.key));
  const hasDrawCards = reasonSignals.includes("ACTION:DRAW_CARDS");
  const hasAddMana = reasonSignals.includes("ACTION:PRODUCE_MANA");
  if (!hasDrawCards || !hasAddMana) return null;
  return {
    from: "DRAW_CARDS",
    to: "ADD_MANA",
    kind: "draw_supports_mana",
  };
}

describe("semantic overlay draw cards add mana local bridge min v1", () => {
  it("exposes DRAW_CARDS -> ADD_MANA local bridge in edgesTop for a minimal deck", async () => {
    const lookup = createLocalLookup([
      {
        name: "Draw Engine",
        type_line: "Sorcery",
        oracle_text: "Draw two cards.",
      },
      {
        name: "Mana Payoff Proxy",
        type_line: "Sorcery",
        oracle_text: "Whenever you cast a spell, draw a card, then add {R}.",
      },
    ]);

    const entries = [
      { name: "Draw Engine" },
      { name: "Mana Payoff Proxy" },
    ];

    const result = await computeSemanticOverlayFromDeckEntries(entries, lookup);
    const edgesTopLabels = result.edgesTop
      .map((edge) => toDrawAddManaLabel(edge))
      .filter((label): label is OverlayEdgeLabel => !!label);

    expect(
      edgesTopLabels.some(
        (edge) =>
          edge.from === "DRAW_CARDS" &&
          edge.to === "ADD_MANA" &&
          edge.kind === "draw_supports_mana",
      ),
    ).toBe(true);
  });
});
