import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { DeckState, ShareDeckState, StructuralSummary } from "../../engine";
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
import { buildShareUrl, getShareTokenFromUrl } from "./state/shareUrl";
import { exportJson, importJson } from "./state/jsonFallback";
import StructuralPanel from "./panels/StructuralPanel";
import RoleGraphPanel from "./panels/RoleGraphPanel";
import SharePanel from "./panels/SharePanel";
import AnalysisStatusPanel from "./panels/AnalysisStatusPanel";
import HowItWorksSection from "./sections/HowItWorksSection";
import ExamplesSection from "./sections/ExamplesSection";
import FaqSection from "./sections/FaqSection";
import LabCTASection from "./sections/LabCTASection";

export default function AnalyzerApp() {
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
  const mcRunId = useRef(0);
  const edges = (deckState as any)?.edges ?? [];
  const edgesByKind = useMemo(() => groupEdgesForPanel(edges), [edges]);
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

  const warn = useMemo(
    () => (shareToken ? isShareWarn(shareToken) : false),
    [shareToken],
  );

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
    } catch (err) {
      setError("No se pudo cargar el share link.");
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

  async function analyze(text: string) {
    setError(null);
    setTooLong(false);
    setIsAnalyzing(true);
    setShareImported(false);
    setJsonImported(false);

    try {
      const res = await analyzeMtgaExportAsync(text, { enableCardIndex: true });
      setIssues(res.issues);
      setDeckState(res.deckState as ShareDeckState);
      setSummary(res.summary);

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
          setError("Error inesperado al generar share link.");
        }
      }
    } catch (e) {
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
      <div className="panel">
        <span className="badge">Próximamente: Simulación Monte Carlo</span>
        <p className="muted" style={{ marginTop: "10px" }}>
          Pega un export de MTG Arena para analizar la estructura.
        </p>
        <p className="muted">build: {BUILD_SHA}</p>
        <textarea
          placeholder="Pega aquí tu export de MTG Arena..."
          value={inputText}
          onChange={(e) => setInputText(e.currentTarget.value)}
        />
        <button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? "Analizando..." : "Analizar"}
        </button>
        {issues.length > 0 && (
          <ul className="issues">
            {issues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>
                {issue.severity}: {issue.code} ({issue.message})
              </li>
            ))}
          </ul>
        )}
        {error && <p className="muted">{error}</p>}
      </div>

      <HowItWorksSection />
      <ExamplesSection onLoadExample={handleLoadExample} />

      <div className="panel">
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={mcParams.enabled}
            onChange={(e) => handleToggleMonteCarlo(e.currentTarget.checked)}
          />
          <span>Activar Monte Carlo (experimental)</span>
        </label>
        <p className="muted" style={{ marginTop: "6px" }}>
          Calcula estabilidad/robustez. Puede tardar y no siempre aplica.
        </p>
      </div>

      <AnalysisStatusPanel
        summary={summary}
        deckState={deckState}
        issues={issues}
        shareImported={shareImported}
        jsonImported={jsonImported}
        mcParams={mcParams}
        mcStatus={mcStatus}
        mcResult={mcResult}
        mcError={mcError}
      />

      {summary && (
        <>
          <div className="panel">
            <h2>Resultado rápido</h2>
            <p className="muted">Resumen orientativo para lectura rápida.</p>
            <p>
              <span title="Structural Power Score (SPS)">
                Puntuación estructural (SPS)
              </span>
              : {formatNumberCompact(summary.structuralPowerScore, 1)}
            </p>
            <p>
              Sinergias detectadas: {summary.edges_total} ·{" "}
              <span title="Densidad del grafo de roles">Densidad</span>:{" "}
              {formatNumberCompact(summary.density, 3)}
            </p>
            <p>
              <span title="Roles con mayor presencia en el mazo">
                Roles dominantes
              </span>
              : {getDominantRoles(summary.role_counts).join(", ") || "—"}
            </p>
            <p>{getQuickDiagnosis(summary.edges_total, summary.density)}</p>
          </div>
          <StructuralPanel summary={summary} />
          <RoleGraphPanel summary={summary} />
          {mcParams.enabled && (
            <div className="panel">
              <h2>Monte Carlo (experimental)</h2>
              <p className="muted">
                MC Status / Reason:{" "}
                {mcStatus === "running"
                  ? "Running Monte Carlo… (puede tardar)"
                  : mcStatus === "error"
                    ? `Error: ${mcError ?? "Unknown error"}`
                    : mcStatus === "done" && !mcResult
                      ? "MC no disponible (sin resultados)."
                      : mcStatus === "done" && mcResult?.base?.sps <= 0
                        ? "MC omitido: SPS base ≤ 0 (no hay edges/relaciones suficientes). Prueba con un mazo con sinergias."
                        : mcStatus === "done" && mcResult?.dist?.effective_n === 0
                          ? `MC omitido: conjunto elegible degenerado (effective_n=0). Revisa el deck (exceso de LAND o roles insuficientes).${
                              mcResult?.warnings?.some(
                                (w: any) => w.code === "DEGENERATE_ELIGIBLE_SET",
                              )
                                ? " (warning: DEGENERATE_ELIGIBLE_SET)"
                                : ""
                            }`
                          : mcStatus === "idle"
                            ? "MC pendiente: analiza un mazo para ejecutar."
                            : "MC listo."}
              </p>
              {mcStatus === "done" && mcResult && (
                <>
                  <p>Base SPS: {mcResult.base.sps}</p>
                  <p>
                    seed: {mcResult.settings.seed} · iterations:{" "}
                    {mcResult.settings.iterations}
                  </p>
                  <p>
                    effective_n / requested_n: {mcResult.dist.effective_n} /{" "}
                    {mcResult.dist.requested_n} (no_op: {mcResult.dist.no_op})
                  </p>
                  <p>Robust SPS: {mcResult.metrics.robust_sps}</p>
                  <p>Fragility: {mcResult.metrics.fragility}</p>
                  {mcResult.dist_ext ? (
                    <>
                      <p>
                        Percentiles: p05{" "}
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
                        mean ± stdev:{" "}
                        {formatNumberCompact(mcResult.dist_ext.mean, 1)} ±{" "}
                        {formatNumberCompact(mcResult.dist_ext.stdev, 1)}
                      </p>
                      <p>
                        IQR: {formatNumberCompact(mcResult.dist_ext.iqr, 1)}
                      </p>
                      <p>
                        min–max:{" "}
                        {formatNumberCompact(mcResult.dist_ext.min, 1)} –{" "}
                        {formatNumberCompact(mcResult.dist_ext.max, 1)}
                      </p>
                      <p>
                        Δ(p50):{" "}
                        {formatSigned(mcResult.dist_ext.deltas_abs_vs_base.p50, 1)}{" "}
                        SPS points · Δ(p10):{" "}
                        {formatSigned(mcResult.dist_ext.deltas_abs_vs_base.p10, 1)}{" "}
                        SPS points · Δ(p90):{" "}
                        {formatSigned(mcResult.dist_ext.deltas_abs_vs_base.p90, 1)}{" "}
                        SPS points
                      </p>
                    </>
                  ) : (
                    <p className="muted">Extended stats not available</p>
                  )}
                  {mcResult.warnings?.length > 0 && (
                    <ul className="issues">
                      {mcResult.warnings.map((w: any) => (
                        <li key={`${w.code}-${w.detail}`}>
                          warning: {w.code} ({w.detail})
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
          <div className="panel">
            <h2>Relaciones (sinergias)</h2>
            <p className="muted">
              Relaciones detectadas entre roles del mazo.
            </p>
            <p className="muted">Relaciones detectadas: {edges.length}</p>
            {edges.length === 0 ? (
              <p className="muted">No se detectaron relaciones.</p>
            ) : (
              edgesByKind.map(([kind, list]) => (
                <div key={kind}>
                  <h3>
                    {kind} ({list.length})
                  </h3>
                  <p className="muted">{explainEdgeKind(kind)}</p>
                  <ul>
                    {list.map((e) => (
                      <li key={`${e.kind}|${e.from}|${e.to}`}>
                        {formatEdgeLine(e, nameMap)}
                        {countsMap.has(e.from) && countsMap.has(e.to) && (
                          <div className="muted">
                            counts: {countsMap.get(e.from)}×{countsMap.get(e.to)}
                          </div>
                        )}
                      </li>
                    ))}
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
      <LabCTASection />
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

export const BUILD_SHA = "1674eec";

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

export function explainEdgeKind(kind?: string): string {
  if (kind === "burn_supports_threat") {
    return "Burn elimina bloqueadores y abre ataques para amenazas baratas.";
  }
  if (kind === "spells_support_prowess") {
    return "Instant/Sorcery disparan prowess y convierten hechizos en daño extra.";
  }
  if (kind === "anthem_supports_tokens") {
    return "Anthem multiplica el valor de tokens y anchos de mesa.";
  }
  return "Relación detectada por heurísticas (beta).";
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
  return `${from} → ${to} (x${weightStr} | score ${scoreStr})`;
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
