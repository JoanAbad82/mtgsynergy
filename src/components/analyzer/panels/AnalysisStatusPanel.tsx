import type { ShareDeckState, StructuralSummary } from "../../../engine";

export type StatusLevel = "OK" | "WARN";

export type AnalysisStatusSection = {
  id: "input" | "tagging" | "mc";
  title: string;
  status: StatusLevel;
  summary: string;
  action: string;
  actionId?: "focusInput" | "enableMc" | "reanalyze";
  statusTitle?: string;
};

export type AnalysisStatusModel = {
  title: string;
  sections: AnalysisStatusSection[];
};

type IssueLike = { code: string; severity?: string; message?: string };

export type AnalysisStatusInputs = {
  summary?: StructuralSummary | null;
  deckState?: ShareDeckState | null;
  issues?: IssueLike[];
  shareImported?: boolean;
  jsonImported?: boolean;
  inputTextNonEmpty?: boolean;
  mcParams?: { enabled: boolean };
  mcStatus?: "idle" | "running" | "done" | "error";
  mcResult?: any | null;
  mcError?: string | null;
  onFocusInput?: () => void;
  onEnableMc?: () => void;
  onReanalyze?: () => void;
};

function extractCardsIndexCount(message?: string): number | null {
  if (!message) return null;
  const match = message.match(/cards indexed count:\s*(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function getTaggingIssue(
  issues: IssueLike[],
): IssueLike | null {
  return (
    issues.find((issue) => issue.code === "TAGGING_ACTIVE") ??
    issues.find((issue) => issue.code === "TAGGING_UNAVAILABLE") ??
    issues.find((issue) => issue.code === "TAGGING_NO_MATCHES") ??
    null
  );
}

function collectWarningCodes(mcResult: any | null): string[] {
  const warnings = Array.isArray(mcResult?.warnings) ? mcResult.warnings : [];
  return warnings
    .map((w: any) => (typeof w?.code === "string" ? w.code : null))
    .filter((code: string | null): code is string => Boolean(code));
}

function getMcOmittedReason(mcResult: any | null): { omitted: boolean; reason?: string } {
  const baseSps =
    typeof mcResult?.base?.sps === "number" ? mcResult.base.sps : null;
  const effectiveN =
    typeof mcResult?.dist?.effective_n === "number"
      ? mcResult.dist.effective_n
      : null;
  const warnings = collectWarningCodes(mcResult);
  const omitted = (baseSps != null && baseSps <= 0) || effectiveN === 0;
  if (!omitted) return { omitted: false };

  const reasons: string[] = [];
  if (baseSps != null && baseSps <= 0) reasons.push("SPS base ≤ 0");
  if (effectiveN === 0) reasons.push("effective_n=0");
  if (warnings.length > 0) reasons.push(`warnings: ${warnings.join(", ")}`);

  return { omitted: true, reason: reasons.join(" · ") };
}

export function buildAnalysisStatusModel(
  input: AnalysisStatusInputs = {},
): AnalysisStatusModel {
  const summary = input.summary ?? null;
  const deckState = input.deckState ?? null;
  const issues = input.issues ?? [];
  const shareImported = Boolean(input.shareImported);
  const jsonImported = Boolean(input.jsonImported);
  const inputTextNonEmpty = Boolean(input.inputTextNonEmpty);
  const mcParams = input.mcParams ?? { enabled: false };
  const mcStatus = input.mcStatus ?? "idle";
  const mcResult = input.mcResult ?? null;
  const mcError = input.mcError ?? null;

  const hasAnalysis = Boolean(summary && deckState);
  const inputOk = hasAnalysis || shareImported || jsonImported;
  const inputSource = shareImported
    ? "share link"
    : jsonImported
      ? "JSON fallback"
      : hasAnalysis
        ? "análisis local"
        : null;

  const noInputYet = !inputOk;
  const inputSummary = noInputYet
    ? inputTextNonEmpty
      ? "No has analizado todavía."
      : "Entrada vacía."
    : `Entrada válida${inputSource ? ` (${inputSource})` : ""}.`;

  const inputSection: AnalysisStatusSection = {
    id: "input",
    title: "Entrada / parsing",
    status: inputOk ? "OK" : "WARN",
    summary: inputSummary,
    action: inputOk
      ? "Acción: revisar resultados."
      : inputTextNonEmpty
        ? "Acción: pulsa Analizar."
        : "Acción: pega un export y pulsa Analizar.",
    actionId: inputOk ? "reanalyze" : "focusInput",
    statusTitle: inputSource ? `Origen: ${inputSource}` : undefined,
  };

  const taggingIssue = getTaggingIssue(issues);
  const taggingCount = extractCardsIndexCount(taggingIssue?.message);
  let taggingStatus: StatusLevel = "WARN";
  let taggingSummary = "Índice no disponible.";
  let taggingAction = "Acción: prueba /data/cards_index.json.gz y manifest.";

  if (taggingIssue?.code === "TAGGING_ACTIVE") {
    taggingStatus = "OK";
    taggingSummary = taggingCount != null
      ? `Índice activo (${taggingCount}).`
      : "Índice activo.";
    taggingAction = "Acción: continuar con el análisis.";
  } else if (taggingIssue?.code === "TAGGING_NO_MATCHES") {
    taggingStatus = "WARN";
    taggingSummary = taggingCount != null
      ? `Índice sin coincidencias (${taggingCount}).`
      : "Índice sin coincidencias.";
    taggingAction = "Acción: revisa idioma/nombres del deck (MTGA).";
  } else if (taggingIssue?.code === "TAGGING_UNAVAILABLE") {
    taggingStatus = "WARN";
    taggingSummary = "Índice no disponible.";
    taggingAction = "Acción: prueba /data/cards_index.json.gz y manifest.";
  } else if (!hasAnalysis) {
    taggingStatus = "WARN";
    taggingSummary = "Índice pendiente.";
    taggingAction = "Acción: analiza un mazo primero.";
  } else {
    taggingStatus = "OK";
    taggingSummary = "Índice activo.";
    taggingAction = "Acción: continuar con el análisis.";
  }

  const taggingSection: AnalysisStatusSection = {
    id: "tagging",
    title: "Índice de cartas",
    status: taggingStatus,
    summary: taggingSummary,
    action: taggingAction,
    statusTitle: taggingIssue?.message,
  };

  let mcStatusLabel: StatusLevel = "WARN";
  let mcSummary = "Desactivado.";
  let mcAction = "Acción: activa Monte Carlo.";
  let mcStatusTitle: string | undefined;
  let mcActionId: AnalysisStatusSection["actionId"] = "enableMc";

  if (!mcParams.enabled) {
    mcStatusLabel = "WARN";
    mcSummary = "Desactivado.";
    mcAction = "Acción: activa Monte Carlo.";
    mcActionId = "enableMc";
  } else if (mcStatus === "idle") {
    mcStatusLabel = "WARN";
    mcSummary = "Activado, pendiente de ejecución (pulsa Analizar).";
    mcAction = "Acción: pulsa Analizar.";
    mcActionId = "reanalyze";
  } else if (mcStatus === "running") {
    mcStatusLabel = "OK";
    mcSummary = "Ejecutando.";
    mcAction = "Acción: espera.";
    mcActionId = undefined;
  } else if (mcStatus === "error") {
    mcStatusLabel = "WARN";
    mcSummary = "Error en la ejecución.";
    mcAction = "Acción: baja iteraciones o recarga.";
    mcStatusTitle = mcError ?? "Error";
    mcActionId = "reanalyze";
  } else if (mcStatus === "done") {
    const omittedInfo = getMcOmittedReason(mcResult);
    if (omittedInfo.omitted) {
      mcStatusLabel = "WARN";
      mcSummary = `Omitido${omittedInfo.reason ? `: ${omittedInfo.reason}` : ""}.`;
      mcAction = "Acción: usa un mazo con sinergias.";
      mcStatusTitle = omittedInfo.reason;
      mcActionId = "reanalyze";
    } else {
      mcStatusLabel = "OK";
      mcSummary = "Listo.";
      mcAction = "Acción: revisar métricas.";
      mcActionId = "reanalyze";
    }
  }

  const mcSection: AnalysisStatusSection = {
    id: "mc",
    title: "Monte Carlo (MC-SSL)",
    status: mcStatusLabel,
    summary: mcSummary,
    action: mcAction,
    actionId: mcActionId,
    statusTitle: mcStatusTitle,
  };

  return {
    title: "Estado del análisis",
    sections: [inputSection, taggingSection, mcSection],
  };
}

type Props = AnalysisStatusInputs;

export default function AnalysisStatusPanel(props: Props) {
  const model = buildAnalysisStatusModel(props);
  const canReanalyze = Boolean(props.onReanalyze) &&
    (Boolean(props.inputTextNonEmpty) || Boolean(props.summary && props.deckState));

  return (
    <div className="panel">
      <h2>{model.title}</h2>
      <p className="muted">
        Lectura rápida del estado del flujo.
      </p>
      {model.sections.map((section) => (
        <div key={section.id}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge" title={section.statusTitle ?? section.status}>
              {section.status}
            </span>
            <span>{section.title}</span>
          </h3>
          <p>{section.summary}</p>
          <p className="muted" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span>{section.action}</span>
            {section.actionId === "focusInput" && props.onFocusInput && (
              <button
                type="button"
                className="muted"
                style={{ textDecoration: "underline" }}
                onClick={props.onFocusInput}
              >
                Ir a entrada
              </button>
            )}
            {section.actionId === "enableMc" && props.onEnableMc && (
              <button
                type="button"
                className="muted"
                style={{ textDecoration: "underline" }}
                onClick={props.onEnableMc}
              >
                Activar Monte Carlo
              </button>
            )}
            {section.actionId === "reanalyze" && canReanalyze && (
              <button
                type="button"
                className="muted"
                style={{ textDecoration: "underline" }}
                onClick={props.onReanalyze}
              >
                Reanalizar
              </button>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
