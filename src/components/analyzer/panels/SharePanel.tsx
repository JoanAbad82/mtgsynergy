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
      <h2>Share URL</h2>
      {shareUrl && !tooLong && (
        <>
          <textarea
            className="share-url"
            readOnly
            rows={2}
            style={{ width: "100%", overflowX: "auto", whiteSpace: "nowrap" }}
            value={shareUrl}
          />
          <button onClick={() => handleCopy(shareUrl, "link")}>
            Copiar link
          </button>
          {warn && (
            <p className="muted">
              Aviso: URL larga. Puede ser incómoda de compartir en algunas apps.
            </p>
          )}
          {copied && <p className="muted">Copiado</p>}
          {copyError && <p className="muted">{copyError}</p>}
        </>
      )}
      {tooLong && (
        <>
          <p className="muted">
            Token demasiado largo. Usa el fallback JSON.
          </p>
          <textarea
            className="share-url"
            style={{ minHeight: "120px" }}
            value={jsonFallback}
            onChange={(e) => onExportJson(e.currentTarget.value)}
          />
          <button onClick={() => handleCopy(jsonFallback, "JSON")}>
            Copiar JSON
          </button>{" "}
          <button onClick={() => onImportJson(jsonFallback)}>Importar JSON</button>
          {copied && <p className="muted">Copiado</p>}
          {copyError && <p className="muted">{copyError}</p>}
        </>
      )}
      {!token && !tooLong && (
        <p className="muted">Genera un análisis para crear un link.</p>
      )}
    </div>
  );
}
