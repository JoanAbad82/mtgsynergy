import type { ShareDeckState } from "../../../engine";

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
  return (
    <div className="panel">
      <h2>Share URL</h2>
      {shareUrl && !tooLong && (
        <>
          <input className="share-url" readOnly value={shareUrl} />
          {warn && (
            <p className="muted">
              Aviso: URL larga. Podría ser difícil de compartir.
            </p>
          )}
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
          <button onClick={() => onImportJson(jsonFallback)}>
            Importar JSON
          </button>
        </>
      )}
      {!token && !tooLong && (
        <p className="muted">Genera un análisis para crear un link.</p>
      )}
    </div>
  );
}
