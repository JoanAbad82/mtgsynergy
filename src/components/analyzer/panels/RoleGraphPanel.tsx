import type { StructuralSummary } from "../../../engine";

type Props = {
  summary: StructuralSummary;
};

export const ROLE_GRAPH_PANEL_COPY = {
  title: "Roles y centralidad",
  intro: "Muestra qué funciones del mazo tienen más presencia.",
  helpText:
    "Cartas indica cuántas copias cumplen ese rol. Peso en el plan indica cuánto conecta ese rol dentro del grafo del mazo.",
  zeroCentralityNote:
    "Los roles están presentes, pero este análisis no ha detectado un rol que concentre peso estructural propio.",
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

export function hasAnyRoleCentrality(rows: Array<{ centrality: number }>): boolean {
  return rows.some((row) => row.centrality > 0);
}

export default function RoleGraphPanel({ summary }: Props) {
  const rows = buildRoleGraphRows(summary);
  const hasPositiveCentrality = hasAnyRoleCentrality(rows);

  return (
    <div className="panel">
      <h2>{ROLE_GRAPH_PANEL_COPY.title}</h2>
      <p className="muted">{ROLE_GRAPH_PANEL_COPY.intro}</p>
      <p className="muted">{ROLE_GRAPH_PANEL_COPY.helpText}</p>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0.5rem 0" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>{ROLE_GRAPH_PANEL_COPY.roleHeader}</th>
            <th style={{ textAlign: "right", whiteSpace: "nowrap", paddingRight: "1rem" }}>
              {ROLE_GRAPH_PANEL_COPY.countHeader}
            </th>
            <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              {ROLE_GRAPH_PANEL_COPY.centralityHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.role}>
              <td>{row.roleLabel}</td>
              <td style={{ textAlign: "right", paddingRight: "1rem" }}>{row.count}</td>
              <td style={{ textAlign: "right" }}>{row.centrality}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!hasPositiveCentrality && rows.length > 0 && (
        <p className="muted">{ROLE_GRAPH_PANEL_COPY.zeroCentralityNote}</p>
      )}
    </div>
  );
}
