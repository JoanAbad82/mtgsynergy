# MTGSynergy — Card Synergy Explorer Real Pool Quality Filter V1

Fecha de cierre: 2026-05-06
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_REAL_POOL_QUALITY_FILTER_V1`

## Estado final confirmado

- Repositorio local: `C:\MTGSynergy`
- Branch final: `main`
- Estado final: `main == origin/main == 3237379`
- Commit de merge publicado: `3237379`
- Rama feature: `feat/card-synergy-explorer-real-pool-quality-filter-v1`
- Commit de feature: `ec750f8 feat(site): improve card synergy explorer real pool quality filter v1`
- Base previa: `576d3f4 docs: close card synergy explorer real output copy repair v1`

## Objetivo de la microfase

Mejorar la calidad del pool real no rankeado del Card Synergy Explorer público sin introducir ranking, scoring, explicación causal ni recomendación final.

La fase mantiene el enfoque de beta pública: resultado útil, acotado y honesto, generado 100% client-side desde el índice local.

## Archivo modificado

- `src/pages/es/explorador-de-sinergias-mtg.astro`

## Cambio cerrado

Se mejoró la lógica client-side de filtrado del pool real inicial.

Cambios principales:

- preferencia interna por solape de `color_identity`, con fallback a `colors` si existe,
- señales MTG genéricas derivadas de `name`, `type_line` y `oracle_text`,
- tags de señal como damage, target, spell, cast, instant, sorcery, draw, discard, counter, token, create, graveyard, exile, sacrifice, mana, life, creature, artifact y enchantment,
- exigencia de coincidencia razonable por señales compartidas, solape de color o señal fuerte de respaldo,
- límite público de 8 candidatos,
- degradación segura con seed inválida o sin candidatos,
- salida no rankeada y no definitiva.

## Estado público correcto

La ruta pública conserva las cadenas de contrato:

- `Candidatos reales no rankeados`
- `Pool inicial filtrado`
- `Filtrado mínimo desde índice local`
- `El orden no representa ranking`
- `No son recomendaciones finales`
- `Sin ranking`
- `Sin score`
- `Sin explicación causal`
- `100% client-side`

## Guardrails preservados

La microfase no introduce:

- ranking real,
- score real,
- recomendador final,
- recomendaciones reales,
- mejor candidato,
- top candidato,
- sinergia recomendada,
- explicación causal real disponible,
- casos especiales hardcodeados por carta,
- candidatos mock/demo/fallback,
- fetch externo,
- `localStorage`,
- `sessionStorage`,
- `Date.now`,
- `Math.random`,
- imports del engine en HTML público.

## Fetch y datos

El único fetch permitido sigue siendo:

```text
fetch("/data/cards_index.json.gz")
```

El asset público validado fue:

- `/data/cards_index.json.gz`
- HTTP: `200 OK`
- Content-Type: `application/gzip`
- tamaño observado: `2466074` bytes

## Validación ejecutada

En rama feature:

- `git diff --check`: OK
- tests focales CSE: `3 passed` files / `25 passed` tests
- `npm run build`: OK
- scope exacto: solo `src/pages/es/explorador-de-sinergias-mtg.astro`
- fetch único/local: OK
- ausencia de hardcoded candidates: OK
- no-overpromise source/dist: OK

Post-merge en `main`:

- `HEAD == origin/main == 3237379`
- build validado antes del merge
- push a `main` correcto

Smoke público:

- URL: `/es/explorador-de-sinergias-mtg/`
- HTTP: `200 OK`
- HTML descargado: `31203` bytes
- required strings públicas: OK
- fetch público único: `/data/cards_index.json.gz`
- cards index público servido correctamente: OK
- no-overpromise strings: OK
- limpieza temporal: OK
- working tree final: limpio

## Lectura correcta

El Card Synergy Explorer público ya puede mostrar un pool real inicial más razonable que el filtro anterior, pero todavía no debe interpretarse como ranking, recomendación final, scoring ni explicación causal.

## Estado de cierre

Microfase cerrada técnicamente en `main`, publicada y validada en producción.

Este documento cierra la trazabilidad documental de la microfase.
