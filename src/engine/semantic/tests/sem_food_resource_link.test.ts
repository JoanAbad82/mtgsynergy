import { describe, expect, it } from "vitest";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticCardProfile, KeyKind, keyOf } from "../overlay/sem_profile";
import { ResourceId } from "../contract";

describe("semantic overlay food resource", () => {
  it("conecta productor de Food con consumidor por coste", () => {
    const producerText = "Create a Food token.";
    const consumerText = "Sacrifice a Food: Return Cauldron Familiar from your graveyard to the battlefield.";

    const producerIr = parseSemanticIrV0({
      name: "Food Producer",
      oracle_text: producerText,
      type_line: "Artifact",
    });
    producerIr.card_id = 1;
    const consumerIr = parseSemanticIrV0({
      name: "Food Consumer",
      oracle_text: consumerText,
      type_line: "Creature",
    });
    consumerIr.card_id = 2;

    const producerProfile = buildSemanticCardProfile(producerIr, producerText);
    const consumerProfile = buildSemanticCardProfile(consumerIr, consumerText);

    const foodKey = keyOf(KeyKind.RESOURCE, ResourceId.FOOD);
    const producedFood = producerProfile.produced.get(foodKey);
    const consumedFood = consumerProfile.consumed.get(foodKey);

    expect(producedFood?.origin).toBe("effect");
    expect(consumedFood?.origin).toBe("cost");

    const edges = buildSemanticEdges([
      { card_id: producerIr.card_id, ir: producerIr, oracle_text: producerText },
      { card_id: consumerIr.card_id, ir: consumerIr, oracle_text: consumerText },
    ]);

    expect(edges.length).toBeGreaterThan(0);
    const hasFoodEdge = edges.some((edge) =>
      edge.reasons.some((reason) => reason.key === foodKey),
    );
    expect(hasFoodEdge).toBe(true);
  });
});
