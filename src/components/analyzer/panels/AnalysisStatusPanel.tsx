import { useState } from "preact/hooks";
import type { ShareDeckState, StructuralSummary } from "../../../engine";
import { es } from "../i18n/es";

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

export function formatStatusTitle(
  raw?: string,
  maxLength = 400,
): { text: string; truncated: boolean } {
  if (!raw) return { text: "", truncated: false };
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return { text: "", truncated: false };
  if (collapsed.length <= maxLength) {
    return { text: collapsed, truncated: false };
  }
  const slice = Math.max(0, maxLength - 1);
  return { text: `${collapsed.slice(0, slice)}…`, truncated: true };
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
      ? es.analysisStatus.sections.input.summaryNeedsAnalyze
      : es.analysisStatus.sections.input.summaryEmpty
    : inputSource
      ? es.analysisStatus.sections.input.summaryWithSource(inputSource)
      : es.analysisStatus.sections.input.summaryValid;

  const inputSection: AnalysisStatusSection = {
    id: "input",
    title: es.analysisStatus.sections.input.title,
    status: inputOk ? "OK" : "WARN",
    summary: inputSummary,
    action: inputOk
      ? es.analysisStatus.sections.input.actionReview
      : inputTextNonEmpty
        ? es.analysisStatus.sections.input.actionAnalyze
        : es.analysisStatus.sections.input.actionPaste,
    actionId: inputOk ? "reanalyze" : "focusInput",
    statusTitle: inputSource ? `Origen: ${inputSource}` : undefined,
  };

  const taggingIssue = getTaggingIssue(issues);
  const taggingCount = extractCardsIndexCount(taggingIssue?.message);
  let taggingStatus: StatusLevel = "WARN";
  let taggingSummary = es.analysisStatus.sections.tagging.summaryUnavailable;
  let taggingAction = es.analysisStatus.sections.tagging.actionProbe;

  if (taggingIssue?.code === "TAGGING_ACTIVE") {
    taggingStatus = "OK";
    taggingSummary = taggingCount != null
      ? es.analysisStatus.sections.tagging.summaryActiveCount(taggingCount)
      : es.analysisStatus.sections.tagging.summaryActive;
    taggingAction = es.analysisStatus.sections.tagging.actionContinue;
  } else if (taggingIssue?.code === "TAGGING_NO_MATCHES") {
    taggingStatus = "WARN";
    taggingSummary = taggingCount != null
      ? es.analysisStatus.sections.tagging.summaryNoMatchesCount(taggingCount)
      : es.analysisStatus.sections.tagging.summaryNoMatches;
    taggingAction = es.analysisStatus.sections.tagging.actionCheckNames;
  } else if (taggingIssue?.code === "TAGGING_UNAVAILABLE") {
    taggingStatus = "WARN";
    taggingSummary = es.analysisStatus.sections.tagging.summaryUnavailable;
    taggingAction = es.analysisStatus.sections.tagging.actionProbe;
  } else if (!hasAnalysis) {
    taggingStatus = "WARN";
    taggingSummary = es.analysisStatus.sections.tagging.summaryPending;
    taggingAction = es.analysisStatus.sections.tagging.actionAnalyzeFirst;
  } else {
    taggingStatus = "OK";
    taggingSummary = es.analysisStatus.sections.tagging.summaryActive;
    taggingAction = es.analysisStatus.sections.tagging.actionContinue;
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
  let mcSummary = es.analysisStatus.sections.mc.summaryDisabled;
  let mcAction = es.analysisStatus.sections.mc.actionEnable;
  let mcStatusTitle: string | undefined;
  let mcActionId: AnalysisStatusSection["actionId"] = "enableMc";

  if (!mcParams.enabled) {
    mcStatusLabel = "WARN";
    mcSummary = es.analysisStatus.sections.mc.summaryDisabled;
    mcAction = es.analysisStatus.sections.mc.actionEnable;
    mcActionId = "enableMc";
  } else if (mcStatus === "idle") {
    mcStatusLabel = "WARN";
    mcSummary = es.analysisStatus.sections.mc.summaryIdleEnabled;
    mcAction = es.analysisStatus.sections.mc.actionAnalyze;
    mcActionId = "reanalyze";
  } else if (mcStatus === "running") {
    mcStatusLabel = "OK";
    mcSummary = es.analysisStatus.sections.mc.summaryRunning;
    mcAction = es.analysisStatus.sections.mc.actionWait;
    mcActionId = undefined;
  } else if (mcStatus === "error") {
    mcStatusLabel = "WARN";
    mcSummary = es.analysisStatus.sections.mc.summaryError;
    mcAction = es.analysisStatus.sections.mc.actionRetry;
    mcStatusTitle = mcError ?? "Error";
    mcActionId = "reanalyze";
  } else if (mcStatus === "done") {
    const omittedInfo = getMcOmittedReason(mcResult);
    if (omittedInfo.omitted) {
      mcStatusLabel = "WARN";
      mcSummary = omittedInfo.reason
        ? `${es.analysisStatus.sections.mc.summaryOmitted} ${omittedInfo.reason}.`
        : es.analysisStatus.sections.mc.summaryOmitted;
      mcAction = es.analysisStatus.sections.mc.actionUseSynergy;
      mcStatusTitle = omittedInfo.reason;
      mcActionId = "reanalyze";
    } else {
      mcStatusLabel = "OK";
      mcSummary = es.analysisStatus.sections.mc.summaryReady;
      mcAction = es.analysisStatus.sections.mc.actionReview;
      mcActionId = "reanalyze";
    }
  }

  const mcSection: AnalysisStatusSection = {
    id: "mc",
    title: es.analysisStatus.sections.mc.title,
    status: mcStatusLabel,
    summary: mcSummary,
    action: mcAction,
    actionId: mcActionId,
    statusTitle: mcStatusTitle,
  };

  return {
    title: es.analysisStatus.title,
    sections: [inputSection, taggingSection, mcSection],
  };
}

type Props = AnalysisStatusInputs;

export default function AnalysisStatusPanel(props: Props) {
  const model = buildAnalysisStatusModel(props);
  const canReanalyze = Boolean(props.onReanalyze) &&
    (Boolean(props.inputTextNonEmpty) || Boolean(props.summary && props.deckState));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="panel">
      <h2>{es.analysisStatus.title}</h2>
      <p className="muted">{es.analysisStatus.subtitle}</p>
      {model.sections.map((section) => {
        const formattedTitle = formatStatusTitle(section.statusTitle);
        return (
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
                  {es.analysisStatus.labels.focusInput}
                </button>
              )}
              {section.actionId === "enableMc" && props.onEnableMc && (
                <button
                  type="button"
                  className="muted"
                  style={{ textDecoration: "underline" }}
                  onClick={props.onEnableMc}
                >
                  {es.analysisStatus.labels.enableMc}
                </button>
              )}
              {section.actionId === "reanalyze" && canReanalyze && (
                <button
                  type="button"
                  className="muted"
                  style={{ textDecoration: "underline" }}
                  onClick={props.onReanalyze}
                >
                  {es.analysisStatus.labels.reanalyze}
                </button>
              )}
            </p>
            {formattedTitle.text && (
              <>
                <button
                  type="button"
                  className="muted"
                  style={{ textDecoration: "underline" }}
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [section.id]: !prev[section.id],
                    }))
                  }
                >
                  {expanded[section.id]
                    ? es.analysisStatus.labels.hide
                    : es.analysisStatus.labels.details}
                </button>
                {expanded[section.id] && (
                  <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                    {formattedTitle.text}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
