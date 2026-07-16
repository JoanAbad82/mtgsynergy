import type { CardRecordMin } from "../cards/types";

const normalizeText = (value: unknown): string =>
  typeof value === "string"
    ? value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";

const stripReminderText = (value: string): string => value.replace(/\([^)]*\)/g, " ");

const includesAny = (value: string, patterns: readonly RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(value));

const GENERIC_TOKENS = new Set([
  "a",
  "an",
  "and",
  "any",
  "as",
  "at",
  "battlefield",
  "card",
  "cards",
  "cast",
  "creature",
  "each",
  "for",
  "from",
  "into",
  "mana",
  "may",
  "of",
  "on",
  "or",
  "spell",
  "spells",
  "target",
  "the",
  "to",
  "when",
  "whenever",
  "you",
  "your",
]);

const SEED_FILTER_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "card", "cards", "each", "for", "from",
  "has", "have", "if", "in", "into", "is", "it", "of", "on", "or",
  "other", "put", "that", "the", "then", "this", "to", "up", "with",
  "you", "your",
]);

const WEAK_PATTERNS = [
  /\bactivate only as a sorcery\b/,
  /\bany time you could cast a sorcery\b/,
  /\btarget\b/,
  /\bcreature\b/,
  /\bspell\b/,
  /\bmana\b/,
  /\bbattlefield\b/,
] as const;

const REAL_PAYOFF_PATTERNS = [
  /\bwhenever you cast an instant or sorcery spell\b/,
  /\bwhenever you cast or copy an instant or sorcery spell\b/,
  /\bwhenever you cast a noncreature spell\b/,
  /\bwhenever you cast your second spell\b/,
  /\bwhenever you cast an? .{0,28}spell\b/,
  /\bmagecraft\b/,
  /\bprowess\b/,
] as const;

const INSTANT_SORCERY_PATTERNS = [
  /\binstant or sorcery\b/,
  /\binstant and sorcery\b/,
  /\binstant, sorcery\b/,
] as const;

const TOKEN_PATTERNS = [
  /\bcreate[s]? .* token\b/,
  /\btoken\b/,
] as const;

const DAMAGE_PATTERNS = [
  /\bdeals? \d+ damage\b/,
  /\bloses? \d+ life\b/,
] as const;

const MANA_PAYOFF_PATTERNS = [
  /\badd[s]? [^{.]*mana\b/,
  /\btreasure token\b/,
  /\btreasure\b/,
] as const;

const COPY_PATTERNS = [
  /\bcopy target instant or sorcery\b/,
  /\bcopy .*spell\b/,
] as const;

const DRAW_PATTERNS = [
  /\bdraw (a|one|two|\d+) cards?\b/,
  /\blook at the top\b/,
] as const;

const featurePreparationCounters = {
  candidate: 0,
  candidateSemanticText: 0,
  candidateLexical: 0,
  anchorLexical: 0,
  hotPathCandidateSemanticTextFallback: 0,
  hotPathCandidateNormalization: 0,
  hotPathCandidateSetReconstruction: 0,
};

const rankingCounters = {
  corpusPass: 0,
  fullSort: 0,
  topK: 0,
};

export type DeckContextCandidateRankingSeed = {
  name: string;
  oracleId?: string;
  oracle_id?: string;
  typeLine?: string | null;
  type_line?: string | null;
  oracleText?: string | null;
  oracle_text?: string | null;
  keywords?: readonly string[] | null;
};

export interface RankedDeckContextCardRecord {
  record: CardRecordMin;
  score: number;
  sourceIndex: number;
  reasons: readonly string[];
}

type SemanticFeatures = {
  realPayoff: boolean;
  instantSorcery: boolean;
  noncreatureSpell: boolean;
  tokenPayoff: boolean;
  damagePayoff: boolean;
  eachOpponentDamage: boolean;
  manaPayoff: boolean;
  copyPayoff: boolean;
  drawPayoff: boolean;
  prowess: boolean;
  magecraft: boolean;
  castTrigger: boolean;
  weakOnly: boolean;
  contentTokens: Set<string>;
};

type PreparedDeckContextSemanticText = {
  readonly text: string;
  readonly reminder: string;
  readonly typeLine: string;
  readonly keywords: string;
};

export type PreparedDeckContextLexicalFilterTokens = readonly string[];

export interface PreparedDeckContextCandidateRecord {
  record: CardRecordMin;
  sourceIndex: number;
  features: SemanticFeatures;
  lexicalFilterTokens: PreparedDeckContextLexicalFilterTokens;
  semanticText?: PreparedDeckContextSemanticText;
}

export interface PreparedDeckContextCandidateCorpus {
  records: readonly PreparedDeckContextCandidateRecord[];
}

function semanticText(input: DeckContextCandidateRankingSeed | CardRecordMin): PreparedDeckContextSemanticText {
  const oracle =
    "oracleText" in input && typeof input.oracleText === "string"
      ? input.oracleText
      : "oracle_text" in input && typeof input.oracle_text === "string"
        ? input.oracle_text
        : "";
  const normalizedOracle = normalizeText(oracle);
  const typeLine =
    "typeLine" in input && typeof input.typeLine === "string"
      ? input.typeLine
      : "type_line" in input && typeof input.type_line === "string"
        ? input.type_line
        : "";
  const keywordText = Array.isArray(input.keywords) ? input.keywords.join(" ") : "";
  return {
    text: stripReminderText(normalizedOracle),
    reminder: normalizedOracle,
    typeLine: normalizeText(typeLine),
    keywords: normalizeText(keywordText),
  };
}

function collectContentTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const token of text.replace(/[^a-z0-9]+/g, " ").split(/\s+/)) {
    if (token.length < 4 || /^\d+$/.test(token) || GENERIC_TOKENS.has(token)) {
      continue;
    }
    tokens.add(token);
  }
  return tokens;
}

function normalizeFilterToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function collectFilterTokens(value: unknown, target: Set<string>): void {
  if (typeof value === "string") {
    for (const token of normalizeFilterToken(value).split(/\s+/)) {
      if (
        token.length >= 3 &&
        !SEED_FILTER_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token)
      ) {
        target.add(token);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFilterTokens(item, target);
    }
  }
}

function freezeSortedFilterTokens(tokens: Set<string>): PreparedDeckContextLexicalFilterTokens {
  return Object.freeze([...tokens].sort());
}

function extractCandidateLexicalFilterTokens(
  record: CardRecordMin,
): PreparedDeckContextLexicalFilterTokens {
  featurePreparationCounters.candidateLexical += 1;
  const tokens = new Set<string>();
  collectFilterTokens(record.name, tokens);
  collectFilterTokens(record.type_line, tokens);
  collectFilterTokens(record.oracle_text, tokens);
  collectFilterTokens(record.keywords, tokens);
  return freezeSortedFilterTokens(tokens);
}

export function prepareDeckContextAnchorLexicalFilterTokens(
  seed: DeckContextCandidateRankingSeed,
): ReadonlySet<string> | undefined {
  featurePreparationCounters.anchorLexical += 1;
  const tokens = new Set<string>();
  collectFilterTokens(seed.name, tokens);
  collectFilterTokens(seed.typeLine, tokens);
  collectFilterTokens(seed.oracleText, tokens);

  if (tokens.size === 0) {
    return undefined;
  }

  return tokens;
}

export function doesPreparedDeckContextLexicalFilterMatch(
  candidateTokens: PreparedDeckContextLexicalFilterTokens,
  anchorTokens: ReadonlySet<string>,
): boolean {
  for (const token of candidateTokens) {
    if (anchorTokens.has(token)) {
      return true;
    }
  }
  return false;
}

