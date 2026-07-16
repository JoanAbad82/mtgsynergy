import { lookupCard } from "../cards/lookup";
import type { CardSynergyCandidateCard } from "../card_synergy_explorer/types";
import type { SemanticCardIR } from "../semantic/contract";
import { normalizeOracleTextV1 } from "../semantic/normalize";
import { parseSemanticIrV0 } from "../semantic/parser/sem_parser_v1";
import {
  buildSemanticEdges,
  type SemanticEdge,
  type SemanticEdgeReason,
} from "../semantic/overlay/sem_edges";
import type {
  CandidateAnchorSemanticConnection,
  CandidateAnchorSemanticConnectionBuildResult,
  CandidateAnchorSemanticDegradation,
  DeckContextAnchor,
} from "./types";
import {
  MAX_EDGES_PER_PAIR,
  MAX_EVALUATED_PAIRS,
  MAX_REASONS_PER_CONNECTION,
} from "./types";

const normalizeName = (value: string): string =>
  value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const candidateKey = (candidate: CardSynergyCandidateCard): string =>
  candidate.oracleId?.trim()
    ? `oracle:${candidate.oracleId.trim()}`
    : `name:${normalizeName(candidate.name)}`;

function reasonIdentity(reason: SemanticEdgeReason): string {
  return String(reason.key);
}

function bindPairCardId(baseIr: SemanticCardIR, cardId: number): SemanticCardIR {
  return { ...baseIr, card_id: cardId };
}

function dedupeReasons(edges: readonly SemanticEdge[]): SemanticEdgeReason[] {
  const map = new Map<string, SemanticEdgeReason>();
  for (const edge of edges) {
    for (const reason of edge.reasons ?? []) {
      const key = reasonIdentity(reason);
      const existing = map.get(key);
      if (!existing || reason.weight > existing.weight) map.set(key, reason);
    }
  }
  return [...map.values()]
    .sort((a, b) => a.key - b.key)
    .slice(0, MAX_REASONS_PER_CONNECTION);
}

