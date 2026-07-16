import { describe, expect, it } from "vitest";
import { scoreDeckContextCandidate } from "../deck_context";

describe("deck-context contextual scoring", () => {
  it("rewards multi-anchor evidence and remains deterministic", () => {
    const candidate = {
      identityKey: "name:test",
      card: { name: "Test Candidate" },
      retrievedByAnchors: ["a", "b"],
    };
    const connections = [
      {
        candidateKey: "name:test",
        anchorKey: "a",
        candidateName: "Test Candidate",
        anchorName: "A",
        directions: [{ direction: "candidate_to_anchor" as const, from: 1, to: 2, score: 70, reasons: [{ key: 1, weight: 1 }], localOnly: false }],
        primaryScore: 70,
        reasons: [{ key: 1, weight: 1 }],
        bidirectional: false,
      },
      {
        candidateKey: "name:test",
        anchorKey: "b",
        candidateName: "Test Candidate",
        anchorName: "B",
        directions: [{ direction: "anchor_to_candidate" as const, from: 2, to: 1, score: 65, reasons: [{ key: 2, weight: 1 }], localOnly: false }],
        primaryScore: 65,
        reasons: [{ key: 2, weight: 1 }],
        bidirectional: false,
      },
    ];
    const first = scoreDeckContextCandidate({ candidate, connections });
    const second = scoreDeckContextCandidate({ candidate, connections: [...connections].reverse() });
    expect(first.contextualScore).toBe(second.contextualScore);
    expect(first.connectedDeckCardCount).toBe(2);
    expect(first.evidenceLevel).not.toBe("inconclusive");
  });
});