function extractFeaturesFromSemanticText(parts: PreparedDeckContextSemanticText): SemanticFeatures {
  const main = `${parts.text} ${parts.keywords}`;
  const all = `${main} ${parts.typeLine}`;
  const realPayoff = includesAny(main, REAL_PAYOFF_PATTERNS);
  const instantSorcery = includesAny(main, INSTANT_SORCERY_PATTERNS);
  const noncreatureSpell = /\bnoncreature spell\b/.test(main);
  const tokenPayoff = includesAny(main, TOKEN_PATTERNS);
  const damagePayoff = includesAny(main, DAMAGE_PATTERNS);
  const eachOpponentDamage =
    damagePayoff && (/\beach opponent\b/.test(main) || /\beach player\b/.test(main));
  const manaPayoff = includesAny(main, MANA_PAYOFF_PATTERNS);
  const copyPayoff = includesAny(main, COPY_PATTERNS);
  const drawPayoff = includesAny(main, DRAW_PATTERNS);
  const prowess = /\bprowess\b/.test(main);
  const magecraft = /\bmagecraft\b/.test(main);
  const castTrigger = /\bwhenever you cast\b/.test(main) || /\bwhen you cast\b/.test(main);
  const reminderHasOnlySignal =
    !realPayoff &&
    (includesAny(parts.reminder, REAL_PAYOFF_PATTERNS) ||
      includesAny(parts.reminder, INSTANT_SORCERY_PATTERNS));
  const weakHits = WEAK_PATTERNS.filter((pattern) => pattern.test(all)).length;

  return {
    realPayoff,
    instantSorcery,
    noncreatureSpell,
    tokenPayoff,
    damagePayoff,
    eachOpponentDamage,
    manaPayoff,
    copyPayoff,
    drawPayoff,
    prowess,
    magecraft,
    castTrigger,
    weakOnly: reminderHasOnlySignal || (!realPayoff && weakHits >= 3),
    contentTokens: collectContentTokens(main),
  };
}

function extractFeatures(input: DeckContextCandidateRankingSeed | CardRecordMin): SemanticFeatures {
  return extractFeaturesFromSemanticText(semanticText(input));
}

function extractCandidateFeatures(record: CardRecordMin): SemanticFeatures {
  featurePreparationCounters.candidate += 1;
  return extractFeatures(record);
}

function extractPreparedCandidateSemanticText(record: CardRecordMin): PreparedDeckContextSemanticText {
  featurePreparationCounters.candidateSemanticText += 1;
  return semanticText(record);
}

function extractCandidateFeaturesFromPreparedSemanticText(
  parts: PreparedDeckContextSemanticText,
): SemanticFeatures {
  featurePreparationCounters.candidate += 1;
  return extractFeaturesFromSemanticText(parts);
}

function overlapCount(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const token of left) {
    if (right.has(token)) {
      count += 1;
    }
  }
  return count;
}

function compareRankedRecords(
  left: RankedDeckContextCardRecord,
  right: RankedDeckContextCardRecord,
): number {
  return (
    right.score - left.score ||
    left.record.name.localeCompare(right.record.name) ||
    (left.record.oracle_id ?? "").localeCompare(right.record.oracle_id ?? "")
  );
}

