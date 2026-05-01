import { useEffect, useState } from "preact/hooks";
import { copyToClipboard } from "../state/copyToClipboard";

type Props = {
  token: string | null;
  shareUrl: string | null;
  warn: boolean;
  tooLong: boolean;
  jsonFallback: string;
  onImportJson: (json: string) => void;
  onExportJson: (json: string) => void;
};

export const SHARE_PANEL_COPY = {
  title: "Comparte este análisis",
  intro:
    "El mazo se codifica localmente en la URL. No se envía a ningún servidor.",
  copyLinkButton: "Copiar enlace",
  fullUrlDetails: "Ver URL completa",
  longUrlWarning:
    "Aviso: URL larga. Puede ser incómoda de compartir en algunas apps.",
  copied: "Copiado",
  tooLongHint: "Token demasiado largo. Usa el fallback JSON.",
  copyJsonButton: "Copiar JSON",
  importJsonButton: "Importar JSON",
  emptyState: "Genera un análisis para crear un enlace.",
} as const;

export default function SharePanel({
  token,
  shareUrl,
  warn,
  tooLong,
  jsonFallback,
  onImportJson,
  onExportJson,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  async function handleCopy(text: string, label: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyError(null);
      setCopied(true);
    } else {
      setCopyError(`No se pudo copiar ${label}.`);
    }
  }

  return (
    <div className="panel share-panel">
      <h2>{SHARE_PANEL_COPY.title}</h2>
      <p className="muted share-panel-help">{SHARE_PANEL_COPY.intro}</p>
      {shareUrl && !tooLong && (
        <div className="share-panel-box">
          <div className="share-panel-actions">
            <button onClick={() => handleCopy(shareUrl, "enlace")}>
              {SHARE_PANEL_COPY.copyLinkButton}
            </button>
          </div>
          <details className="share-url-details">
            <summary>{SHARE_PANEL_COPY.fullUrlDetails}</summary>
            <textarea
              className="share-url"
              readOnly
              rows={2}
              style={{ width: "100%", overflowX: "auto", whiteSpace: "nowrap" }}
              value={shareUrl}
            />
          </details>
          {warn && (
            <p className="muted">
              {SHARE_PANEL_COPY.longUrlWarning}
            </p>
          )}
          {copied && <p className="muted">{SHARE_PANEL_COPY.copied}</p>}
          {copyError && <p className="muted">{copyError}</p>}
        </div>
      )}
      {tooLong && (
        <div className="share-panel-box">
          <p className="muted">
            {SHARE_PANEL_COPY.tooLongHint}
          </p>
          <textarea
            className="share-url"
            style={{ minHeight: "120px" }}
            value={jsonFallback}
            onChange={(e) => onExportJson(e.currentTarget.value)}
          />
          <div className="share-panel-actions">
            <button onClick={() => handleCopy(jsonFallback, "JSON")}>
              {SHARE_PANEL_COPY.copyJsonButton}
            </button>
            <button onClick={() => onImportJson(jsonFallback)}>{SHARE_PANEL_COPY.importJsonButton}</button>
          </div>
          {copied && <p className="muted">{SHARE_PANEL_COPY.copied}</p>}
          {copyError && <p className="muted">{copyError}</p>}
        </div>
      )}
      {!token && !tooLong && (
        <p className="muted">{SHARE_PANEL_COPY.emptyState}</p>
      )}
    </div>
  );
}
