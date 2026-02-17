import { useEffect, useMemo, useState } from "preact/hooks";
import type { ShareDeckState, StructuralSummary } from "../../engine";
import {
  analyzeMtgaExportAsync,
  computeStructuralSummary,
  decodeShareState,
  encodeShareState,
  exportShareJson,
  importShareJson,
  isShareWarn,
} from "../../engine";
import { buildShareUrl, getShareTokenFromUrl } from "./state/shareUrl";
import { exportJson, importJson } from "./state/jsonFallback";
import StructuralPanel from "./panels/StructuralPanel";
import RoleGraphPanel from "./panels/RoleGraphPanel";
import SharePanel from "./panels/SharePanel";
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
  const [tooLong, setTooLong] = useState(false);
  const [jsonFallback, setJsonFallback] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const edges = (deckState as any)?.edges ?? [];
  const edgesByKind = useMemo(() => groupEdgesForPanel(edges), [edges]);

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
    } catch (err) {
      setError("No se pudo cargar el share link.");
    }
  }, []);

  async function analyze(text: string) {
    setError(null);
    setTooLong(false);
    setIsAnalyzing(true);

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
    } catch {
      setError("JSON inválido.");
    }
  }

  return (
    <div className="analyzer">
      <div className="panel">
        <span className="badge">Próximamente: Simulación Monte Carlo</span>
        <p className="muted" style={{ marginTop: "10px" }}>
          Pega un export de MTG Arena para analizar la estructura.
        </p>
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

      {summary && (
        <>
          <StructuralPanel summary={summary} />
          <RoleGraphPanel summary={summary} />
          <div className="panel">
            <h2>Edges</h2>
            <p className="muted">Edges detectados: {edges.length}</p>
            {edges.length === 0 ? (
              <p className="muted">No se detectaron relaciones.</p>
            ) : (
              edgesByKind.map(([kind, list]) => (
                <div key={kind}>
                  <h3>
                    {kind} ({list.length})
                  </h3>
                  <ul>
                    {list.map((e) => (
                      <li key={`${e.kind}|${e.from}|${e.to}`}>
                        {e.from} → {e.to} (x{e.weight ?? 0} | score {e.score ?? 0})
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

export function groupEdgesForPanel(
  edges: Array<{
    from: string;
    to: string;
    kind?: string;
    weight?: number;
    score?: number;
  }>,
) {
  const m = new Map<
    string,
    Array<{ from: string; to: string; kind?: string; weight?: number; score?: number }>
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
