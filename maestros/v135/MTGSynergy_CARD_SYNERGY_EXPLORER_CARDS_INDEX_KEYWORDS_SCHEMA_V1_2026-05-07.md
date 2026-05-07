# MTGSynergy — Cierre de Microfase

## 1) Microfase
`CARD_SYNERGY_EXPLORER_CARDS_INDEX_KEYWORDS_SCHEMA_V1`

## 2) Tipo
Infraestructura de datos / schema aditivo del índice local.

## 3) Objetivo
Añadir soporte real de `keywords` al `cards_index` estático para que `CardRecordMin` pueda transportar `record.keywords` en runtime.

## 4) Contexto
Antes del cambio, el diagnóstico mostró:
- `total_records: 36063`
- `records_with_keywords_array: 0`
- `records_with_non_empty_keywords: 0`

Por eso se descartó un primer WIP de filtro CSE basado en `keywords`: era funcionalmente neutro porque el índice no contenía `keywords`.

## 5) Archivos modificados en la microfase operativa
- `scripts/build_cards_index.mjs`
- `src/engine/cards/lookup.ts`
- `src/engine/__tests__/analyze_async_tagging.test.ts`
- `src/engine/__tests__/cards_index_verify.test.ts`
- `src/engine/__tests__/cards_lookup.test.ts`
- `src/engine/__tests__/enrich_cards_index.test.ts`
- `public/data/cards_index.json.gz`
- `public/data/cards_index.manifest.json`

## 6) Cambios
- `build_cards_index` extrae `card.keywords` de Scryfall cuando existen.
- `keywords` se normalizan como strings no vacíos.
- Deduplicación case-insensitive.
- Emisión aditiva en `by_name[name]`.
- `lookupCard` y `listCardsIndexRecords` preservan `keywords`.
- Compatibilidad con payloads antiguos sin `keywords`.
- `schema_version` se mantiene como `cardrecordmin-v1` porque el cambio es aditivo.

## 7) Commits
Feature commit:
- `2b63d05 feat(cards): add keywords to cards index schema`

Merge commit:
- `0016318 merge: card synergy explorer cards index keywords schema v1`

Estado final:
- `main == origin/main == 0016318`

## 8) Datos antes
- `cards_index.json.gz: 2466074 bytes`
- `record_count: 36063`
- `records_with_non_empty_keywords: 0`
- Bulk anterior: `oracle-cards-20260424090248.json`

## 9) Datos después
- `cards_index.json.gz: 2576651 bytes`
- `record_count: 36267`
- `records_with_non_empty_keywords: 16419`
- Bulk nuevo: `oracle-cards-20260507090253.json`
- `sha256_gz: 487aa7a21a42b3ff8a2f9ab627c1d06a6952cc3beab5ae1ab27f5b262fccd424`

## 10) Aumento
- `+110577 bytes`
- Aprox. `+4.48%`

## 11) Validación local
- `npm run cards:index:build` OK
- `npm run cards:index:verify` OK
- Tests índice: `4 files / 17 tests passed`
- Ring CSE contractual: `14 files / 109 tests passed`
- `npm run build` OK
- `git diff --check` OK

## 12) Validación pública
- Manifest público: HTTP `200`
- `cards_index` público: HTTP `200`
- `sha256` descargado == `sha256` manifest
- `records_with_non_empty_keywords: 16419`
- `/es/explorador-de-sinergias-mtg/`: HTTP `200`
- `/es/analizador-de-mazos-mtg/`: HTTP `200`

Guardrails públicos CSE preservados:
- Candidatos reales no rankeados
- Pool inicial filtrado
- Filtrado mínimo desde índice local
- El orden no representa ranking
- No son recomendaciones finales
- Sin ranking
- Sin score
- Sin explicación causal
- 100% client-side

## 13) Fuera de alcance
- No se tocó `src/pages/es/explorador-de-sinergias-mtg.astro`.
- No se introdujo ranking.
- No se introdujo score.
- No se introdujeron recomendaciones finales.
- No se introdujo explicación causal real.
- No se introdujo fetch externo.
- No `localStorage` / `sessionStorage` / `Date.now` / `Math.random`.

## 14) Lectura final
La microfase no mejora por sí sola el output público del CSE porque la página aún no usa `keywords`, pero desbloquea una microfase posterior.

## 15) Siguiente microfase recomendada
`CARD_SYNERGY_EXPLORER_REAL_POOL_KEYWORD_SIGNAL_FILTER_V2`

Objetivo futuro:
Usar `record.keywords` reales en el filtro público del Card Synergy Explorer manteniendo salida no rankeada, sin score, sin ranking y sin recomendaciones finales.
