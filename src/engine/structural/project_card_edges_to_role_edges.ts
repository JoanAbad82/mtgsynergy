import type { CardEntry, RoleEdge } from "../domain/types";
import type { Edge } from "../edges/types";

type ProjectionEntry = Pick<CardEntry, "name_norm" | "role_primary">;

export function projectCardEdgesToRoleEdges(
  entries: readonly ProjectionEntry[],
  edges: readonly Edge[],
): RoleEdge[] {
  const roleByName = new Map(
    entries.map((entry) => [entry.name_norm, entry.role_primary] as const),
  );

  const projected: RoleEdge[] = [];

  for (const edge of edges) {
    const from = roleByName.get(edge.from);
    const to = roleByName.get(edge.to);

    if (!from || !to) {
      continue;
    }

    projected.push({
      from,
      to,
      ...(edge.weight === undefined ? {} : { weight: edge.weight }),
    });
  }

  return projected;
}
