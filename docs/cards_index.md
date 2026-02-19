# Cards Index (Scryfall Bulk)

## Regenerar el índice

```powershell
npm run cards:index:build
```

Genera los artefactos estáticos:
- `public/data/cards_index.json.gz`
- `public/data/cards_index.manifest.json`

## Verificar integridad

```powershell
npm run cards:index:verify
```

Valida el `sha256` del `.gz` y el `record_count` contra el manifest.

## Runtime
El runtime **no descarga** datos desde Scryfall. Solo consume los assets estáticos generados en build:
- `GET /data/cards_index.json.gz`
- `GET /data/cards_index.manifest.json`

