# MTGSynergy — Card Synergy Explorer Public Beta Client State Shell V1

Fecha de cierre: 2026-05-05
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_PUBLIC_BETA_CLIENT_STATE_SHELL_V1`

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
main == origin/main == a7ec846
```

Commit de merge publicado:

```text
a7ec846 merge: card synergy explorer public beta client state shell v1
```

Commit de rama:

```text
5413825 feat(site): add card synergy explorer beta client state shell v1
```

## Objetivo de la microfase

Convertir la interaction shell visual del Card Synergy Explorer en una primera shell client-side local, todavía sin ejecutar el motor.

El objetivo era permitir escritura en las cartas seed y preparar un estado local mínimo para comunicar la futura interacción, sin generar candidatos reales, sin ranking, sin score y sin explicación causal.

## Archivo modificado

```text
src/pages/es/explorador-de-sinergias-mtg.astro
```

## Cambio técnico cerrado

La sección `Entrada beta` dejó de ser únicamente visual/deshabilitada y pasó a tener estado local client-side:

```text
Carta seed 1
Carta seed 2 opcional
Preparar entrada beta
panel de estado local
```

La shell ahora permite:

- escribir en `Carta seed 1`,
- escribir opcionalmente en `Carta seed 2`,
- pulsar `Preparar entrada beta`,
- mostrar aviso si falta la primera carta seed,
- mostrar `Seed 1 detectada`,
- mostrar `Seed 2 detectada` cuando existe,
- mostrar `Entrada preparada localmente. Esta beta todavía no genera candidatos reales.`

## Implementación

Se añadió un script vanilla inline, limitado a la sección mediante `data-cse-beta-entry`.

El script:

- no importa módulos,
- no usa engine,
- no usa componentes Preact,
- no usa `client:load`,
- no usa fetch,
- no usa almacenamiento local,
- solo lee inputs locales y actualiza texto de estado en la misma página.

## Comportamiento fijado

La página puede preparar visualmente una entrada local, pero todavía no calcula nada.

El estado correcto de producto sigue siendo:

```text
entrada local preparada
↓
sin generación real de candidatos
↓
sin ranking
↓
sin score
↓
sin explicación causal
```

## No-goals preservados

Esta microfase no implementa:

- ejecución real del motor,
- import de `runCardSynergyExplorerCoreSkeleton`,
- import de `createCardSynergyCardsIndexAdapter`,
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
- fetch,
- Date.now,
- Math.random,
- localStorage,
- sessionStorage,
- cambios en `cards_index`,
- cambios en `public/data`,
- cambios en `src/engine`,
- cambios en `src/components`,
- cambios en `package.json`,
- cambios en configuración Astro,
- cambios en layout global,
- cambios en estilos globales.

## Validación ejecutada

Post-merge en `main`:

```text
Copy obligatorio y client-state shell:
OK

Guardrails funcionales:
OK

Guardrails de sobre-promesa:
OK

Archivos prohibidos no tocados:
OK

Build:
OK

Ruta generada:
dist/es/explorador-de-sinergias-mtg/index.html

Ruta generada contiene:
Explorador de Sinergias MTG
Entrada beta
Carta seed 1
Carta seed 2 opcional
Preparar entrada beta
Entrada preparada localmente
todavía no genera candidatos reales

Astro build:
4 page(s) built

diff --check:
OK
```

## Lectura correcta

El Explorador de Sinergias MTG ya tiene una página beta pública con estado local mínimo de entrada.

Estado actual:

```text
pipeline interno CSE
↓
candidateOutputs no rankeados
↓
route pública beta informativa
↓
paleta pública sobria y legible
↓
interaction shell visual
↓
client-state shell local
```

La ruta sigue sin ser un recomendador final. No genera candidatos reales todavía y no debe presentarse como ranking de sinergia.

## Implicación para publicación

La página pública ya permite al usuario entender el flujo futuro: introducir una o dos cartas, preparar la entrada localmente y ver que la beta todavía no genera resultados reales.

Esto mejora la percepción de producto sin cruzar todavía la línea de recomendaciones sinérgicas no justificadas.

## Siguiente fase recomendada

Antes de conectar el motor real, conviene realizar un smoke test público de despliegue:

```text
PUBLIC_SMOKE_TEST_CSE_CLIENT_STATE_SHELL_V1
```

Después, la siguiente microfase de producto podría ser:

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_CLIENT_STATE_POLISH_V1
```

o una fase técnica muy controlada:

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_UNRANKED_OUTPUT_PREVIEW_CONTRACT_V1
```

No conviene conectar todavía ranking/scoring hasta tener bridges semánticos reales o un gate público extremadamente claro.

## Estado de cierre

Microfase cerrada técnicamente en `main`.
