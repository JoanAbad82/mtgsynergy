import { describe, expect, it } from "vitest";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticCardProfile, KeyKind, keyOf } from "../overlay/sem_profile";
import { ResourceId } from "../contract";

describe("semantic resource normalization", () => {
  it("normaliza TOKEN_TREASURE a TREASURE sin perder origin", () => {
    const producerText = "Create a Treasure token.";
    const consumerText = "Sacrifice a Treasure: Draw a card.";

    const producerIr = parseSemanticIrV0({
      name: "Treasure Producer",
      oracle_text: producerText,
      type_line: "Artifact",
    });
    producerIr.card_id = 1;
    const consumerIr = parseSemanticIrV0({
      name: "Treasure Consumer",
      oracle_text: consumerText,
      type_line: "Creature",
    });
    consumerIr.card_id = 2;

    const producerProfile = buildSemanticCardProfile(producerIr, producerText);
    const consumerProfile = buildSemanticCardProfile(consumerIr, consumerText);

    const canonicalKey = keyOf(KeyKind.RESOURCE, ResourceId.TREASURE);
    const tokenKey = keyOf(KeyKind.RESOURCE, ResourceId.TOKEN_TREASURE);

    expect(producerProfile.produced.has(canonicalKey)).toBe(true);
    expect(producerProfile.produced.has(tokenKey)).toBe(false);
    expect(producerProfile.produced.get(canonicalKey)?.origin).toBe("effect");

    expect(consumerProfile.consumed.has(canonicalKey)).toBe(true);
    expect(consumerProfile.consumed.get(canonicalKey)?.origin).toBe("cost");

    const edges = buildSemanticEdges([
      { card_id: producerIr.card_id, ir: producerIr, oracle_text: producerText },
      { card_id: consumerIr.card_id, ir: consumerIr, oracle_text: consumerText },
    ]);

    const hasTreasureEdge = edges.some((edge) =>
      edge.reasons.some((reason) => reason.key === canonicalKey),
    );
    expect(hasTreasureEdge).toBe(true);
  });
});
