import type { StructuralSummary } from "../../../engine";

type Props = {
  summary: StructuralSummary;
};

export default function StructuralPanel({ summary }: Props) {
  return (
    <div className="panel">
      <h2>Structural Summary</h2>
      <p className="muted">
        Nodos activos: {summary.nodes_active} / {summary.nodes_total} · Edges:{" "}
        {summary.edges_total} · Density: {summary.density.toFixed(3)}
      </p>
      <p className="muted">
        Cycles: {summary.cycles_present ? "sí" : "no"} · Components (weak):{" "}
        {summary.components_weak.count}
      </p>
      <p className="muted">
        Sources: {summary.sources.join(", ") || "—"} · Sinks:{" "}
        {summary.sinks.join(", ") || "—"}
      </p>
    </div>
  );
}
