import type { Deck, DeckState, IssueCode, Role } from "../domain/types";
import { PIPELINE_BY_ID } from "../catalog/pipelines";
import { normalizeCardName } from "../normalize/normalize";

const VALID_ROLES: Role[] = [
  "ENGINE",
  "PAYOFF",
  "RAMP",
  "DRAW",
  "REMOVAL",
  "PROTECTION",
  "LAND",
  "UTILITY",
];

export function computeTotalCards(deck: Deck): number {
  return deck.entries.reduce((sum, entry) => sum + entry.count, 0);
}

export function validateDeckState(ds: DeckState): IssueCode[] {
  const issues: IssueCode[] = [];
  const total = computeTotalCards(ds.deck);

  if (total < 60) {
    issues.push("DECK_TOO_SMALL");
  }

  for (const entry of ds.deck.entries) {
    if (!Number.isInteger(entry.count) || entry.count < 1) {
      issues.push("COUNT_INVALID");
      break;
    }
  }

  for (const entry of ds.deck.entries) {
    for (const role of entry.roles) {
      if (!VALID_ROLES.includes(role)) {
        issues.push("INVALID_ROLE");
        break;
      }
    }
  }

  const seen = new Set<string>();
  for (const entry of ds.deck.entries) {
    const norm = normalizeCardName(entry.name_norm);
    if (seen.has(norm)) {
      issues.push("DUPLICATE_ENTRY");
      break;
    }
    seen.add(norm);
  }

  if (ds.edges) {
    for (const edge of ds.edges) {
      if (edge.from === edge.to) {
        issues.push("SELF_EDGE");
        break;
      }
    }
  }

  if (ds.pipelines_active) {
    for (const id of ds.pipelines_active) {
      if (!PIPELINE_BY_ID[id]) {
        issues.push("PIPELINE_NOT_FOUND");
        break;
      }
    }
  }

  if (ds.sim) {
    if (ds.sim.turn_t !== undefined) {
      if (!Number.isInteger(ds.sim.turn_t) || ds.sim.turn_t < 1) {
        issues.push("INVALID_TURN_T");
      }
    }
    if (ds.sim.iterations !== undefined) {
      if (!Number.isInteger(ds.sim.iterations) || ds.sim.iterations < 1) {
        issues.push("INVALID_ITERATIONS");
      }
    }
    if (ds.sim.mulligan_model !== "none") {
      issues.push("INVALID_MULLIGAN");
    }
  }

  return issues;
}
