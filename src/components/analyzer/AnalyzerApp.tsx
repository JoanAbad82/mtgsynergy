import { useEffect, useMemo, useState } from "preact/hooks";
import type { DeckState, ShareDeckState, StructuralSummary } from "../../engine";
import {
  computeStructuralSummary,
  decodeShareState,
  encodeShareState,
  exportShareJson,
  importShareJson,
  isShareWarn,
} from "../../engine";
import { parseMtgaExport } from "../../engine";
import { getShareTokenFromUrl, setShareTokenInUrl } from "./state/shareUrl";
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
  const [issues, setIssues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const [jsonFallback, setJsonFallback] = useState("");

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

  function analyze(text: string) {
    setError(null);
    setTooLong(false);
    const parsed = parseMtgaExport(text);
    setIssues(parsed.issues.map((i) => `${i.severity}: ${i.code} (${i.message})`));

    const ds: DeckState = {
      deck: parsed.deck,
      edges: [],
      pipelines_active: [],
    };
    const s = computeStructuralSummary(ds);
    const shareJson = exportShareJson(ds);
    setJsonFallback(shareJson);

    try {
      const token = encodeShareState(ds);
      const nextUrl = setShareTokenInUrl(new URL(window.location.href), token);
      window.history.replaceState({}, "", nextUrl.toString());
      setShareToken(token);
      setShareUrl(nextUrl.toString());
      setDeckState(ds as ShareDeckState);
      setSummary(s);
    } catch (err) {
      if (err instanceof Error && err.message === "SHARE_URL_TOO_LONG") {
        setTooLong(true);
        setShareToken(null);
        setShareUrl(null);
        setDeckState(ds as ShareDeckState);
        setSummary(s);
      } else {
        setError("Error inesperado al generar share link.");
      }
    }
  }

  function handleAnalyze() {
    analyze(inputText);
  }

  function handleLoadExample(text: string) {
    setInputText(text);
    analyze(text);
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
        <button onClick={handleAnalyze}>Analizar</button>
        {issues.length > 0 && (
          <ul className="issues">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
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