function scorePreparedRecord(
  seedFeatures: SemanticFeatures,
  prepared: PreparedDeckContextCandidateRecord,
): RankedDeckContextCardRecord {
  const { record, sourceIndex, features } = prepared;
  const reasons: string[] = [];
  let score = 0;

  if (features.realPayoff) {
    score += 35;
    reasons.push("real-payoff");
  }
  if (seedFeatures.realPayoff && features.realPayoff) {
    score += 25;
    reasons.push("shared-cast-payoff");
  }
  if (seedFeatures.instantSorcery && features.instantSorcery) {
    score += 20;
    reasons.push("instant-sorcery-overlap");
  }
  if (seedFeatures.instantSorcery && features.noncreatureSpell) {
    score += 16;
    reasons.push("noncreature-spell-payoff-compatible");
  }
  if (seedFeatures.castTrigger && features.castTrigger) {
    score += 18;
    reasons.push("cast-trigger-overlap");
  }
  if (seedFeatures.tokenPayoff && features.tokenPayoff) {
    score += 16;
    reasons.push("token-payoff-overlap");
  }
  if (seedFeatures.instantSorcery && features.castTrigger && features.tokenPayoff) {
    score += 18;
    reasons.push("spells-to-token-engine");
  }
  if (seedFeatures.damagePayoff && features.damagePayoff) {
    score += 14;
    reasons.push("damage-payoff-overlap");
  }
  if (seedFeatures.damagePayoff && features.castTrigger && features.eachOpponentDamage) {
    score += 22;
    reasons.push("spells-to-opponent-damage");
  }
  if (seedFeatures.manaPayoff && features.manaPayoff) {
    score += 14;
    reasons.push("mana-payoff-overlap");
  }
  if (seedFeatures.instantSorcery && features.castTrigger && features.manaPayoff) {
    score += 16;
    reasons.push("spells-to-mana-engine");
  }
  if (seedFeatures.copyPayoff && features.copyPayoff) {
    score += 12;
    reasons.push("copy-overlap");
  }
  if (seedFeatures.drawPayoff && features.drawPayoff) {
    score += 10;
    reasons.push("draw-overlap");
  }
  if ((seedFeatures.prowess || seedFeatures.magecraft) && (features.prowess || features.magecraft)) {
    score += 12;
    reasons.push("prowess-magecraft-overlap");
  }

  const tokenOverlap = overlapCount(seedFeatures.contentTokens, features.contentTokens);
  if (tokenOverlap > 0) {
    score += Math.min(12, tokenOverlap * 3);
    reasons.push("content-token-overlap");
  }

  if (!features.realPayoff && !features.castTrigger && !features.instantSorcery) {
    score -= 12;
    reasons.push("generic-only-penalty");
  }
  if (features.weakOnly) {
    score -= 20;
    reasons.push("weak-lexical-penalty");
  }
  const candidateSemanticText = prepared.semanticText ?? semanticText(record);
  if (!prepared.semanticText) {
    featurePreparationCounters.hotPathCandidateSemanticTextFallback += 1;
  }
  if (/\bactivate only as a sorcery\b/.test(candidateSemanticText.text)) {
    score -= 10;
    reasons.push("sorcery-speed-reminder-penalty");
  }
  if (/^a-/.test(normalizeText(record.name))) {
    score -= 18;
    reasons.push("digital-rebalanced-variant-penalty");
  }

  return { record, score, sourceIndex, reasons };
}

function isPreparedDeckContextPreRankingEligibleForFeatures(
  seedFeatures: SemanticFeatures,
  prepared: PreparedDeckContextCandidateRecord,
): boolean {
  if (!seedFeatures.realPayoff && !seedFeatures.instantSorcery && !seedFeatures.castTrigger) {
    return true;
  }

  const features = prepared.features;
  return (
    features.realPayoff ||
    features.instantSorcery ||
    features.noncreatureSpell ||
    features.prowess ||
    features.magecraft ||
    (features.castTrigger &&
      (features.tokenPayoff ||
        features.damagePayoff ||
        features.manaPayoff ||
        features.copyPayoff ||
        features.drawPayoff))
  );
}

function keepTopK(target: RankedDeckContextCardRecord[], item: RankedDeckContextCardRecord, limit: number): void {
  if (limit <= 0) {
    return;
  }
  if (target.length < limit) {
    target.push(item);
    return;
  }

  let worstIndex = 0;
  for (let index = 1; index < target.length; index += 1) {
    if (compareRankedRecords(target[worstIndex], target[index]) < 0) {
      worstIndex = index;
    }
  }
  if (compareRankedRecords(item, target[worstIndex]) < 0) {
    target[worstIndex] = item;
  }
}

export function rankDeckContextCandidateRecords(
  seed: DeckContextCandidateRankingSeed,
  records: readonly CardRecordMin[],
): readonly RankedDeckContextCardRecord[] {
  return rankPreparedDeckContextCandidateRecords(
    seed,
    prepareDeckContextCandidateFeatureCorpus(records),
  );
}

export function prepareDeckContextCandidateFeatureCorpus(
  records: readonly CardRecordMin[],
): PreparedDeckContextCandidateCorpus {
  return {
    records: records.map((record, sourceIndex) => {
      const preparedSemanticText = extractPreparedCandidateSemanticText(record);
      return {
        record,
        sourceIndex,
        features: extractCandidateFeaturesFromPreparedSemanticText(preparedSemanticText),
        lexicalFilterTokens: extractCandidateLexicalFilterTokens(record),
        semanticText: preparedSemanticText,
      };
    }),
  };
}

export function rankPreparedDeckContextCandidateRecords(
  seed: DeckContextCandidateRankingSeed,
  corpus: PreparedDeckContextCandidateCorpus | readonly PreparedDeckContextCandidateRecord[],
): readonly RankedDeckContextCardRecord[] {
  const seedFeatures = extractFeatures(seed);
  const preparedRecords = Array.isArray(corpus) ? corpus : corpus.records;
  rankingCounters.fullSort += 1;
  return preparedRecords
    .map((prepared) => scorePreparedRecord(seedFeatures, prepared))
    .sort(compareRankedRecords);
}

