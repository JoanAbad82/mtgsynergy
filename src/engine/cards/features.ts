import type { CardRecordMin, CardFeatures } from "./types";

const DRAW_RE = /\bdraw (a|two|three|four|five|six|seven|eight|nine|ten) cards?\b/i;
const REMOVE_RE = /\bdestroy target\b|\bexile target\b|\bdeals? .* damage to target creature\b/i;
const PROTECT_RE = /\bhexproof\b|\bindestructible\b|\bprotection from\b|\bprevent all damage\b/i;
const TUTOR_RE = /\bsearch your library\b/i;
const TOKEN_RE = /\bcreate\b.*\btoken\b/i;
const PRODUCE_RE = /\badd \{/i;
const PRODUCE_ALT_RE = /\badds one mana\b/i;

function cmcBucket(cmc: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!Number.isFinite(cmc) || cmc <= 0) return 0;
  if (cmc <= 1) return 1;
  if (cmc <= 2) return 2;
  if (cmc <= 3) return 3;
  if (cmc <= 4) return 4;
  return 5;
}

function parseTypes(typeLine: string | null | undefined): string[] {
  if (!typeLine) return [];
  return typeLine
    .split(/[\u2014-]/)[0]
    .split(/\s+/)
    .filter(Boolean);
}

export function extractFeatures(card: CardRecordMin): CardFeatures {
  const text = card.oracle_text ?? "";
  const typeLine = card.type_line ?? "";
  const types = parseTypes(typeLine);
  const produced = Array.isArray(card.produced_mana) && card.produced_mana.length > 0;
  const produces_mana = produced || PRODUCE_RE.test(text) || PRODUCE_ALT_RE.test(text);

  return {
    types,
    is_creature: types.includes("Creature"),
    produces_mana,
    draws_cards: DRAW_RE.test(text),
    removes: REMOVE_RE.test(text),
    protects: PROTECT_RE.test(text),
    tutors: TUTOR_RE.test(text),
    token_maker: TOKEN_RE.test(text),
    cmc_bucket: cmcBucket(card.cmc ?? 0),
  };
}
