# MTGSynergy — Card Synergy Explorer Public Beta Route Shell V1

Fecha de cierre: 2026-05-04
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_PUBLIC_BETA_ROUTE_SHELL_V1`

## Estado final confirmado

Repositorio local:

```text
C:\MTGSynergy
```

Branch final:

```text
main
```

Estado final técnico antes del cierre documental:

```text
main == origin/main == 29f5105
```

Commit de merge publicado:

```text
29f5105 merge: card synergy explorer public beta route shell v1
```

Commit de rama:

```text
2a69c46 feat(site): add card synergy explorer beta route shell v1
```

## Objetivo de la microfase

Crear la primera ruta pública estática y honesta del Card Synergy Explorer.

El objetivo era acercar el Explorador de Sinergias MTG a publicación sin prometer ranking, score, explicaciones causales ni bridges semánticos todavía.

## Archivos creados / modificados

```text
src/pages/es/explorador-de-sinergias-mtg.astro
src/pages/es/index.astro
src/pages/index.astro
```

## Cambio técnico cerrado

Se creó la nueva ruta pública:

```text
/es/explorador-de-sinergias-mtg/
```

La página nueva:

- importa solo `BaseLayout`,
- es estática,
- no importa engine,
- no usa `client:load`,
- no usa fetch,
- no ejecuta lógica interactiva,
- presenta el explorador como beta informativa,
- habla de candidatos no rankeados,
- declara explícitamente que no calcula ranking, score ni explicación causal todavía,
- enlaza al analizador actual en `/es/analizador-de-mazos-mtg/`.

También se añadió discoverability mínima:

- tarjeta del Explorador de Sinergias MTG en `/`,
- tarjeta del Explorador de Sinergias MTG en `/es/`,
- enlace hacia `/es/explorador-de-sinergias-mtg/`.

## Copy público fijado

La ruta comunica explícitamente:

```text
Explorador de Sinergias MTG (Beta)
candidatos no rankeados
No calcula ranking, score ni explicación causal de sinergia todavía.
Estado: beta informativa
Próximamente: entrada de una o dos cartas
100% client-side cuando se active la versión interactiva
```

## No-goals preservados

Esta microfase no implementa:

- formulario funcional,
- wiring real de UI al core,
- import de engine desde la página,
- AnalyzerApp,
- parser,
- semantic overlay,
- ranking,
- score,
- explanations reales,
- bridges reales,
- SPS por carta,
- Monte Carlo,
- cambios en `cards_index`,
- cambios en `public/data`,
- cambios en `package.json`,
- cambios en configuración Astro,
- cambios en layout global.

## Validación ejecutada

Post-merge en `main`:

```text
Copy obligatorio:
OK

Guardrails de sobre-promesa:
OK

Archivos prohibidos no tocados:
OK

Build:
OK

Ruta generada:
dist/es/explorador-de-sinergias-mtg/index.html

Astro build:
4 page(s) built

diff --check:
OK
```

## Lectura correcta

El proyecto pasa de tener el Card Synergy Explorer solo como pipeline interno a tener una primera presencia pública controlada.

Estado actual:

```text
pipeline interno CSE
↓
candidateOutputs no rankeados
↓
route pública beta informativa
```

La página todavía no debe interpretarse como recomendador final. Es una shell pública de beta y preparación de producto.

## Implicación para publicación

El Explorador de Sinergias MTG ya tiene URL pública construible y enlazada desde home.

Esto permite empezar a posicionar el producto sin sobreprometer y sin mezclarlo todavía con ranking semántico real.

## Siguiente fase recomendada

La siguiente microfase debería decidir entre:

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_INTERACTION_SHELL_V1
```

o

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_COPY_REFINEMENT_V1
```

La ruta más práctica es preparar una interacción muy limitada y honesta: input visual de 1–2 cartas, estado disabled o mock controlado, sin ejecutar todavía recomendaciones rankeadas.

## Estado de cierre

Microfase cerrada técnicamente en `main`.
