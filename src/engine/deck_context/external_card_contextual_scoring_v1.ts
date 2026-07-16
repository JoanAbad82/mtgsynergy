import type {
  CandidateAnchorSemanticConnection,
  DeckContextCandidateScore,
  RetrievedDeckContextCandidate,
} from "./types";

export function scoreDeckContextCandidate(input: {
  candidate: RetrievedDeckContextCandidate;
  connections: readonly CandidateAnchorSemanticConnection[];
  hasIncompleteEvidence?: boolean;
}): DeckContextCandidateScore {
  const connected = [...new Set(input.connections.map((row) => row.anchorKey))];
  const reasons = new Map<number, { key: number; weight: number }>();
  for (const connection of input.connections) {
    for (const reason of connection.reasons) {
      const current = reasons.get(reason.key);
      if (!current || reason.weight > current.weight) reasons.set(reason.key, reason);
    }
  }

  const strength = Math.min(
    40,
    Math.round(
      (Math.max(0, ...input.connections.map((row) => row.primaryScore)) / 100) * 40,
    ),
  );
  const connectedScore = Math.min(20, connected.length * 7);
  const reasonScore = Math.min(15, reasons.size * 4);
  const directionalDiversity = input.connections.some((row) => row.bidirectional) ? 10 : 5;
  const repeatedSupport = connected.length >= 2 ? 10 : 0;
  const coverage = input.hasIncompleteEvidence ? 0 : 5;

  let contextualScore =
    strength + connectedScore + reasonScore + directionalDiversity + repeatedSupport + coverage;

  if (connected.length === 1 && strength < 20) contextualScore -= 20;
  if (input.hasIncompleteEvidence) contextualScore -= 15;
  contextualScore = Math.max(0, Math.min(100, Math.round(contextualScore)));

  const evidenceLevel =
    connected.length >= 3 && reasons.size >= 3 && !input.hasIncompleteEvidence
      ? "high"
      : connected.length >= 2 || (strength >= 25 && reasons.size >= 2)
        ? "medium"
        : input.connections.length > 0
          ? "limited"
          : "inconclusive";

  return {
    candidate: input.candidate,
    contextualScore,
    connectedDeckCardCount: connected.length,
    relatedDeckCards: input.connections
      .sort((a, b) => b.primaryScore - a.primaryScore)
      .slice(0, 5)
      .map((row) => ({
        key: row.anchorKey,
        name: row.anchorName,
        score: row.primaryScore,
      })),
    reasons: [...reasons.values()].sort((a, b) => a.key - b.key).slice(0, 6),
    evidenceLevel,
    warnings: [
      "Compatibilidad semántica; legalidad de formato no verificada.",
      "No evalúa rendimiento competitivo ni implica que la carta deba añadirse.",
    ],
  };
}
