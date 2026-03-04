import type { CardRecordMin } from "../../cards/types";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticCardProfile } from "./sem_profile";

export type SemanticCoverageReasonId =
  | "NO_ORACLE"
  | "EMPTY_TEXT"
  | "NO_MATCH_V1_TEMPLATES"
  | "LAND_RULES_UNMODELED_V1"
  | "PARSE_ERROR";

export type SemanticTextTagId =
  | "ETB"
  | "DIES"
  | "SACRIFICE"
  | "DRAW"
  | "TOKEN"
  | "SPELLS";

export type SemanticCoverageReason = {
  reasonId: SemanticCoverageReasonId;
  count: number;
  examples: string[];
};

export type SemanticCoverageReport = {
  totalCardsWithOracle: number;
  coveredCards: number;
  coveragePct: number;
  reasons: SemanticCoverageReason[];
  uncoveredNonLand: Array<{ name: string; reasonId: SemanticCoverageReasonId }>;
  textTags: Array<{ tag: SemanticTextTagId; count: number }>;
};

type SemanticCoverageReportInput = {
  entries: Array<{ name: string }>;
  lookup: (name: string) => Promise<CardRecordMin | null>;
};

const TEXT_TAGS: Array<{ tag: SemanticTextTagId; pattern: RegExp }> = [
  { tag: "ETB", pattern: /\benter(?:s)? the battlefield\b/i },
  { tag: "DIES", pattern: /\bdies\b/i },
  { tag: "SACRIFICE", pattern: /\bsacrifice\b/i },
  { tag: "DRAW", pattern: /\bdraw\b/i },
  { tag: "TOKEN", pattern: /\btoken\b/i },
  { tag: "SPELLS", pattern: /\binstant\b|\bsorcery\b|\bspell\b/i },
];

function buildExamples(source: Set<string>): string[] {
  return Array.from(source)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 3);
}

export async function buildSemanticCoverageReport(
  input: SemanticCoverageReportInput,
): Promise<SemanticCoverageReport> {
  const uniqueNames = Array.from(new Set(input.entries.map((entry) => entry.name))).sort((a, b) =>
    a.localeCompare(b),
  );

  const reasons = new Map<SemanticCoverageReasonId, { count: number; examples: Set<string> }>();
  const addReason = (reasonId: SemanticCoverageReasonId, example: string) => {
    const entry = reasons.get(reasonId);
    if (entry) {
      entry.count += 1;
      entry.examples.add(example);
    } else {
      reasons.set(reasonId, { count: 1, examples: new Set([example]) });
    }
  };

  let totalCardsWithOracle = 0;
  let coveredCards = 0;
  const uncoveredNonLandRaw: Array<{ name: string; reasonId: SemanticCoverageReasonId }> = [];
  const uncoveredReasonIds = new Set<SemanticCoverageReasonId>([
    "NO_ORACLE",
    "EMPTY_TEXT",
    "NO_MATCH_V1_TEMPLATES",
    "PARSE_ERROR",
  ]);
  const recordUncoveredNonLand = (
    reasonId: SemanticCoverageReasonId,
    name: string,
    typeLine?: string | null,
  ) => {
    if (!uncoveredReasonIds.has(reasonId)) return;
    if (/\bland\b/i.test(typeLine ?? "")) return;
    uncoveredNonLandRaw.push({ name, reasonId });
  };
  const tagCounts: Record<SemanticTextTagId, number> = {
    ETB: 0,
    DIES: 0,
    SACRIFICE: 0,
    DRAW: 0,
    TOKEN: 0,
    SPELLS: 0,
  };

  for (const name of uniqueNames) {
    const card = await input.lookup(name);
    if (!card || card.oracle_text == null) {
      addReason("NO_ORACLE", name);
      recordUncoveredNonLand("NO_ORACLE", name, card?.type_line ?? null);
      continue;
    }

    totalCardsWithOracle += 1;

    const normalized = normalizeOracleTextV1(card.oracle_text ?? "");
    const trimmed = normalized.trim();
    if (!trimmed) {
      addReason("EMPTY_TEXT", card.name);
      recordUncoveredNonLand("EMPTY_TEXT", card.name, card.type_line ?? null);
      continue;
    }

    const lower = trimmed.toLowerCase();
    for (const { tag, pattern } of TEXT_TAGS) {
      if (pattern.test(lower)) {
        tagCounts[tag] += 1;
      }
    }

    try {
      const ir = parseSemanticIrV0({
        name: card.name,
        oracle_text: trimmed,
        type_line: card.type_line ?? null,
      });
      const profile = buildSemanticCardProfile(ir, trimmed);
      if (profile.produced.size > 0 || profile.consumed.size > 0) {
        coveredCards += 1;
      } else {
        const isLand = /\bland\b/i.test(card.type_line ?? "");
        const reasonId = isLand ? "LAND_RULES_UNMODELED_V1" : "NO_MATCH_V1_TEMPLATES";
        addReason(reasonId, card.name);
        recordUncoveredNonLand(reasonId, card.name, card.type_line ?? null);
      }
    } catch (err) {
      addReason("PARSE_ERROR", card.name);
      recordUncoveredNonLand("PARSE_ERROR", card.name, card.type_line ?? null);
    }
  }

  const coveragePct =
    totalCardsWithOracle > 0
      ? Math.round((coveredCards / totalCardsWithOracle) * 1000) / 10
      : 0;

  const reasonsList = Array.from(reasons.entries())
    .map(([reasonId, data]) => ({
      reasonId,
      count: data.count,
      examples: buildExamples(data.examples),
    }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.reasonId.localeCompare(b.reasonId);
    });

  const textTags = TEXT_TAGS.map(({ tag }) => ({
    tag,
    count: tagCounts[tag],
  })).filter((entry) => entry.count > 0);

  const uncoveredNonLand = Array.from(
    new Map(uncoveredNonLandRaw.map((entry) => [entry.name, entry])).values(),
  )
    .sort((a, b) => {
      const reasonCmp = a.reasonId.localeCompare(b.reasonId);
      if (reasonCmp !== 0) return reasonCmp;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);

  return {
    totalCardsWithOracle,
    coveredCards,
    coveragePct,
    reasons: reasonsList,
    uncoveredNonLand,
    textTags,
  };
}