export interface DeckContextTopKRankingRequest {
  key: string;
  seed: DeckContextCandidateRankingSeed;
  limit: number;
  recordFilter?: (record: CardRecordMin) => boolean;
  preparedRecordFilter?: (prepared: PreparedDeckContextCandidateRecord) => boolean;
}

export function rankPreparedDeckContextCandidateRecordsForSeedsTopK(
  requests: readonly DeckContextTopKRankingRequest[],
  corpus: PreparedDeckContextCandidateCorpus | readonly PreparedDeckContextCandidateRecord[],
): ReadonlyMap<string, readonly RankedDeckContextCardRecord[]> {
  rankingCounters.corpusPass += 1;
  rankingCounters.topK += 1;
  const preparedRecords = Array.isArray(corpus) ? corpus : corpus.records;
  const states = requests.map((request) => ({
    request,
    seedFeatures: extractFeatures(request.seed),
    eligibleCount: 0,
    eligibleTopK: [] as RankedDeckContextCardRecord[],
    fallbackTopK: [] as RankedDeckContextCardRecord[],
  }));

  for (const prepared of preparedRecords) {
    for (const state of states) {
      const { request } = state;
      if (
        request.limit <= 0 ||
        (request.preparedRecordFilter && !request.preparedRecordFilter(prepared)) ||
        (request.recordFilter && !request.recordFilter(prepared.record))
      ) {
        continue;
      }

      const ranked = scorePreparedRecord(state.seedFeatures, prepared);
      keepTopK(state.fallbackTopK, ranked, request.limit);
      if (isPreparedDeckContextPreRankingEligibleForFeatures(state.seedFeatures, prepared)) {
        state.eligibleCount += 1;
        keepTopK(state.eligibleTopK, ranked, request.limit);
      }
    }
  }

  const result = new Map<string, readonly RankedDeckContextCardRecord[]>();
  for (const state of states) {
    const selected =
      state.eligibleCount >= state.request.limit ? state.eligibleTopK : state.fallbackTopK;
    result.set(state.request.key, selected.sort(compareRankedRecords));
  }
  return result;
}

export function isPreparedDeckContextPreRankingEligible(
  seed: DeckContextCandidateRankingSeed,
  prepared: PreparedDeckContextCandidateRecord,
): boolean {
  return isPreparedDeckContextPreRankingEligibleForFeatures(extractFeatures(seed), prepared);
}

export function isDeckContextPreRankingEligible(
  seed: DeckContextCandidateRankingSeed,
  record: CardRecordMin,
): boolean {
  const seedFeatures = extractFeatures(seed);
  if (!seedFeatures.realPayoff && !seedFeatures.instantSorcery && !seedFeatures.castTrigger) {
    return true;
  }

  const features = extractFeatures(record);
  return (
    features.realPayoff ||
    features.instantSorcery ||
    features.noncreatureSpell ||
    features.prowess ||
    features.magecraft ||
    (features.castTrigger &&
      (features.tokenPayoff ||
        features.damagePayoff ||
        features.manaPayoff ||
        features.copyPayoff ||
        features.drawPayoff))
  );
}

function resetFeaturePreparationCounters() {
  featurePreparationCounters.candidate = 0;
  featurePreparationCounters.candidateSemanticText = 0;
  featurePreparationCounters.candidateLexical = 0;
  featurePreparationCounters.anchorLexical = 0;
  featurePreparationCounters.hotPathCandidateSemanticTextFallback = 0;
  featurePreparationCounters.hotPathCandidateNormalization = 0;
  featurePreparationCounters.hotPathCandidateSetReconstruction = 0;
  rankingCounters.corpusPass = 0;
  rankingCounters.fullSort = 0;
  rankingCounters.topK = 0;
}

function getFeaturePreparationCounters() {
  return { ...featurePreparationCounters, ...rankingCounters };
}

export const __testing = {
  getFeaturePreparationCounters,
  resetFeaturePreparationCounters,
};
