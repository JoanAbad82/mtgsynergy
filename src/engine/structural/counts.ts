import type { Deck } from "../domain/types";
import type { Role } from "../domain/types";

const ROLE_ORDER: Role[] = [
  "ENGINE",
  "PAYOFF",
  "RAMP",
  "DRAW",
  "REMOVAL",
  "PROTECTION",
  "LAND",
  "UTILITY",
];

export function computeRoleCounts(deck: Deck): Record<Role, number> {
  const counts = Object.fromEntries(
    ROLE_ORDER.map((role) => [role, 0]),
  ) as Record<Role, number>;

  for (const entry of deck.entries) {
    counts[entry.role_primary] += entry.count;
  }

  return counts;
}

export function computeRoleShare(
  role_counts: Record<Role, number>,
  total_cards: number,
): Record<Role, number> {
  const shares = Object.fromEntries(
    ROLE_ORDER.map((role) => [role, 0]),
  ) as Record<Role, number>;

  if (total_cards <= 0) {
    return shares;
  }

  for (const role of ROLE_ORDER) {
    shares[role] = role_counts[role] / total_cards;
  }

  return shares;
}

export { ROLE_ORDER };
