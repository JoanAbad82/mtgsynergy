import { describe, expect, it } from "vitest";
import { ActionId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, keyOf } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type CardInput = {
  card_id: number;
  name: string;
  ir: ReturnType<typeof parseSemanticIrV0>;
  oracle_text: string;
};

function buildCardsFromLiterals(rows: Array<{ name: string; oracle_text: string }>): CardInput[] {
  return rows.map((row, index) => {
    const oracleText = normalizeOracleTextV1(row.oracle_text);
    const ir = parseSemanticIrV0({ name: row.name, oracle_text: oracleText, type_line: null });
    const card_id = index + 1;
    ir.card_id = card_id;
    return { card_id, name: row.name, ir, oracle_text: oracleText };
  });
}

function findDealDamageLoseLifeLocalEdge(edges: ReturnType<typeof buildSemanticEdges>, cardId: number) {
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === dealDamageKey) &&
      edge.reasons.some((reason) => reason.key === loseLifeKey),
  );
}

describe("semantic overlay prevent damage no-damage-event guard min v1", () => {
  it("suppresses damage-occurred local closure for explicit prevention wording while preserving non-prevention damage closures", () => {
    const cards = buildCardsFromLiterals([
      {
        name: "Prevent Damage Anchor",
        oracle_text: "Prevent the next time a source of your choice would deal 3 damage to target player this turn.",
      },
      {
        name: "Control Damage",
        oracle_text: "Control Damage deals 3 damage to target player.",
      },
      {
        name: "Guardrail Not Prevention",
        oracle_text: "Guardrail Not Prevention deals 3 damage to target player. Damage can't be prevented this turn.",
      },
    ]);

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });

    const preventAnchor = cards.find((card) => card.name === "Prevent Damage Anchor");
    const controlDamage = cards.find((card) => card.name === "Control Damage");
    const guardrailNotPrevention = cards.find((card) => card.name === "Guardrail Not Prevention");

    expect(preventAnchor).toBeTruthy();
    expect(controlDamage).toBeTruthy();
    expect(guardrailNotPrevention).toBeTruthy();

    const preventedEdge = findDealDamageLoseLifeLocalEdge(edges, preventAnchor!.card_id);
    const controlEdge = findDealDamageLoseLifeLocalEdge(edges, controlDamage!.card_id);
    const guardrailEdge = findDealDamageLoseLifeLocalEdge(edges, guardrailNotPrevention!.card_id);

    expect(preventedEdge).toBeUndefined();
    expect(controlEdge).toBeTruthy();
    expect(controlEdge?.local_only).toBe(true);
    expect(controlEdge?.score).toBe(0);
    expect(guardrailEdge).toBeTruthy();
    expect(guardrailEdge?.local_only).toBe(true);
    expect(guardrailEdge?.score).toBe(0);
  });
});
