import { describe, expect, it } from "vitest";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticCardProfile, KeyKind, keyOf } from "../overlay/sem_profile";
import { ResourceId } from "../contract";

type TokenCase = {
  label: string;
  resourceId: ResourceId;
};

const cases: TokenCase[] = [
  { label: "Treasure", resourceId: ResourceId.TREASURE },
  { label: "Clue", resourceId: ResourceId.CLUE },
  { label: "Blood", resourceId: ResourceId.BLOOD },
];

describe("semantic overlay token resources", () => {
  for (const entry of cases) {
    it(`conecta ${entry.label} producer → consumer`, () => {
      const producerText = `Create a ${entry.label} token.`;
      const consumerText = `Sacrifice a ${entry.label}: Draw a card.`;

      const producerIr = parseSemanticIrV0({
        name: `${entry.label} Producer`,
        oracle_text: producerText,
        type_line: "Artifact",
      });
      producerIr.card_id = 1;
      const consumerIr = parseSemanticIrV0({
        name: `${entry.label} Consumer`,
        oracle_text: consumerText,
        type_line: "Creature",
      });
      consumerIr.card_id = 2;

      const producerProfile = buildSemanticCardProfile(producerIr, producerText);
      const consumerProfile = buildSemanticCardProfile(consumerIr, consumerText);

      const resKey = keyOf(KeyKind.RESOURCE, entry.resourceId);
      const produced = producerProfile.produced.get(resKey);
      const consumed = consumerProfile.consumed.get(resKey);

      expect(produced?.origin).toBe("effect");
      expect(consumed?.origin).toBe("cost");

      const edges = buildSemanticEdges([
        { card_id: producerIr.card_id, ir: producerIr, oracle_text: producerText },
        { card_id: consumerIr.card_id, ir: consumerIr, oracle_text: consumerText },
      ]);

      expect(edges.length).toBeGreaterThan(0);
      const hasResourceEdge = edges.some((edge) =>
        edge.reasons.some((reason) => reason.key === resKey),
      );
      expect(hasResourceEdge).toBe(true);
    });
  }
});
