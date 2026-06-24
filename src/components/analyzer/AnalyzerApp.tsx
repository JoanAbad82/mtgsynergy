import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { DeckState, ShareDeckState, StructuralSummary } from "../../engine";
import type { ActionableInsight } from "../../engine/recommendations";
import {
  analyzeMtgaExportAsync,
  computeStructuralSummary,
  decodeShareState,
  encodeShareState,
  exportShareJson,
  importShareJson,
  isShareWarn,
} from "../../engine";
import { generateEdges } from "../../engine/edges";
import { runMonteCarloV1 } from "../../engine/montecarlo";
import { computeStructuralPowerScore } from "../../engine/structural/sps";
import { lookupCard } from "../../engine/cards/lookup";
import { buildShareUrl, getShareTokenFromUrl } from "./state/shareUrl";
import { exportJson, importJson } from "./state/jsonFallback";
import StructuralPanel from "./panels/StructuralPanel";
import RoleGraphPanel, { formatRoleLabelForUi } from "./panels/RoleGraphPanel";
import SharePanel from "./panels/SharePanel";
import AnalysisStatusPanel from "./panels/AnalysisStatusPanel";
import RecommendationsDebugPanel from "./panels/RecommendationsDebugPanel";
import SemanticOverlayPanel from "./SemanticOverlayPanel";
import HowItWorksSection from "./sections/HowItWorksSection";
import ExamplesSection from "./sections/ExamplesSection";
import FaqSection from "./sections/FaqSection";
import MetricCoach from "./components/MetricCoach";
import {
  interpretDensity,
  interpretEdgesTotal,
  interpretEffectiveN,
  interpretFragility,
  interpretMcStatus,
  interpretRobustVsBase,
  interpretRolesDominant,
  interpretSps,
  mapMcLabel,
} from "./guidance/metric_guidance";
import { es } from "./i18n/es";
import { explainKey, explainKeyHuman } from "../../engine/semantic/overlay/sem_profile";
import { computeSemanticOverlayFromDeckEntries } from "../../engine/semantic/overlay/sem_overlay_compute";
import { buildSemanticCoverageReport } from "../../engine/semantic/overlay/sem_coverage_report";
import type { SemanticCoverageReport } from "../../engine/semantic/overlay/sem_coverage_report";

import { compareSemanticAnalysisResultsV1 } from "../../engine/semantic/comparison/compare_semantic_analysis_results_v1";

type Props = {
  buildSha?: string;
};

type AnalyzerIssue = {
  code: string;
  severity?: string;
  message?: string;
};

type AnalyzerViewMode = "compact" | "detailed";

type MonteCarloActivationCopy = {
  title: string;
  subtitle: string;
};