export async function buildCandidateAnchorSemanticConnections(input: {
  candidate: CardSynergyCandidateCard;
  anchors: readonly DeckContextAnchor[];
  baseUrl?: string;
  lookupCardFn?: typeof lookupCard;
}): Promise<CandidateAnchorSemanticConnectionBuildResult> {
  const degradations: CandidateAnchorSemanticDegradation[] = [];
  const connections: CandidateAnchorSemanticConnection[] = [];
  const irCache = new Map<string, SemanticCardIR>();
  let candidateLocalEvidenceCount = 0;
  let anchorLocalEvidenceCount = 0;

  const cKey = candidateKey(input.candidate);
  let candidateOracle = input.candidate.oracleText?.trim() ?? "";
  let candidateType = input.candidate.typeLine?.trim() ?? "";
  let candidateName = input.candidate.name;

  const resolveCard = input.lookupCardFn ?? lookupCard;

  if (!candidateOracle || !candidateType) {
    const record = await resolveCard(input.candidate.name, input.baseUrl);
    candidateOracle ||= record?.oracle_text?.trim() ?? "";
    candidateType ||= record?.type_line?.trim() ?? "";
    candidateName = record?.name ?? candidateName;
  }

  if (!candidateOracle) {
    return {
      connections: [],
      degradations: [{ candidateKey: cKey, reason: "missing_candidate_oracle" }],
      candidateLocalEvidenceCount: 0,
      anchorLocalEvidenceCount: 0,
      evaluatedAnchorCount: 0,
    };
  }
  if (!candidateType) {
    return {
      connections: [],
      degradations: [{ candidateKey: cKey, reason: "missing_candidate_type_line" }],
      candidateLocalEvidenceCount: 0,
      anchorLocalEvidenceCount: 0,
      evaluatedAnchorCount: 0,
    };
  }

  const candidateBase = parseSemanticIrV0({
    name: candidateName,
    type_line: candidateType,
    oracle_text: normalizeOracleTextV1(candidateOracle),
  });
  irCache.set(cKey, candidateBase);

  const anchors = [...input.anchors].slice(0, 8);
  const maxPairs = Math.min(anchors.length, MAX_EVALUATED_PAIRS);

  for (const anchor of anchors.slice(0, maxPairs)) {
    let anchorOracle = anchor.oracleText?.trim() ?? "";
    let anchorType = anchor.typeLine?.trim() ?? "";

    if (!anchorOracle || !anchorType) {
      const anchorRecord = await resolveCard(
        anchor.nameNorm || anchor.name,
        input.baseUrl,
      );
      anchorOracle ||= anchorRecord?.oracle_text?.trim() ?? "";
      anchorType ||= anchorRecord?.type_line?.trim() ?? "";
    }

    const aKey = anchor.key;

    if (!anchorOracle) {
      degradations.push({
        candidateKey: cKey,
        anchorKey: aKey,
        reason: "missing_anchor_oracle",
      });
      continue;
    }
    if (!anchorType) {
      degradations.push({
        candidateKey: cKey,
        anchorKey: aKey,
        reason: "missing_anchor_type_line",
      });
      continue;
    }

    let anchorBase = irCache.get(aKey);
    if (!anchorBase) {
      anchorBase = parseSemanticIrV0({
        name: anchor.name,
        type_line: anchorType,
        oracle_text: normalizeOracleTextV1(anchorOracle),
      });
      irCache.set(aKey, anchorBase);
    }

    const candidatePairIr = bindPairCardId(candidateBase, 1);
    const anchorPairIr = bindPairCardId(anchorBase, 2);
    const edges = buildSemanticEdges([
      {
        card_id: 1,
        ir: candidatePairIr,
        oracle_text: normalizeOracleTextV1(candidateOracle),
      },
      {
        card_id: 2,
        ir: anchorPairIr,
        oracle_text: normalizeOracleTextV1(anchorOracle),
      },
    ]);

    candidateLocalEvidenceCount += edges.filter(
      (edge) => edge.from === 1 && edge.to === 1,
    ).length;
    anchorLocalEvidenceCount += edges.filter(
      (edge) => edge.from === 2 && edge.to === 2,
    ).length;

    const cToA = edges
      .filter((edge) => edge.from === 1 && edge.to === 2)
      .slice(0, MAX_EDGES_PER_PAIR);
    const aToC = edges
      .filter((edge) => edge.from === 2 && edge.to === 1)
      .slice(0, MAX_EDGES_PER_PAIR);
    const cross = [...cToA, ...aToC];

    if (cross.length === 0) {
      degradations.push({
        candidateKey: cKey,
        anchorKey: aKey,
        reason: "no_cross_edge",
      });
      continue;
    }

    connections.push({
      candidateKey: cKey,
      anchorKey: aKey,
      candidateName,
      anchorName: anchor.name,
      directions: [
        ...cToA.map((edge) => ({
          direction: "candidate_to_anchor" as const,
          from: edge.from,
          to: edge.to,
          score: edge.score,
          reasons: edge.reasons,
          localOnly: edge.local_only === true,
        })),
        ...aToC.map((edge) => ({
          direction: "anchor_to_candidate" as const,
          from: edge.from,
          to: edge.to,
          score: edge.score,
          reasons: edge.reasons,
          localOnly: edge.local_only === true,
        })),
      ],
      primaryScore: Math.max(...cross.map((edge) => edge.score)),
      reasons: dedupeReasons(cross),
      bidirectional: cToA.length > 0 && aToC.length > 0,
    });
  }

  return {
    connections: connections.sort(
      (a, b) =>
        b.primaryScore - a.primaryScore ||
        a.anchorKey.localeCompare(b.anchorKey),
    ),
    degradations,
    candidateLocalEvidenceCount,
    anchorLocalEvidenceCount,
    evaluatedAnchorCount: anchors.length,
  };
}
