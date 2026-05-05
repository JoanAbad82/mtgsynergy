# MTGSynergy — Card Synergy Explorer Unranked Output Preview Shell V1

Fecha de cierre: 2026-05-05
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_UNRANKED_OUTPUT_PREVIEW_SHELL_V1`

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
main == origin/main == 90ceaf8
```

Commit de merge publicado:

```text
90ceaf8 merge: card synergy explorer unranked output preview shell v1
```

Commit de rama:

```text
c52d72d feat(site): add card synergy explorer unranked output preview shell v1
```

## Objetivo de la microfase

Añadir una primera vista previa de salida pública para el Card Synergy Explorer sin mostrar candidatos reales ni simular recomendaciones.

El objetivo era preparar visualmente el espacio donde aparecerán futuros `candidateOutputs` no rankeados, manteniendo la beta honesta y sin ranking, score ni explicación causal.

## Archivo modificado

```text
src/pages/es/explorador-de-sinergias-mtg.astro
```

## Cambio técnico cerrado

Se añadió una nueva tarjeta pública:

```text
Vista previa de salida
```

La sección comunica:

- que la futura salida mostrará candidatos no rankeados,
- que todavía no hay candidatos generados,
- que cuando se active la versión interactiva aparecerán candidatos no rankeados,
- que no calcula ranking,
- que no calcula score,
- que no genera explicación causal.

También se añadió CSS local mínimo para mantener estilo sobrio y legible:

```text
.beta-output-empty
.beta-output-empty-title
.beta-output-guardrails
```

## Comportamiento fijado

La página ahora tiene tres bloques públicos progresivos:

```text
Entrada beta local
↓
estado local de preparación
↓
vista previa de salida no rankeada todavía vacía
```

La vista previa no muestra cartas reales, no muestra ejemplos simulados y no presenta recomendaciones.

## No-goals preservados

Esta microfase no implementa:

- generación real de candidatos,
- conexión del UI al core,
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
Copy y output preview shell:
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
Vista previa de salida
Todavía no hay candidatos generados
aquí aparecerán candidatos no rankeados
No calcula ranking
No calcula score
No genera explicación causal

Astro build:
4 page(s) built

diff --check:
OK
```

## Lectura correcta

El Explorador de Sinergias MTG ya tiene una página beta pública con flujo visual completo, aunque todavía no funcional como recomendador.

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
↓
output preview shell vacía y no rankeada
```

La ruta sigue sin generar candidatos reales. No debe presentarse como ranking de sinergia ni como recomendador final.

## Implicación para publicación

La página pública ya comunica el flujo futuro completo: introducir cartas seed, preparar entrada local y ver dónde aparecerán candidatos no rankeados.

Esto mejora la percepción de producto sin introducir falsas promesas ni resultados inventados.

## Siguiente fase recomendada

Antes de seguir con más producto, conviene hacer smoke test público de despliegue:

```text
PUBLIC_SMOKE_TEST_CSE_UNRANKED_OUTPUT_PREVIEW_SHELL_V1
```

Después, la siguiente decisión razonable es elegir entre:

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_UNRANKED_OUTPUT_PREVIEW_STATE_V1
```

o

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_COPY_REFINEMENT_V1
```

No conviene conectar ranking/scoring todavía. El siguiente paso técnico, si se hace, debería limitarse a un preview no rankeado extremadamente controlado.

## Estado de cierre

Microfase cerrada técnicamente en `main`.
