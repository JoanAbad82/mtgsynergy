import type { StructuralSummary } from "../../../engine";

type Props = {
  summary: StructuralSummary;
};

export default function StructuralPanel({ summary }: Props) {
  return (
    <div className="panel">
      <h2>Resumen estructural</h2>
      <p className="muted">
        Vista del grafo de roles y su densidad.
      </p>
      <p className="muted">
        Nodos activos: {summary.nodes_active} / {summary.nodes_total} · Relaciones:{" "}
        {summary.edges_total} · Densidad: {summary.density.toFixed(3)}
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
