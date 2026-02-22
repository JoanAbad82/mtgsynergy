import type { MetricGuidance } from "../guidance/metric_guidance";

type Props = {
  label: string;
  value?: string;
  level?: MetricGuidance["level"];
  meaning: string;
  advice: string;
};

const LEVEL_LABELS: Record<NonNullable<Props["level"]>, string> = {
  low: "BAJO",
  mid: "MEDIO",
  high: "ALTO",
  na: "—",
};

export default function MetricCoach({
  label,
  value,
  level = "na",
  meaning,
  advice,
}: Props) {
  if (!meaning && !advice) return null;
  return (
    <div className="metric-coach">
      <div className="metric-coach-line">
        <strong>{label}</strong>
        {value && <span>{value}</span>}
        {level !== "na" && (
          <span className={`badge level-chip level-${level}`}>
            {LEVEL_LABELS[level]}
          </span>
        )}
      </div>
      {meaning && <div className="muted">{meaning}</div>}
      {advice && <div className="muted">Para mejorarlo: {advice}</div>}
    </div>
  );
}
