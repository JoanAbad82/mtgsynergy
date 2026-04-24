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
  title: "URL para compartir",
  copyLinkButton: "Copiar enlace",
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
    <div className="panel">
      <h2>{SHARE_PANEL_COPY.title}</h2>
      {shareUrl && !tooLong && (
        <>
          <textarea
            className="share-url"
            readOnly
            rows={2}
            style={{ width: "100%", overflowX: "auto", whiteSpace: "nowrap" }}
            value={shareUrl}
          />
          <button onClick={() => handleCopy(shareUrl, "enlace")}>
            {SHARE_PANEL_COPY.copyLinkButton}
          </button>
          {warn && (
            <p className="muted">
              {SHARE_PANEL_COPY.longUrlWarning}
            </p>
          )}
          {copied && <p className="muted">{SHARE_PANEL_COPY.copied}</p>}
          {copyError && <p className="muted">{copyError}</p>}
        </>
      )}
      {tooLong && (
        <>
          <p className="muted">
            {SHARE_PANEL_COPY.tooLongHint}
          </p>
          <textarea
            className="share-url"
            style={{ minHeight: "120px" }}
            value={jsonFallback}
            onChange={(e) => onExportJson(e.currentTarget.value)}
          />
          <button onClick={() => handleCopy(jsonFallback, "JSON")}>
            {SHARE_PANEL_COPY.copyJsonButton}
          </button>{" "}
          <button onClick={() => onImportJson(jsonFallback)}>{SHARE_PANEL_COPY.importJsonButton}</button>
          {copied && <p className="muted">{SHARE_PANEL_COPY.copied}</p>}
          {copyError && <p className="muted">{copyError}</p>}
        </>
      )}
      {!token && !tooLong && (
        <p className="muted">{SHARE_PANEL_COPY.emptyState}</p>
      )}
    </div>
  );
}
