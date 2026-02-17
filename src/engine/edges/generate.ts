import type { Role } from "../domain/types";
import type { CardFeatures } from "../cards/types";
import type { Edge } from "./types";

export type EdgeEntry = {
  name_norm: string;
  role_primary: Role;
  count: number;
  features?: CardFeatures;
};

const EDGE_CAP = 200;

function dedupeAdd(edges: Edge[], seen: Set<string>, edge: Edge) {
  const key = `${edge.kind}|${edge.from}|${edge.to}`;
  if (seen.has(key)) return;
  if (edges.length >= EDGE_CAP) return;
  seen.add(key);
  edges.push(edge);
}

export function generateEdges(entries: EdgeEntry[]): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.name_norm, e.count ?? 0);

  function weight(from: string, to: string) {
    return (counts.get(from) ?? 0) * (counts.get(to) ?? 0);
  }

  const removals = entries.filter((e) => e.role_primary === "REMOVAL");
  const payoffsLow = entries.filter(
    (e) =>
      e.role_primary === "PAYOFF" &&
      e.features?.is_creature &&
      e.features?.is_low_cmc_creature,
  );

  for (const from of removals) {
    for (const to of payoffsLow) {
      dedupeAdd(edges, seen, {
        kind: "burn_supports_threat",
        from: from.name_norm,
        to: to.name_norm,
        weight: weight(from.name_norm, to.name_norm),
      });
    }
  }

  const anthems = entries.filter(
    (e) => e.role_primary === "ENGINE" && e.features?.is_anthem,
  );
  const tokenMakers = entries.filter((e) => e.features?.creates_tokens);

  for (const from of anthems) {
    for (const to of tokenMakers) {
      dedupeAdd(edges, seen, {
        kind: "anthem_supports_tokens",
        from: from.name_norm,
        to: to.name_norm,
        weight: weight(from.name_norm, to.name_norm),
      });
    }
  }

  const spells = entries.filter((e) => {
    const types = e.features?.types ?? [];
    return types.includes("Instant") || types.includes("Sorcery");
  });
  const prowess = entries.filter((e) => e.features?.has_prowess);

  for (const from of spells) {
    for (const to of prowess) {
      dedupeAdd(edges, seen, {
        kind: "spells_support_prowess",
        from: from.name_norm,
        to: to.name_norm,
        weight: weight(from.name_norm, to.name_norm),
      });
    }
  }

  return edges;
}
