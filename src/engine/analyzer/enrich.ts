import type { CardEntry, Role } from "../domain/types";
import type { CardFeatures, CardRecordMin } from "../cards/types";
import { getCardsIndexCount, lookupCard } from "../cards/lookup";
import { extractFeatures } from "../cards/features";

export type Issue = {
  code: "TAGGING_ACTIVE" | "TAGGING_NO_MATCHES" | "TAGGING_UNAVAILABLE";
  severity: "info" | "warning";
  message: string;
};

export type EnrichResult = {
  entries: CardEntry[];
  issues_added: Issue[];
  taggingActive: boolean;
};

type EnrichOptions = { enable?: boolean; baseUrl?: string };

type EnrichedEntry = CardEntry & { features?: CardFeatures };

function normalizeRoleHeuristicText(text?: string): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isExplicitCastInstantOrSorceryDamagePayoff(text?: string): boolean {
  const t = normalizeRoleHeuristicText(text);
  const watchesCastInstantOrSorcery =
    /\b(?:when|whenever)\s+you\s+cast\s+an?\s+instant\s+or\s+sorcery\s+spell\b/.test(t);
  const watchesCastNoncreature =
    /\b(?:when|whenever)\s+you\s+cast\s+an?\s+noncreature\s+spell\b/.test(t);
  const dealsDamage = /\bdeals?\b[\s\S]{0,80}\bdamage\b/.test(t);
  return (watchesCastInstantOrSorcery || watchesCastNoncreature) && dealsDamage;
}

function inferRole(features: CardFeatures, oracleText?: string): Role {
  if (features.types.includes("Land")) return "LAND";
  if (features.produces_mana) return "RAMP";
  if (features.draws_cards) return "DRAW";
  if (isExplicitCastInstantOrSorceryDamagePayoff(oracleText)) return "PAYOFF";
  if (features.removes) return "REMOVAL";
  if (features.protects) return "PROTECTION";
  if (
    features.is_anthem ||
    features.cares_about_spells ||
    features.recurs_from_graveyard ||
    features.tutors
  )
    return "ENGINE";
  if (
    features.is_creature &&
    features.is_low_cmc_creature &&
    (features.has_haste || features.has_prowess || features.creates_tokens)
  )
    return "PAYOFF";
  if (features.is_creature && features.cmc_bucket >= 3) return "PAYOFF";
  return "UTILITY";
}

export const __testing = { inferRole };

function applyFeatures(entry: CardEntry, features: CardFeatures, oracleText?: string): EnrichedEntry {
  const enriched: EnrichedEntry = { ...entry, role_primary: inferRole(features, oracleText) };
  enriched.features = features;
  return enriched;
}

export async function enrichEntriesWithCardIndex(
  entries: CardEntry[],
  opts?: EnrichOptions,
): Promise<EnrichResult> {
  if (opts?.enable === false)
    return { entries, issues_added: [], taggingActive: false };

  const issues_added: Issue[] = [];
  const enriched: CardEntry[] = [];
  let matches = 0;
  let indexedCount: number | null = null;

  try {
    for (const entry of entries) {
      const card: CardRecordMin | null = await lookupCard(
        entry.name_norm,
        opts?.baseUrl,
      );
      if (card) {
        matches += 1;
        const features = extractFeatures(card);
        enriched.push(applyFeatures(entry, features, card.oracle_text ?? undefined));
      } else {
        enriched.push({ ...entry });
      }
    }
    try {
      indexedCount = await getCardsIndexCount(opts?.baseUrl);
    } catch {
      indexedCount = null;
    }
  } catch {
    return {
      entries,
      issues_added: [
        {
          code: "TAGGING_UNAVAILABLE",
          severity: "warning",
          message: "Cards index unavailable; roles default to UTILITY.",
        },
      ],
      taggingActive: false,
    };
  }

  const countSuffix =
    typeof indexedCount === "number"
      ? ` cards indexed count: ${indexedCount}`
      : "";

  if (matches > 0) {
    issues_added.push({
      code: "TAGGING_ACTIVE",
      severity: "info",
      message: `Cards index loaded; roles inferred.${countSuffix}`,
    });
  } else {
    issues_added.push({
      code: "TAGGING_NO_MATCHES",
      severity: "warning",
      message: `Cards index available but no cards matched.${countSuffix}`,
    });
  }

  return { entries: enriched, issues_added, taggingActive: matches > 0 };
}
