# MTGSynergy — Card Synergy Explorer Public Beta Client State Polish V1

Fecha de cierre: 2026-05-05
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_PUBLIC_BETA_CLIENT_STATE_POLISH_V1`

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
main == origin/main == abe5abd
```

Commit de merge publicado:

```text
abe5abd merge: card synergy explorer public beta client state polish v1
```

Commit de rama:

```text
33f7e09 feat(site): polish card synergy explorer beta client state v1
```

## Objetivo de la microfase

Pulir la primera shell client-side local del Card Synergy Explorer para mejorar claridad, accesibilidad básica y control visual del estado de entrada.

El objetivo era mejorar la experiencia de la beta pública sin conectar todavía el motor, sin generar candidatos reales, sin ranking, sin score y sin explicación causal.

## Archivo modificado

```text
src/pages/es/explorador-de-sinergias-mtg.astro
```

## Cambio técnico cerrado

Se refinó la sección `Entrada beta` manteniendo inputs editables para:

```text
Carta seed 1
Carta seed 2 opcional
```

Cambios principales:

- el botón `Preparar entrada beta` ahora refleja estado visual cuando `Carta seed 1` está vacía,
- se añadió `data-ready="false"` como estado inicial del botón,
- se añadió `aria-disabled="true"` como señal accesible inicial,
- el botón sigue siendo clicable para poder mostrar feedback local,
- se añadió soporte de tecla Enter en ambos inputs,
- se añadió el botón local `Limpiar entrada`,
- el panel de estado mantiene `aria-live="polite"`,
- se separa el mensaje principal de la nota de no generación real.

## Comportamiento fijado

Mensajes principales:

```text
Introduce al menos una carta seed.
Entrada preparada localmente.
Esta beta todavía no genera candidatos reales.
```

El flujo de la shell queda así:

```text
usuario escribe seed 1 y seed 2 opcional
↓
pulsa Preparar entrada beta o Enter
↓
la página actualiza estado local
↓
no genera candidatos reales
↓
no ejecuta ranking, score ni explicación causal
```

El botón `Limpiar entrada` borra ambos inputs, restaura el estado inicial y devuelve el foco al primer input.

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
Copy y polish client-state:
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
Limpiar entrada
Introduce al menos una carta seed
Entrada preparada localmente
todavía no genera candidatos reales

Astro build:
4 page(s) built

diff --check:
OK
```

## Lectura correcta

El Explorador de Sinergias MTG ya tiene una beta pública con una shell local más clara y usable.

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
↓
polish de estado, Enter y limpieza local
```

La ruta sigue sin ser un recomendador final. No genera candidatos reales todavía y no debe presentarse como ranking de sinergia.

## Implicación para publicación

La página pública ya se siente más cercana a una herramienta real, pero conserva límites honestos: prepara una entrada local y comunica explícitamente que todavía no genera resultados.

Esto mejora la percepción de producto sin introducir falsas promesas semánticas.

## Siguiente fase recomendada

Antes de seguir con más producto, conviene hacer smoke test público de despliegue:

```text
PUBLIC_SMOKE_TEST_CSE_CLIENT_STATE_POLISH_V1
```

Después, las siguientes rutas razonables son:

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_UNRANKED_OUTPUT_PREVIEW_CONTRACT_V1
```

o

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_CLIENT_STATE_COPY_REFINEMENT_V1
```

La opción más prudente es validar primero producción y luego diseñar un preview de salida no rankeada sin conectar todavía ranking/scoring.

## Estado de cierre

Microfase cerrada técnicamente en `main`.
