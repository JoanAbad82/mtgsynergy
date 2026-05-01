import type {
  ActionableInsight,
  RecommendationDebugInspectionReport,
} from "../../../engine/recommendations";
import {
  buildRecommendationDebugInspectionReport,
  serializeRecommendationDebugInspectionReport,
} from "../../../engine/recommendations";

type Props = {
  actionableInsights?: ActionableInsight[] | null;
};

export const RECOMMENDATIONS_DEBUG_PANEL_COPY = {
  title: "Debug interno — recomendaciones accionables",
  intro:
    "Inspección técnica interna de actionableInsights (no es salida de producto final).",
  countLabel: "Total insights",
  themesLabel: "Themes",
  severitiesLabel: "Severidades",
  idsLabel: "IDs",
  topLabel: "Top insights",
  rawLabel: "JSON debug",
  noData: "Sin insights para inspeccionar.",
} as const;

export type RecommendationsDebugPanelModel = {
  report: RecommendationDebugInspectionReport;
  serializedReport: string;
};

const DEFAULT_DECK_LABEL = "analyzer-debug";
const DEFAULT_SOURCE = "AnalyzerApp";

export function buildRecommendationsDebugPanelModel(
  actionableInsights?: ActionableInsight[] | null,
): RecommendationsDebugPanelModel {
  const report = buildRecommendationDebugInspectionReport({
    deckLabel: DEFAULT_DECK_LABEL,
    source: DEFAULT_SOURCE,
    actionableInsights,
    includeEvidence: false,
  });
  return {
    report,
    serializedReport: serializeRecommendationDebugInspectionReport(report),
  };
}

function renderCountList(
  data: Record<string, number> | undefined,
) {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) {
    return <li>{RECOMMENDATIONS_DEBUG_PANEL_COPY.noData}</li>;
  }
  return (
    <>
      {entries.map(([key, count]) => (
        <li key={key}>
          <code>{key}</code>: {count}
        </li>
      ))}
    </>
  );
}

export default function RecommendationsDebugPanel({ actionableInsights }: Props) {
  const { report, serializedReport } = buildRecommendationsDebugPanelModel(
    actionableInsights,
  );

  return (
    <div
      className="panel recommendations-debug-panel"
      data-debug-only="recommendations"
    >
      <details>
        <summary>{RECOMMENDATIONS_DEBUG_PANEL_COPY.title}</summary>
        <p className="muted">{RECOMMENDATIONS_DEBUG_PANEL_COPY.intro}</p>
        <p>
          <strong>{RECOMMENDATIONS_DEBUG_PANEL_COPY.countLabel}:</strong>{" "}
          {report.count}
        </p>
        <h3>{RECOMMENDATIONS_DEBUG_PANEL_COPY.themesLabel}</h3>
        <ul className="issues">{renderCountList(report.themes)}</ul>
        <h3>{RECOMMENDATIONS_DEBUG_PANEL_COPY.severitiesLabel}</h3>
        <ul className="issues">{renderCountList(report.severities)}</ul>
        <h3>{RECOMMENDATIONS_DEBUG_PANEL_COPY.idsLabel}</h3>
        <pre>{report.ids.join("\n") || RECOMMENDATIONS_DEBUG_PANEL_COPY.noData}</pre>
        <h3>{RECOMMENDATIONS_DEBUG_PANEL_COPY.topLabel}</h3>
        {report.top.length === 0 ? (
          <p className="muted">{RECOMMENDATIONS_DEBUG_PANEL_COPY.noData}</p>
        ) : (
          <ul className="issues">
            {report.top.map((item) => (
              <li key={item.id}>
                <code>{item.id}</code> · {item.theme} · {item.severity} ·{" "}
                conf {item.confidence.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
        <h3>{RECOMMENDATIONS_DEBUG_PANEL_COPY.rawLabel}</h3>
        <pre>{serializedReport}</pre>
      </details>
    </div>
  );
}
