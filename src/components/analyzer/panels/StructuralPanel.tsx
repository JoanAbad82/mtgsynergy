import type { StructuralSummary } from "../../../engine";

type Props = {
  summary: StructuralSummary;
};

export const STRUCTURAL_PANEL_COPY = {
  title: "Estructura interna del mazo",
  intro: "Lectura rápida de cómo se conectan los roles del mazo.",
  nodesActiveLabel: "Nodos activos",
  relationsLabel: "Relaciones",
  densityLabel: "Densidad",
  cyclesDetectedLabel: "Ciclos detectados",
  connectedComponentsLabel: "Componentes conectados",
  sourceRolesLabel: "Roles origen",
  destinationRolesLabel: "Roles destino",
} as const;

export function buildStructuralSummaryLines(summary: StructuralSummary): {
  activity: string;
  topology: string;
  roleFlow: string;
} {
  return {
    activity: `${STRUCTURAL_PANEL_COPY.nodesActiveLabel}: ${summary.nodes_active} / ${summary.nodes_total} · ${STRUCTURAL_PANEL_COPY.relationsLabel}: ${summary.edges_total} · ${STRUCTURAL_PANEL_COPY.densityLabel}: ${summary.density.toFixed(3)}`,
    topology: `${STRUCTURAL_PANEL_COPY.cyclesDetectedLabel}: ${summary.cycles_present ? "sí" : "no"} · ${STRUCTURAL_PANEL_COPY.connectedComponentsLabel}: ${summary.components_weak.count}`,
    roleFlow: `${STRUCTURAL_PANEL_COPY.sourceRolesLabel}: ${summary.sources.join(", ") || "—"} · ${STRUCTURAL_PANEL_COPY.destinationRolesLabel}: ${summary.sinks.join(", ") || "—"}`,
  };
}

export default function StructuralPanel({ summary }: Props) {
  const lines = buildStructuralSummaryLines(summary);

  return (
    <div className="panel">
      <h2>{STRUCTURAL_PANEL_COPY.title}</h2>
      <p className="muted">
        {STRUCTURAL_PANEL_COPY.intro}
      </p>
      <p className="muted">
        {lines.activity}
      </p>
      <p className="muted">
        {lines.topology}
      </p>
      <p className="muted">
        {lines.roleFlow}
      </p>
    </div>
  );
}
