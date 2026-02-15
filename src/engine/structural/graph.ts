import type { Role, RoleEdge } from "../domain/types";
import { ROLE_ORDER } from "./counts";

export function buildRoleGraph(edges: RoleEdge[] = []): {
  nodes: Role[];
  edges: RoleEdge[];
} {
  return {
    nodes: [...ROLE_ORDER],
    edges: edges.slice(),
  };
}

export function computeInOutDegree(
  edges: RoleEdge[],
): { in_degree: Record<Role, number>; out_degree: Record<Role, number> } {
  const in_degree = Object.fromEntries(
    ROLE_ORDER.map((role) => [role, 0]),
  ) as Record<Role, number>;
  const out_degree = Object.fromEntries(
    ROLE_ORDER.map((role) => [role, 0]),
  ) as Record<Role, number>;

  for (const edge of edges) {
    out_degree[edge.from] += 1;
    in_degree[edge.to] += 1;
  }

  return { in_degree, out_degree };
}

export function computeCentrality(
  in_degree: Record<Role, number>,
  out_degree: Record<Role, number>,
): Record<Role, number> {
  const centrality = Object.fromEntries(
    ROLE_ORDER.map((role) => [role, in_degree[role] + out_degree[role]]),
  ) as Record<Role, number>;
  return centrality;
}

export function computeSourcesSinks(
  in_degree: Record<Role, number>,
  out_degree: Record<Role, number>,
): { sources: Role[]; sinks: Role[] } {
  const sources = ROLE_ORDER.filter(
    (role) => in_degree[role] === 0 && out_degree[role] > 0,
  );
  const sinks = ROLE_ORDER.filter(
    (role) => out_degree[role] === 0 && in_degree[role] > 0,
  );
  return { sources, sinks };
}

export function detectCyclesDirected(edges: RoleEdge[]): boolean {
  const adj = new Map<Role, Role[]>();
  for (const role of ROLE_ORDER) {
    adj.set(role, []);
  }
  for (const edge of edges) {
    adj.get(edge.from)?.push(edge.to);
  }

  const visited = new Set<Role>();
  const stack = new Set<Role>();

  const visit = (node: Role): boolean => {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const next of adj.get(node) ?? []) {
      if (visit(next)) return true;
    }
    stack.delete(node);
    return false;
  };

  for (const role of ROLE_ORDER) {
    if (visit(role)) return true;
  }

  return false;
}

export function computeComponentsWeak(edges: RoleEdge[]): {
  count: number;
  components: Role[][];
} {
  const undirected = new Map<Role, Set<Role>>();
  for (const role of ROLE_ORDER) {
    undirected.set(role, new Set());
  }
  for (const edge of edges) {
    undirected.get(edge.from)?.add(edge.to);
    undirected.get(edge.to)?.add(edge.from);
  }

  const visited = new Set<Role>();
  const components: Role[][] = [];

  for (const role of ROLE_ORDER) {
    if (visited.has(role)) continue;
    const queue: Role[] = [role];
    visited.add(role);
    const comp: Role[] = [];
    while (queue.length > 0) {
      const current = queue.shift() as Role;
      comp.push(current);
      for (const neighbor of undirected.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    components.push(comp);
  }

  return { count: components.length, components };
}
