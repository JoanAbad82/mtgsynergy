import type { CardEntry, Role } from "../domain/types";
import type { CardFeatures, CardRecordMin } from "../cards/types";
import { lookupCard } from "../cards/lookup";
import { extractFeatures } from "../cards/features";

export type Issue = {
  code: "TAGGING_ACTIVE" | "TAGGING_NO_MATCHES" | "TAGGING_UNAVAILABLE";
  severity: "info" | "warning";
  message: string;
};

export type EnrichResult = { entries: CardEntry[]; issues_added: Issue[] };

type EnrichOptions = { enable?: boolean; baseUrl?: string };

type EnrichedEntry = CardEntry & { features?: CardFeatures };

function inferRole(features: CardFeatures): Role {
  if (features.types.includes("Land")) return "LAND";
  if (features.produces_mana) return "RAMP";
  if (features.draws_cards) return "DRAW";
  if (features.removes) return "REMOVAL";
  if (features.protects) return "PROTECTION";
  if (features.tutors) return "ENGINE";
  if (features.is_creature && features.cmc_bucket >= 3) return "PAYOFF";
  return "UTILITY";
}

function applyFeatures(entry: CardEntry, features: CardFeatures): EnrichedEntry {
  const enriched: EnrichedEntry = { ...entry, role_primary: inferRole(features) };
  enriched.features = features;
  return enriched;
}

export async function enrichEntriesWithCardIndex(
  entries: CardEntry[],
  opts?: EnrichOptions,
): Promise<EnrichResult> {
  if (opts?.enable === false) return { entries, issues_added: [] };

  const issues_added: Issue[] = [];
  const enriched: CardEntry[] = [];
  let matches = 0;

  try {
    for (const entry of entries) {
      const card: CardRecordMin | null = await lookupCard(
        entry.name_norm,
        opts?.baseUrl,
      );
      if (card) {
        matches += 1;
        const features = extractFeatures(card);
        enriched.push(applyFeatures(entry, features));
      } else {
        enriched.push({ ...entry });
      }
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
    };
  }

  if (matches > 0) {
    issues_added.push({
      code: "TAGGING_ACTIVE",
      severity: "info",
      message: "Cards index loaded; roles inferred.",
    });
  } else {
    issues_added.push({
      code: "TAGGING_NO_MATCHES",
      severity: "warning",
      message: "Cards index available but no cards matched.",
    });
  }

  return { entries: enriched, issues_added };
}
