import type { StructuralSummary } from "../../../engine";

type Props = {
  summary: StructuralSummary;
};

export const ROLE_GRAPH_PANEL_COPY = {
  title: "Roles y centralidad",
  intro: "Muestra qué funciones del mazo tienen más presencia.",
  roleHeader: "Rol",
  countHeader: "Cartas",
  centralityHeader: "Peso en el plan",
} as const;

const ROLE_LABELS: Record<string, string> = {
  DRAW: "Robo de cartas",
  ENGINE: "Motor",
  LAND: "Tierras",
  PAYOFF: "Recompensas",
  PROTECTION: "Protección",
  RAMP: "Aceleración",
  REMOVAL: "Interacción / removal",
  UTILITY: "Utilidad",
};

export function formatRoleLabelForUi(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function buildRoleGraphRows(summary: StructuralSummary): Array<{
  role: string;
  roleLabel: string;
  count: number;
  centrality: number;
}> {
  return Object.keys(summary.role_counts)
    .sort()
    .map((role) => ({
      role,
      roleLabel: formatRoleLabelForUi(role),
      count: summary.role_counts[role as keyof typeof summary.role_counts],
      centrality:
        summary.centrality_score[role as keyof typeof summary.centrality_score],
    }));
}

export default function RoleGraphPanel({ summary }: Props) {
  const rows = buildRoleGraphRows(summary);

  return (
    <div className="panel">
      <h2>{ROLE_GRAPH_PANEL_COPY.title}</h2>
      <p className="muted">{ROLE_GRAPH_PANEL_COPY.intro}</p>
      <table>
        <thead>
          <tr>
            <th>{ROLE_GRAPH_PANEL_COPY.roleHeader}</th>
            <th>{ROLE_GRAPH_PANEL_COPY.countHeader}</th>
            <th>{ROLE_GRAPH_PANEL_COPY.centralityHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.role}>
              <td>{row.roleLabel}</td>
              <td>{row.count}</td>
              <td>{row.centrality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