export default function AnalyzerApp({ buildSha }: Props) {
  const [comparisonInputB, setComparisonInputB] = useState("");
  const [comparisonResult, setComparisonResult] =
    useState<ReturnType<typeof compareSemanticAnalysisResultsV1> | null>(null);

  const [inputText, setInputText] = useState("");
  const [deckState, setDeckState] = useState<ShareDeckState | null>(null);
  const [summary, setSummary] = useState<StructuralSummary | null>(null);
  const [issues, setIssues] = useState<
    Array<{ code: string; severity: string; message: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareImported, setShareImported] = useState(false);
  const [jsonImported, setJsonImported] = useState(false);
  const [tooLong, setTooLong] = useState(false);
  const [jsonFallback, setJsonFallback] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [actionableInsights, setActionableInsights] = useState<ActionableInsight[] | null>(null);
  const [mcResult, setMcResult] = useState<any | null>(null);
  const [mcStatus, setMcStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [mcError, setMcError] = useState<string | null>(null);
  const [mcParams, setMcParams] = useState(() => ({
    enabled: false,
    iterations: 1000,
    seed: 1,
  }));
  const [viewMode, setViewMode] = useState<AnalyzerViewMode>("compact");
  const [mcDetailsOpen, setMcDetailsOpen] = useState(false);
  const [semanticOverlayStatus, setSemanticOverlayStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [semanticOverlay, setSemanticOverlay] = useState<null | {
    metrics: ReturnType<typeof buildSemanticOverlayMetrics>;
    edgesTop: ReturnType<typeof buildSemanticEdges>;
    idToName: Record<number, string>;
    resolvedUnique: number;
    missingUnique: number;
    deckEntriesCount: number;
    coverageReport?: SemanticCoverageReport;
  }>(null);
  const [semanticOverlayError, setSemanticOverlayError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mcRunId = useRef(0);
  const semanticRunId = useRef(0);
  const edges = (deckState as any)?.edges ?? [];
  const edgesByKind = useMemo(() => groupEdgesForPanel(edges), [edges]);
  const relationGroupsForView = useMemo(
    () => buildRelationGroupsForView(edgesByKind, viewMode),
    [edgesByKind, viewMode],
  );
  const compactRelationsShownCount = useMemo(
    () =>
      relationGroupsForView.reduce((sum, group) => sum + group.shown.length, 0),
    [relationGroupsForView],
  );
  const compactRelationsHiddenCount = Math.max(0, edges.length - compactRelationsShownCount);
  const nameMap = useMemo(() => buildNameMapFromDeckState(deckState), [deckState]);
  const countsMap = useMemo(
    () =>
      new Map(
        (deckState as any)?.deck?.entries?.map((en: any) => [
          en.name_norm,
          en.count,
        ]) ?? [],
      ),
    [deckState],
  );
  const cardsIndexBaseUrl = useMemo(() => getCardsIndexBaseUrl(), []);
  const taggingIssue = useMemo(
    () => getTaggingIssueForUi(issues),
    [issues],
  );
  const cardsIndexedCount = useMemo(
    () => extractCardsIndexedCount(taggingIssue?.message),
    [taggingIssue],
  );
  const taggingFriendlyStatus = useMemo(
    () => buildFriendlyTaggingStatus(taggingIssue, cardsIndexedCount),
    [taggingIssue, cardsIndexedCount],
  );
  const visibleIssues = useMemo(
    () => issues.filter((issue) => !isTechnicalTaggingIssue(issue)),
    [issues],
  );
  const mcActivationCopy = useMemo(
    () => buildMonteCarloActivationCopy(mcParams.enabled, mcStatus, mcResult),
    [mcParams.enabled, mcStatus, mcResult],
  );
  const debugRecommendations = useMemo(() => getDebugRecommendationsFlag(), []);

  const warn = useMemo(
    () => (shareToken ? isShareWarn(shareToken) : false),
    [shareToken],
  );

  const resizeDeckTextarea = () => {
    const el = inputRef.current;
    if (!el) return;
    const minHeight = 220;
    el.style.height = "0px";
    const nextHeight = Math.max(el.scrollHeight, minHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = "hidden";
  };

  useEffect(() => {
    const rid = requestAnimationFrame(() => resizeDeckTextarea());
    return () => cancelAnimationFrame(rid);
  }, [inputText]);

  useEffect(() => {
    const token = getShareTokenFromUrl(new URL(window.location.href));
    if (!token) return;
    try {
      const ds = decodeShareState(token);
      const s = computeStructuralSummary(ds);
      setDeckState(ds);
      setSummary(s);
      setShareToken(token);
      setShareUrl(window.location.href);
      setShareImported(true);
      setJsonImported(false);
      setActionableInsights(null);
    } catch (err) {
      setError("No se pudo cargar el enlace compartido.");
    }
  }, []);

  useEffect(() => {
    const update = () => setMcParams(parseMcParams(window.location.href));
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  useEffect(() => {
    if (!mcParams.enabled) {
      setMcResult(null);
      setMcStatus("idle");
      setMcError(null);
      return;
    }
    if (!deckState || summary?.structuralPowerScore == null) return;

    mcRunId.current += 1;
    const rid = mcRunId.current;
    setMcStatus("running");
    setMcError(null);
    setMcResult(null);

    const entries = deckState.deck.entries.map((e) => ({
      name: e.name,
      count: e.count,
      role_primary: e.role_primary,
    }));
    const baseSps = getSpsNumber(summary.structuralPowerScore);
    if (baseSps <= 0) {
      setMcStatus("idle");
      setMcResult(null);
      return;
    }

    const analyzeSps = async (
      nextEntries: Array<{ name: string; count: number; role_primary?: string }>,
    ) => {
      const isSame = deckState.deck.entries.every((e) => {
        const match = nextEntries.find((n) => n.name === e.name);
        return match && match.count === e.count;
      });
      if (isSame) return baseSps;

      const edges = generateEdges(nextEntries as any);
      const nextState: DeckState = {
        ...(deckState as DeckState),
        deck: {
          ...(deckState as DeckState).deck,
          entries: nextEntries as any,
        },
        edges,
      };
      const s = computeStructuralSummary(nextState);
      const sps = computeStructuralPowerScore(s, edges);
      return getSpsNumber(sps);
    };

    runMonteCarloV1({
      entries,
      baseSps,
      analyzeSps,
      settings: {
        iterations: mcParams.iterations,
        seed: mcParams.seed,
      },
    })
      .then((res) => {
        if (rid !== mcRunId.current) return;
        setMcResult(res);
        setMcStatus("done");
      })
      .catch((err) => {
        if (rid !== mcRunId.current) return;
        setMcResult(null);
        setMcStatus("error");
        setMcError(err instanceof Error ? err.message : String(err));
      });
  }, [mcParams, deckState, summary]);

  useEffect(() => {
    const entries = deckState?.deck?.entries ?? [];
    if (entries.length === 0) {
      setSemanticOverlay(null);
      setSemanticOverlayStatus("idle");
      setSemanticOverlayError(null);
      return;
    }

    semanticRunId.current += 1;
    const rid = semanticRunId.current;
    setSemanticOverlayStatus("loading");
    setSemanticOverlay(null);
    setSemanticOverlayError(null);

    const run = async () => {
      const lookup = (nameOrNorm: string) => lookupCard(nameOrNorm, cardsIndexBaseUrl);
      const result = await computeSemanticOverlayFromDeckEntries(entries, lookup);
      if (rid !== semanticRunId.current) return;
      if (result.metrics.card_count === 0) {
        setSemanticOverlay(null);
        setSemanticOverlayStatus("ready");
        return;
      }
      let coverageReport: SemanticCoverageReport | undefined;
      try {
        coverageReport = await buildSemanticCoverageReport({
          entries: entries.map((entry) => ({ name: entry.name })),
          lookup,
        });
      } catch {
        coverageReport = undefined;
      }
      if (rid !== semanticRunId.current) return;
      setSemanticOverlay({ ...result, coverageReport });
      setSemanticOverlayStatus("ready");
    };

    run().catch((err) => {
      if (rid !== semanticRunId.current) return;
      setSemanticOverlay(null);
      setSemanticOverlayStatus("error");
      setSemanticOverlayError(err instanceof Error ? err.message : String(err));
    });
  }, [deckState]);

  async function analyze(text: string) {
    setError(null);
    setTooLong(false);
    setIsAnalyzing(true);
    setShareImported(false);
    setJsonImported(false);

    try {
      const res = await analyzeMtgaExportAsync(text, {
        enableCardIndex: true,
        baseUrl: cardsIndexBaseUrl,
      });
      setIssues(res.issues);
      setDeckState(res.deckState as ShareDeckState);
      setSummary(res.summary);
      setActionableInsights(
        Array.isArray(res.actionableInsights) ? res.actionableInsights : [],
      );

      if (comparisonInputB.trim()) {
        const comparisonRes = await analyzeMtgaExportAsync(comparisonInputB, {
          enableCardIndex: true,
          baseUrl: cardsIndexBaseUrl,
        });
        setComparisonResult(compareSemanticAnalysisResultsV1(res, comparisonRes));
      } else {
        setComparisonResult(null);
      }


      const shareJson = exportShareJson(res.deckState);
      setJsonFallback(shareJson);

      try {
        const token = encodeShareState(res.deckState);
        const nextUrl = buildShareUrl(new URL(window.location.href), token);
        window.history.replaceState({}, "", nextUrl);
        setShareToken(token);
        setShareUrl(nextUrl);
      } catch (err) {
        if (err instanceof Error && err.message === "SHARE_URL_TOO_LONG") {
          setTooLong(true);
          setShareToken(null);
          setShareUrl(null);
        } else {
          setError("Error inesperado al generar enlace.");
        }
      }
    } catch (e) {
      setActionableInsights(null);
      setIssues([
        {
          code: "ANALYZE_FAILED",
          severity: "warning",
          message: String(e),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleAnalyze() {
    await analyze(inputText);
  }

  async function handleLoadExample(text: string) {
    setInputText(text);
    await analyze(text);
  }

  function handleImportJson(json: string) {
    try {
      const ds = importShareJson(json);
      const s = computeStructuralSummary(ds);
      setDeckState(ds);
      setSummary(s);
      setError(null);
      setJsonImported(true);
      setShareImported(false);
      setActionableInsights(null);
    } catch {
      setError("JSON inválido.");
    }
  }

  function handleToggleMonteCarlo(enabled: boolean) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    if (enabled) {
      params.set("mc", "1");
    } else {
      params.delete("mc");
    }
    url.search = params.toString();
    window.history.replaceState({}, "", url.toString());
    setMcParams(parseMcParams(url));
  }

  return (
    <div className="analyzer">

      <section aria-label="Semantic deck comparison">
        <h2>Comparación semántica</h2>
        <label>
          Versión B (opcional)
          <textarea
            value={comparisonInputB}
            onInput={(event) =>
              setComparisonInputB((event.currentTarget as HTMLTextAreaElement).value)
            }
            placeholder="Pega aquí una segunda versión del mazo"
          />
        </label>
        <p>Los cambios detectados describen diferencias semánticas; no son un veredicto de fuerza competitiva.</p>
        {comparisonResult ? (
          <div data-testid="semantic-comparison-result">
            <p>Cartas añadidas: {comparisonResult.cardsAdded.length}</p>
            <p>Cartas eliminadas: {comparisonResult.cardsRemoved.length}</p>
            <p>Cambios de cantidad: {comparisonResult.quantityChanges.length}</p>
            <p>Conexiones ganadas: {comparisonResult.connectionsGained.length}</p>
            <p>Conexiones perdidas: {comparisonResult.connectionsLost.length}</p>
            <p>Eventos ganados: {comparisonResult.eventsGained.length}</p>
            <p>Eventos perdidos: {comparisonResult.eventsLost.length}</p>
            <p>Cobertura A/B/Δ: {String(comparisonResult.coverageA)} / {String(comparisonResult.coverageB)} / {String(comparisonResult.coverageDelta)}</p>
          </div>
        ) : null}
      </section>

      <div className="panel analyzer-input-panel">
        <span className="badge">{MONTE_CARLO_PANEL_COPY.entryBadgeTitle}</span>
        <p className="muted" style={{ marginTop: "10px" }}>
          Pega un export de MTG Arena para analizar la estructura.
        </p>
        {taggingFriendlyStatus && (
          <p className="muted analyzer-runtime-status">{taggingFriendlyStatus}</p>
        )}
        <div className="deck-input-shell">
          <textarea
            className="deck-textarea"
            placeholder="Pega aquí tu export de MTG Arena..."
            value={inputText}
            onInput={(e) => {
              setInputText(e.currentTarget.value);
              resizeDeckTextarea();
            }}
            onPaste={() => {
              requestAnimationFrame(() => resizeDeckTextarea());
            }}
            ref={inputRef}
          />
          <div className="analyzer-actions">
            <button
              className="analyzer-primary-action"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analizando..." : "Analizar"}
            </button>
          </div>
        </div>
        {visibleIssues.length > 0 && (
          <ul className="issues analyzer-user-issues">
            {visibleIssues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>
                {formatAnalyzerUserIssue(issue)}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="muted">{error}</p>}
        {(buildSha || issues.length > 0) && (
          <details className="analyzer-technical-details">
            <summary>Detalles técnicos</summary>
            <div className="analyzer-technical-content">
              <p className="muted analyzer-build-meta">build: {formatBuildShaShort(buildSha)}</p>
              {issues.length > 0 ? (
                <ul className="issues analyzer-technical-list">
                  {issues.map((issue) => (
                    <li key={`tech-${issue.code}-${issue.message}`}>
                      {formatAnalyzerTechnicalIssue(issue)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Sin eventos técnicos en esta ejecución.</p>
              )}
            </div>
          </details>
        )}
      </div>

      <HowItWorksSection />
      <div className="analyzer-examples-shell">
        <ExamplesSection onLoadExample={handleLoadExample} />
      </div>

      <div className="panel monte-carlo-toggle-panel">
        <div className="mc-activation-head">
          <h2>{mcActivationCopy.title}</h2>
          <p className="muted">{mcActivationCopy.subtitle}</p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={mcParams.enabled}
            onChange={(e) => handleToggleMonteCarlo(e.currentTarget.checked)}
          />
          <span>
            {mcParams.enabled
              ? MONTE_CARLO_PANEL_COPY.toggleEnabledLabel
              : MONTE_CARLO_PANEL_COPY.toggleLabel}
          </span>
        </label>
        {mcParams.enabled && mcStatus !== "done" && (
          <p className="muted" style={{ marginTop: "6px" }}>
            {MONTE_CARLO_PANEL_COPY.toggleHint}
          </p>
        )}
      </div>

      <AnalysisStatusPanel
        summary={summary}
        deckState={deckState}
        issues={issues}
        shareImported={shareImported}
        jsonImported={jsonImported}
        inputTextNonEmpty={inputText.trim().length > 0}
        mcParams={mcParams}
        mcStatus={mcStatus}
        mcResult={mcResult}
        mcError={mcError}
        onFocusInput={() => {
          const el = inputRef.current;
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }}
        onEnableMc={() => {
          if (mcParams.enabled) return;
          handleToggleMonteCarlo(true);
        }}
        onReanalyze={() => {
          if (!inputText.trim()) return;
          analyze(inputText);
        }}
      />

      {debugRecommendations && Array.isArray(actionableInsights) && (
        <RecommendationsDebugPanel actionableInsights={actionableInsights} />
      )}

      {summary && (
        <>
          <div className="panel analyzer-view-panel">
            <h2>{ANALYZER_VIEW_COPY.title}</h2>
            <p className="muted">{ANALYZER_VIEW_COPY.intro}</p>
            <div className="view-mode-toggle" role="tablist" aria-label="Modo de lectura">
              <button
                type="button"
                className={`view-mode-option ${viewMode === "compact" ? "is-active" : ""}`}
                aria-pressed={viewMode === "compact"}
                onClick={() => setViewMode("compact")}
              >
                {ANALYZER_VIEW_COPY.compactLabel}
              </button>
              <button
                type="button"
                className={`view-mode-option ${viewMode === "detailed" ? "is-active" : ""}`}
                aria-pressed={viewMode === "detailed"}
                onClick={() => setViewMode("detailed")}
              >
                {ANALYZER_VIEW_COPY.detailedLabel}
              </button>
            </div>
          </div>
          <div className="panel quick-results-panel">
            <h2>Resultado rápido</h2>
            <p className="muted">Resumen orientativo para lectura rápida.</p>
            {(() => {
              const spsValue = getSpsNumber(summary.structuralPowerScore);
              const spsGuide = interpretSps(spsValue);
              const edgesGuide = interpretEdgesTotal(summary.edges_total);
              const densityGuide = interpretDensity(summary.density);
              const roles = getDominantRoles(summary.role_counts);
              const rolesGuide = interpretRolesDominant(roles);
              return (
                <div className="quick-kpi-grid">
                  <div className="quick-kpi-card">
                    <p className="muted quick-kpi-label" title="Structural Power Score (SPS)">
                      Puntuación estructural (SPS)
                    </p>
                    <p className="quick-kpi-value">
                      {formatNumberCompact(summary.structuralPowerScore, 1)}
                    </p>
                    <MetricCoach
                      label="SPS"
                      value={formatNumberCompact(summary.structuralPowerScore, 1)}
                      level={spsGuide.level}
                      meaning={spsGuide.meaning}
                      advice={spsGuide.advice}
                    />
                  </div>
                  <div className="quick-kpi-card">
                    <p className="muted quick-kpi-label">Sinergias detectadas</p>
                    <p className="quick-kpi-value">{summary.edges_total}</p>
                    <MetricCoach
                      label="Sinergias"
                      value={String(summary.edges_total)}
                      level={edgesGuide.level}
                      meaning={edgesGuide.meaning}
                      advice={edgesGuide.advice}
                    />
                  </div>
                  <div className="quick-kpi-card">
                    <p className="muted quick-kpi-label" title="Densidad del grafo de roles">
                      Densidad
                    </p>
                    <p className="quick-kpi-value">{formatNumberCompact(summary.density, 3)}</p>
                    <MetricCoach
                      label="Densidad"
                      value={formatNumberCompact(summary.density, 3)}
                      level={densityGuide.level}
                      meaning={densityGuide.meaning}
                      advice={densityGuide.advice}
                    />
                  </div>
                  <div className="quick-kpi-card">
                    <p className="muted quick-kpi-label" title="Roles con mayor presencia en el mazo">
                      Roles dominantes
                    </p>
                    <p className="quick-kpi-value quick-kpi-value-roles">
                      {formatDominantRolesForUi(summary.role_counts)}
                    </p>
                    {rolesGuide.meaning || rolesGuide.advice ? (
                      <MetricCoach
                        label="Roles dominantes"
                        value={formatRoleListForUi(roles)}
                        meaning={rolesGuide.meaning}
                        advice={rolesGuide.advice}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })()}
            <p className="muted quick-results-diagnosis">
              {getQuickDiagnosis(summary.edges_total, summary.density)}
            </p>
          </div>
          <StructuralPanel summary={summary} />
          <RoleGraphPanel summary={summary} />
          {semanticOverlayStatus === "loading" && (
            <div className="panel semantic-overlay-panel semantic-overlay-state-panel">
              <h2>Superposición semántica (experimental)</h2>
              <p className="muted">Cargando…</p>
            </div>
          )}
          {semanticOverlayStatus === "error" && (
            <div className="panel semantic-overlay-panel semantic-overlay-state-panel">
              <h2>Superposición semántica (experimental)</h2>
              <p className="muted">
                Error: {semanticOverlayError ?? "Error desconocido"}
              </p>
            </div>
          )}
          {semanticOverlayStatus === "ready" &&
            semanticOverlay &&
            semanticOverlay.metrics.card_count > 0 && (
              <SemanticOverlayPanel
                metrics={semanticOverlay.metrics}
                edges={semanticOverlay.edgesTop}
                explainKey={explainKey}
                explainKeyHuman={explainKeyHuman}
                idToName={semanticOverlay.idToName}
                deckEntriesCount={semanticOverlay.deckEntriesCount}
                resolvedUnique={semanticOverlay.resolvedUnique}
                missingUnique={semanticOverlay.missingUnique}
                coverageReport={semanticOverlay.coverageReport}
                viewMode={viewMode}
              />
          )}
          {mcParams.enabled && (
            <div className="panel monte-carlo-results-panel">
              <h2>{MONTE_CARLO_PANEL_COPY.title}</h2>
              <p className="muted">{MONTE_CARLO_PANEL_COPY.intro}</p>
              {(() => {
                const omittedReason =
                  mcStatus === "done" && mcResult?.base?.sps <= 0
                    ? MONTE_CARLO_PANEL_COPY.insufficientRelationsNote
                    : mcStatus === "done" && mcResult?.dist?.effective_n === 0
                      ? MONTE_CARLO_PANEL_COPY.noUsefulSamplesReason
                      : null;
                const statusGuide = interpretMcStatus(mcStatus, omittedReason);
                const effectiveN = mcResult?.dist?.effective_n ?? null;
                const requestedN = mcResult?.dist?.requested_n ?? null;
                const effectiveGuide = interpretEffectiveN(effectiveN, requestedN);
                const robustGuide = interpretRobustVsBase(
                  mcResult?.base?.sps ?? null,
                  mcResult?.metrics?.robust_sps ?? null,
                );
                const fragilityGuide = interpretFragility(
                  mcResult?.metrics?.fragility ?? null,
                );
                if (
                  statusGuide.level === "na" &&
                  effectiveGuide.level === "na" &&
                  robustGuide.level === "na" &&
                  fragilityGuide.level === "na"
                )
                  return null;
                const recommendation = buildMonteCarloRecommendation(
                  robustGuide.level,
                  fragilityGuide.level,
                );
                const stabilityBreakdown = formatMonteCarloStabilityBreakdown(
                  mcResult?.metrics?.robust_sps ?? null,
                  mcResult?.base?.sps ?? null,
                );
                const zeroRobustnessNote = formatMonteCarloZeroRobustnessNote(
                  mcResult?.metrics?.robust_sps ?? null,
                  mcResult?.base?.sps ?? null,
                );
                return (
                  <div className="metric-coach-block">
                    <MetricCoach
                      label={es.mc.labels.status}
                      value={
                        mcStatus === "running"
                          ? "Simulación en ejecución"
                          : mcStatus === "error"
                            ? "Simulación con error"
                            : mcStatus === "done"
                              ? omittedReason
                                ? "Simulación con limitaciones"
                                : "Simulación completada"
                              : "Pendiente de ejecutar"
                      }
                      level={statusGuide.level}
                      meaning={statusGuide.meaning}
                      advice={undefined}
                    />
                    <MetricCoach
                      label={es.mc.labels.samples}
                      value={
                        effectiveN != null && requestedN != null
                          ? `${mapMcLabel("samples")}: ${effectiveN} / ${requestedN}`
                          : undefined
                      }
                      level={effectiveGuide.level}
                      meaning={effectiveGuide.meaning}
                      advice={undefined}
                    />
                    <MetricCoach
                      label={es.mc.labels.robustness}
                      value={
                        stabilityBreakdown
                          ? `${stabilityBreakdown.simulated}\n${stabilityBreakdown.base}`
                          : undefined
                      }
                      level={robustGuide.level}
                      meaning={robustGuide.meaning}
                      advice={undefined}
                    />
                    <MetricCoach
                      label={es.mc.labels.fragility}
                      value={
                        mcResult?.metrics?.fragility != null
                          ? `${MONTE_CARLO_PANEL_COPY.fragilityPrefix}: ${formatNumberCompact(
                              mcResult.metrics.fragility,
                              1,
                            )}`
                          : undefined
                      }
                      level={fragilityGuide.level}
                      meaning={fragilityGuide.meaning}
                      advice={undefined}
                    />
                    {recommendation && (
                      <p className="muted">
                        {MONTE_CARLO_PANEL_COPY.recommendationPrefix}: {recommendation}
                      </p>
                    )}
                    {zeroRobustnessNote && <p className="muted">{zeroRobustnessNote}</p>}
                  </div>
                );
              })()}
              <button
                type="button"
                className="muted link-button"
                onClick={() => setMcDetailsOpen((prev) => !prev)}
              >
                {mcDetailsOpen ? es.mc.toggles.hide : es.mc.toggles.details}
              </button>
              {mcDetailsOpen && (
                <div>
                  <p className="muted">
                    {MONTE_CARLO_PANEL_COPY.statusHeading}:{" "}
                    {mcStatus === "running"
                      ? "Simulación en ejecución… (puede tardar)"
                      : mcStatus === "error"
                        ? `Error: ${mcError ?? "Error desconocido"}`
                        : mcStatus === "done" && !mcResult
                          ? "Simulación no disponible (sin resultados)."
                          : mcStatus === "done" && mcResult?.base?.sps <= 0
                            ? "Simulación no ejecutada: no hay relaciones suficientes."
                            : mcStatus === "done" && mcResult?.dist?.effective_n === 0
                              ? formatMonteCarloNoUsefulSamplesMessage()
                              : mcStatus === "idle"
                                ? "Lista para ejecutar: analiza un mazo para lanzar la simulación."
                                : "Simulación lista."}
                  </p>
                  {mcStatus === "done" && mcResult && (
                <>
                  <p>{mapMcLabel("base_sps")}: {mcResult.base.sps}</p>
                  <p>
                    semilla: {mcResult.settings.seed} · iteraciones:{" "}
                    {mcResult.settings.iterations}
                  </p>
                  <p>
                    {mapMcLabel("samples")}: {mcResult.dist.effective_n} /{" "}
                    {mcResult.dist.requested_n} ({mapMcLabel("no_op")}: {mcResult.dist.no_op})
                  </p>
                  <p>{mapMcLabel("robust_sps")}: {mcResult.metrics.robust_sps}</p>
                  <p>{mapMcLabel("fragility")}: {mcResult.metrics.fragility}</p>
                  {mcResult.dist_ext ? (
                    <>
                      <p>
                        {mapMcLabel("percentiles")}: p05{" "}
                        {formatNumberCompact(mcResult.dist_ext.percentiles.p05, 1)}
                        {" · "}p10{" "}
                        {formatNumberCompact(mcResult.dist_ext.percentiles.p10, 1)}
                        {" · "}p25{" "}
                        {formatNumberCompact(mcResult.dist_ext.percentiles.p25, 1)}
                        {" · "}p50{" "}
                        {formatNumberCompact(mcResult.dist_ext.percentiles.p50, 1)}
                        {" · "}p75{" "}
                        {formatNumberCompact(mcResult.dist_ext.percentiles.p75, 1)}
                        {" · "}p90{" "}
                        {formatNumberCompact(mcResult.dist_ext.percentiles.p90, 1)}
                        {" · "}p95{" "}
                        {formatNumberCompact(mcResult.dist_ext.percentiles.p95, 1)}
                      </p>
                      <p>
                        {mapMcLabel("mean_stdev")}:{" "}
                        {formatNumberCompact(mcResult.dist_ext.mean, 1)} ±{" "}
                        {formatNumberCompact(mcResult.dist_ext.stdev, 1)}
                      </p>
                      <p>
                        {mapMcLabel("iqr")}: {formatNumberCompact(mcResult.dist_ext.iqr, 1)}
                      </p>
                      <p>
                        {mapMcLabel("min_max")}:{" "}
                        {formatNumberCompact(mcResult.dist_ext.min, 1)} –{" "}
                        {formatNumberCompact(mcResult.dist_ext.max, 1)}
                      </p>
                      <p>
                        {mapMcLabel("delta_p50")}:{" "}
                        {formatSigned(mcResult.dist_ext.deltas_abs_vs_base.p50, 1)}{" "}
                        puntos SPS · {mapMcLabel("delta_p10")}:{" "}
                        {formatSigned(mcResult.dist_ext.deltas_abs_vs_base.p10, 1)}{" "}
                        puntos SPS · {mapMcLabel("delta_p90")}:{" "}
                        {formatSigned(mcResult.dist_ext.deltas_abs_vs_base.p90, 1)}{" "}
                        puntos SPS
                      </p>
                    </>
                  ) : (
                    <p className="muted">Estadísticas extendidas no disponibles</p>
                  )}
                  {mcResult.warnings?.length > 0 && (
                    <ul className="issues">
                      {mcResult.warnings.map((w: any) => (
                        <li key={`${w.code}-${w.detail}`}>
                          aviso: {w.code} ({w.detail})
                        </li>
                      ))}
                    </ul>
                  )}
                </>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="panel relations-panel">
            <h2>Relaciones (sinergias)</h2>
            <p className="muted">
              Relaciones detectadas entre roles del mazo.
            </p>
            <p className="muted">Relaciones detectadas: {edges.length}</p>
            {edges.length === 0 ? (
              <p className="muted">No se detectaron relaciones.</p>
            ) : viewMode === "compact" ? (
              <>
                <ul className="relation-category-summary">
                  {edgesByKind.map(([kind, list]) => (
                    <li key={`summary-${kind}`}>
                      {formatEdgeKindLabel(kind)} ({list.length})
                    </li>
                  ))}
                </ul>
                <p className="muted relation-compact-hint">
                  {ANALYZER_VIEW_COPY.compactRelationsHint}
                </p>
                {relationGroupsForView.map((group) => (
                  <div key={group.kind} className="relation-group">
                    <h3>
                      {formatEdgeKindLabel(group.kind)} ({group.total})
                    </h3>
                    <p className="muted">{explainEdgeKind(group.kind)}</p>
                    <ul className="relation-list">
                      {group.shown.map((e) => {
                        const copiesLine = formatEdgeCopiesLine(e, countsMap);
                        return (
                          <li key={`${e.kind}|${e.from}|${e.to}`} className="relation-item">
                            <div className="relation-line">{formatEdgeLine(e, nameMap)}</div>
                            {copiesLine && <div className="muted relation-meta">{copiesLine}</div>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {compactRelationsHiddenCount > 0 && (
                  <details className="relation-details">
                    <summary>{ANALYZER_VIEW_COPY.viewAllRelationsLabel}</summary>
                    {edgesByKind.map(([kind, list]) => (
                      <div key={`all-${kind}`} className="relation-group relation-group-expanded">
                        <h3>
                          {formatEdgeKindLabel(kind)} ({list.length})
                        </h3>
                        <p className="muted">{explainEdgeKind(kind)}</p>
                        <ul className="relation-list">
                          {list.map((e) => {
                            const copiesLine = formatEdgeCopiesLine(e, countsMap);
                            return (
                              <li key={`${e.kind}|${e.from}|${e.to}`} className="relation-item">
                                <div className="relation-line">{formatEdgeLine(e, nameMap)}</div>
                                {copiesLine && <div className="muted relation-meta">{copiesLine}</div>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </details>
                )}
              </>
            ) : (
              edgesByKind.map(([kind, list]) => (
                <div key={kind} className="relation-group">
                  <h3>
                    {formatEdgeKindLabel(kind)} ({list.length})
                  </h3>
                  <p className="muted">{explainEdgeKind(kind)}</p>
                  <ul className="relation-list">
                    {list.map((e) => {
                      const copiesLine = formatEdgeCopiesLine(e, countsMap);
                      return (
                        <li key={`${e.kind}|${e.from}|${e.to}`} className="relation-item">
                          <div className="relation-line">{formatEdgeLine(e, nameMap)}</div>
                          {copiesLine && <div className="muted relation-meta">{copiesLine}</div>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
          <SharePanel
            token={shareToken}
            shareUrl={shareUrl}
            warn={warn}
            tooLong={tooLong}
            jsonFallback={jsonFallback}
            onImportJson={handleImportJson}
            onExportJson={setJsonFallback}
          />
        </>
      )}

      <FaqSection />
    </div>
  );
}

export type EdgeUi = {
  kind?: string;
  from: string;
  to: string;
  weight?: number;
  score?: number;
};

export const ANALYZER_VIEW_COPY = {
  title: "Nivel de detalle",
  intro: "Elige cómo quieres leer los resultados del mazo.",
  compactLabel: "Vista resumida",
  detailedLabel: "Vista detallada",
  compactRelationsHint:
    "Mostrando solo las relaciones principales. Cambia a vista detallada para verlas todas.",
  viewAllRelationsLabel: "Ver todas las relaciones",
} as const;

export const MONTE_CARLO_PANEL_COPY = {
  title: "Simulación de estabilidad",
  intro: "Estima si el plan del mazo aguanta pequeñas variaciones.",
  entryBadgeTitle: "Análisis estructural",
  experimentalTitle: "Simulación de estabilidad: experimental",
  toggleLabel: "Activar simulación experimental",
  toggleEnabledLabel: "Desactivar simulación experimental",
  toggleHint:
    "Simula pequeñas variaciones del mazo para estimar si el plan se mantiene. Puede tardar unos segundos.",
  disabledHint: "Actualmente desactivada para este análisis.",
  enabledHint:
    "Funcionalidad experimental activada. Se ejecutará cuando analices el mazo.",
  statusHeading: "Estado de la simulación",
  stabilityPrefix: "Resultado simulado",
  basePrefix: "referencia base",
  noUsefulSamplesReason: "no hubo muestras útiles",
  recommendationPrefix: "Recomendación",
  recommendationFallback: "Añade redundancia, piezas equivalentes o prueba otro mazo.",
  recommendationBridge: "Añade redundancia y cartas puente entre roles.",
  zeroRobustnessNote:
    "En esta simulación, las conexiones principales no se mantienen cuando el mazo se perturba. El plan parece depender de pocas piezas clave.",
  insufficientRelationsNote:
    "No hay relaciones suficientes para ejecutar una simulación útil.",
  fragilityPrefix: "Variación estimada",
} as const;

export function formatMonteCarloStabilityLine(robustSps: unknown, baseSps: unknown): string | undefined {
  const breakdown = formatMonteCarloStabilityBreakdown(robustSps, baseSps);
  if (!breakdown) return undefined;
  return `${breakdown.simulated} · ${breakdown.base.toLowerCase()}`;
}

export function formatMonteCarloStabilityBreakdown(
  robustSps: unknown,
  baseSps: unknown,
): { simulated: string; base: string } | null {
  if (typeof robustSps !== "number" || !Number.isFinite(robustSps)) return null;
  if (typeof baseSps !== "number" || !Number.isFinite(baseSps)) return null;
  return {
    simulated: `${MONTE_CARLO_PANEL_COPY.stabilityPrefix}: ${formatNumberCompact(robustSps, 1)}`,
    base: `Referencia base: ${formatNumberCompact(baseSps, 1)}`,
  };
}

export function formatMonteCarloZeroRobustnessNote(robustSps: unknown, baseSps: unknown): string | null {
  if (typeof robustSps !== "number" || !Number.isFinite(robustSps)) return null;
  if (typeof baseSps !== "number" || !Number.isFinite(baseSps)) return null;
  if (baseSps > 0 && robustSps <= 0) {
    return MONTE_CARLO_PANEL_COPY.zeroRobustnessNote;
  }
  return null;
}

export function formatMonteCarloInsufficientRelationsNote(baseSps: unknown): string | null {
  if (typeof baseSps !== "number" || !Number.isFinite(baseSps)) return null;
  return baseSps <= 0 ? MONTE_CARLO_PANEL_COPY.insufficientRelationsNote : null;
}

export function formatMonteCarloNoUsefulSamplesMessage(): string {
  return "Simulación no ejecutada: no hubo muestras útiles. Revisa el mazo (exceso de tierras o roles insuficientes).";
}

export function buildMonteCarloActivationCopy(
  enabled: boolean,
  mcStatus: "idle" | "running" | "done" | "error",
  mcResult: any | null,
): MonteCarloActivationCopy {
  if (!enabled) {
    return {
      title: "Simulación de estabilidad: desactivada",
      subtitle:
        "Actívala para estimar si el plan del mazo se mantiene ante pequeñas variaciones.",
    };
  }

  if (mcStatus === "done" && mcResult) {
    const requestedN = mcResult?.dist?.requested_n;
    const samplesText =
      typeof requestedN === "number" && Number.isFinite(requestedN)
        ? requestedN
        : 1000;
    return {
      title: "Simulación de estabilidad: completada",
      subtitle: `Resultado calculado a partir de ${samplesText} muestras.`,
    };
  }

  if (mcStatus === "running") {
    return {
      title: "Simulación de estabilidad: activada",
      subtitle: "Se está ejecutando ahora. Puede tardar unos segundos.",
    };
  }

  return {
    title: "Simulación de estabilidad: activada",
    subtitle: "Se ejecutará al analizar el mazo. Puede tardar unos segundos.",
  };
}

export function buildMonteCarloRecommendation(
  robustLevel: "low" | "mid" | "high" | "na",
  fragilityLevel: "low" | "mid" | "high" | "na",
): string | null {
  if (robustLevel === "na" && fragilityLevel === "na") {
    return MONTE_CARLO_PANEL_COPY.recommendationFallback;
  }
  if (fragilityLevel === "high") {
    return MONTE_CARLO_PANEL_COPY.recommendationBridge;
  }
  if (robustLevel === "low") {
    return MONTE_CARLO_PANEL_COPY.recommendationBridge;
  }
  return null;
}

export function formatBuildShaShort(sha?: string): string {
  if (!sha) return "unknown";
  return sha.length >= 7 ? sha.slice(0, 7) : sha;
}

export function getTaggingIssueForUi(issues: AnalyzerIssue[]): AnalyzerIssue | null {
  return (
    issues.find((issue) => issue.code === "TAGGING_ACTIVE") ??
    issues.find((issue) => issue.code === "TAGGING_UNAVAILABLE") ??
    issues.find((issue) => issue.code === "TAGGING_NO_MATCHES") ??
    null
  );
}

export function extractCardsIndexedCount(message?: string): number | null {
  if (!message) return null;
  const match = message.match(/cards indexed count:\s*(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function buildFriendlyTaggingStatus(
  issue: AnalyzerIssue | null,
  indexedCount: number | null,
): string | null {
  if (!issue) return null;
  if (issue.code === "TAGGING_ACTIVE") {
    if (indexedCount != null) {
      return `Índice de cartas cargado · ${indexedCount} cartas`;
    }
    return "Índice de cartas cargado correctamente.";
  }
  if (issue.code === "TAGGING_NO_MATCHES") {
    return "No se reconocieron cartas del mazo. Revisa idioma y nombres del export.";
  }
  if (issue.code === "TAGGING_UNAVAILABLE") {
    return "Índice de cartas no disponible en esta ejecución.";
  }
  return null;
}

export function isTechnicalTaggingIssue(issue: AnalyzerIssue): boolean {
  return issue.code.startsWith("TAGGING_");
}

export function formatAnalyzerUserIssue(issue: AnalyzerIssue): string {
  if (issue.code === "ANALYZE_FAILED") {
    return "No se pudo completar el análisis. Revisa el formato del mazo e inténtalo de nuevo.";
  }
  if (issue.message) return issue.message;
  return issue.code;
}

export function formatAnalyzerTechnicalIssue(issue: AnalyzerIssue): string {
  const severity = issue.severity ?? "info";
  if (!issue.message) {
    return `${severity}: ${issue.code}`;
  }
  return `${severity}: ${issue.code} (${issue.message})`;
}

export function getCardsIndexBaseUrl(loc?: Location): string | undefined {
  const locationRef =
    loc ??
    (typeof window !== "undefined" && window.location
      ? window.location
      : undefined);
  if (!locationRef?.origin) return undefined;
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env &&
      typeof (import.meta as any).env.BASE_URL === "string"
      ? (import.meta as any).env.BASE_URL
      : "/") || "/";
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return normalized ? `${locationRef.origin}${normalized}` : locationRef.origin;
}

export function getDebugRecommendationsFlag(
  input?: string | URL | Location,
): boolean {
  let url: URL | null = null;

  if (input instanceof URL) {
    url = input;
  } else if (typeof input === "string") {
    try {
      url = new URL(input, "http://localhost");
    } catch {
      url = null;
    }
  } else if (input && typeof input === "object" && typeof input.href === "string") {
    try {
      url = new URL(input.href);
    } catch {
      url = null;
    }
  } else if (typeof window !== "undefined" && window.location) {
    try {
      url = new URL(window.location.href);
    } catch {
      url = null;
    }
  }

  if (!url) return false;
  return new URLSearchParams(url.search).get("debugRecommendations") === "1";
}

export function parseMcParams(
  input: string | URL,
): { enabled: boolean; iterations: number; seed: number } {
  const url = typeof input === "string" ? new URL(input) : input;
  const params = new URLSearchParams(url.search);
  const enabled = params.get("mc") === "1";
  const iterations = Number(params.get("mcN") ?? "1000");
  const seed = Number(params.get("mcSeed") ?? "1");
  return { enabled, iterations, seed };
}

export function formatRoleListForUi(roles: string[]): string {
  if (roles.length === 0) return "—";
  return roles.map((role) => formatRoleLabelForUi(role)).join(", ");
}

export function formatDominantRolesForUi(
  roleCounts: Record<string, number>,
): string {
  return formatRoleListForUi(getDominantRoles(roleCounts));
}

export function explainEdgeKind(kind?: string): string {
  if (kind === "burn_supports_threat") {
    return "Daño o removal que apoya una amenaza o condición de victoria.";
  }
  if (kind === "spells_support_prowess") {
    return "Hechizos que alimentan cartas que premian lanzar hechizos.";
  }
  if (kind === "anthem_supports_tokens") {
    return "Efectos globales que mejoran fichas o criaturas.";
  }
  return "Relación detectada por el motor estructural.";
}

export function formatEdgeKindLabel(kind?: string): string {
  if (kind === "burn_supports_threat") return "Daño/removal que apoya amenazas";
  if (kind === "spells_support_prowess") return "Hechizos que alimentan recompensas por lanzar hechizos";
  if (kind === "anthem_supports_tokens") return "Efectos globales que mejoran fichas/criaturas";
  return "Relación estructural";
}

export function buildNameMapFromDeckState(deckState: any): Map<string, string> {
  const m = new Map<string, string>();
  const entries = deckState?.deck?.entries ?? [];
  for (const entry of entries) {
    if (!entry?.name_norm) continue;
    m.set(entry.name_norm, entry.name ?? entry.name_norm);
  }
  return m;
}

export function formatEdgeLine(
  e: EdgeUi,
  nameMap: Map<string, string>,
): string {
  const from = nameMap.get(e.from) ?? e.from;
  const to = nameMap.get(e.to) ?? e.to;
  const weightStr = formatNumberCompact(e.weight ?? 0, 0);
  const scoreStr = formatNumberCompact(e.score ?? 0, 1);
  return `${from} → ${to} (x${weightStr} | puntuación ${scoreStr})`;
}

export function formatEdgeCopiesLine(
  e: EdgeUi,
  countsMap: Map<string, number>,
): string | null {
  const fromCount = countsMap.get(e.from);
  const toCount = countsMap.get(e.to);
  if (fromCount == null || toCount == null) return null;
  return `copias: ${fromCount}×${toCount}`;
}

type RelationGroupForView = {
  kind: string;
  total: number;
  shown: EdgeUi[];
};

export function buildRelationGroupsForView(
  groups: ReadonlyArray<readonly [string, EdgeUi[]]>,
  viewMode: AnalyzerViewMode,
): RelationGroupForView[] {
  if (viewMode === "detailed") {
    return groups.map(([kind, list]) => ({
      kind,
      total: list.length,
      shown: list,
    }));
  }

  const perCategoryLimit = 3;
  let remaining = 5;
  const compactGroups: RelationGroupForView[] = [];
  for (const [kind, list] of groups) {
    if (remaining <= 0) break;
    const take = Math.min(list.length, perCategoryLimit, remaining);
    if (take <= 0) continue;
    compactGroups.push({
      kind,
      total: list.length,
      shown: list.slice(0, take),
    });
    remaining -= take;
  }
  return compactGroups;
}

export function formatNumberCompact(n: unknown, decimals = 1): string {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return "0";
  }
  decimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const p = 10 ** decimals;
  const rounded = Math.round(n * p) / p;
  if (decimals === 0) {
    return String(Math.round(rounded));
  }
  const s = rounded.toFixed(decimals);
  return s.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

export function formatSigned(n: unknown, decimals = 1): string {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return "0";
  }
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return sign + formatNumberCompact(Math.abs(n), decimals);
}

export function getSpsNumber(x: unknown): number {
  if (typeof x === "number") return x;
  if (x && typeof x === "object" && typeof (x as any).sps === "number") {
    return (x as any).sps;
  }
  return 0;
}

export function groupEdgesForPanel(
  edges: Array<EdgeUi>,
) {
  const m = new Map<
    string,
    Array<EdgeUi>
  >();
  for (const e of edges) {
    const k = e.kind ?? "unknown";
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e);
  }
  const entries = Array.from(m.entries()).map(([kind, list]) => {
    const sorted = [...list].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0),
    );
    const total = sorted.reduce((s, e) => s + (e.score ?? 0), 0);
    return [kind, sorted, total] as const;
  });
  entries.sort((a, b) => b[2] - a[2]);
  return entries.map(([kind, list]) => [kind, list] as const);
}

const QUICK_DENSITY_LOW = 0.05;
const QUICK_EDGES_HIGH = 8;

function getDominantRoles(
  roleCounts: Record<string, number>,
): string[] {
  const entries = Object.entries(roleCounts).filter(([, count]) => count > 0);
  if (entries.length === 0) return [];
  const nonLand = entries.filter(([role]) => role !== "LAND");
  const pool = nonLand.length > 0 ? nonLand : entries;
  return pool
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([role]) => role);
}

function getQuickDiagnosis(edgesCount: number, density: number): string {
  if (edgesCount === 0) {
    return "Mazo muy lineal: no se detectan relaciones.";
  }
  if (density < QUICK_DENSITY_LOW) {
    return "Sinergias puntuales: hay relaciones pero poca densidad.";
  }
  if (edgesCount >= QUICK_EDGES_HIGH) {
    return "Mazo con sinergias: varias relaciones activas.";
  }
  return "Mazo con algunas sinergias: hay relaciones activas moderadas.";
}
