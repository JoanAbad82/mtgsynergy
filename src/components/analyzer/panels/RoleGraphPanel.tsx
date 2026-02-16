import type { StructuralSummary } from "../../../engine";

type Props = {
  summary: StructuralSummary;
};

export default function RoleGraphPanel({ summary }: Props) {
  const rows = Object.keys(summary.role_counts)
    .sort()
    .map((role) => ({
      role,
      count: summary.role_counts[role as keyof typeof summary.role_counts],
      centrality:
        summary.centrality_score[role as keyof typeof summary.centrality_score],
    }));

  return (
    <div className="panel">
      <h2>Roles y centralidad</h2>
      <table>
        <thead>
          <tr>
            <th>Rol</th>
            <th>Count</th>
            <th>Centrality</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.role}>
              <td>{row.role}</td>
              <td>{row.count}</td>
              <td>{row.centrality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
