# MTGSynergy — Card Synergy Explorer Unranked Output Preview State V1

Fecha de cierre: 2026-05-05
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_UNRANKED_OUTPUT_PREVIEW_STATE_V1`

## Estado final confirmado

- Repositorio local: `C:\MTGSynergy`
- Branch final: `main`
- Estado final técnico antes del cierre documental: `main == origin/main == 4f9cbc9`
- Commit de merge publicado: `4f9cbc9 merge: card synergy explorer unranked output preview state v1`
- Commit de rama: `03c675a feat(site): add card synergy explorer unranked output preview state v1`

## Objetivo de la microfase

Conectar localmente la sección `Vista previa de salida` al estado de la sección `Entrada beta`, sin generar candidatos reales ni conectar todavía el motor.

La página pública pasa a mostrar una salida beta reactiva al estado local de las cartas seed, manteniendo límites explícitos: salida no rankeada, sin ranking, sin score, sin explicación causal y sin candidatos reales.

## Archivo modificado

- `src/pages/es/explorador-de-sinergias-mtg.astro`

## Cambio técnico cerrado

La tarjeta `Vista previa de salida` dejó de ser únicamente estática y pasó a responder al estado local de la entrada beta.

Estados implementados:

- `empty`
- `warning`
- `prepared`

Estado inicial:

- `Salida no rankeada pendiente de activación.`
- `Todavía no hay candidatos generados.`
- `Todavía no se generan candidatos reales.`

Estado `warning` al preparar sin `Carta seed 1`:

- `Introduce al menos una carta seed.`
- `Todavía no se generan candidatos reales.`

Estado `prepared` al preparar con `Carta seed 1`:

- `Entrada preparada localmente.`
- `Seed 1 preparada.`
- `Seed 2 preparada`, si existe.
- `Todavía no se generan candidatos reales.`

El botón `Limpiar entrada` también resetea la vista previa de salida al estado vacío inicial.

## Implementación

Se amplió el script inline vanilla ya existente en la página.

La implementación:

- localiza la shell mediante `.beta-shell`,
- localiza el bloque `#cse-beta-output-preview`,
- actualiza `data-state` en la vista previa,
- actualiza mensajes de estado de salida,
- muestra u oculta las seeds preparadas,
- no genera candidatos reales,
- no llama al engine,
- no importa módulos,
- no usa almacenamiento local,
- no usa red.

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

- Copy y output preview state: OK
- Guardrails funcionales: OK
- Guardrails de sobrepromesa: OK
- Archivos prohibidos no tocados: OK
- Build: OK
- Ruta generada: `dist/es/explorador-de-sinergias-mtg/index.html`
- Astro build: `4 page(s) built`
- `git diff --check`: OK

La ruta generada contiene las cadenas esperadas:

- `Explorador de Sinergias MTG`
- `Vista previa de salida`
- `Salida no rankeada pendiente de activación`
- `Todavía no hay candidatos generados`
- `Todavía no se generan candidatos reales`
- `Introduce al menos una carta seed`
- `Entrada preparada localmente`
- `No calcula ranking`
- `No calcula score`
- `No genera explicación causal`

## Lectura correcta

El Explorador de Sinergias MTG ya tiene una beta pública con entrada local y vista previa de salida sincronizada, pero todavía no es funcional como recomendador.

Estado actual:

1. pipeline interno CSE
2. `candidateOutputs` no rankeados
3. route pública beta informativa
4. paleta pública sobria y legible
5. interaction shell visual
6. client-state shell local
7. polish de estado, Enter y limpieza local
8. output preview shell vacía y no rankeada
9. output preview state sincronizado con seeds locales

La ruta sigue sin generar candidatos reales. No debe presentarse como ranking de sinergia ni como recomendador final.

## Implicación para publicación

La página pública comunica mejor el flujo futuro: introducir cartas, preparar entrada local y ver una zona de salida que responde al estado, sin inventar resultados.

Esto mejora la percepción de producto sin cruzar todavía la línea de recomendaciones semánticas no justificadas.

## Siguiente fase recomendada

Antes de seguir con más producto, conviene hacer smoke test público de despliegue:

- `PUBLIC_SMOKE_TEST_CSE_UNRANKED_OUTPUT_PREVIEW_STATE_V1`

Después, las rutas razonables son:

- `CARD_SYNERGY_EXPLORER_PUBLIC_BETA_COPY_REFINEMENT_V1`
- `CARD_SYNERGY_EXPLORER_PUBLIC_BETA_UNRANKED_PLACEHOLDER_RESULT_CONTRACT_V1`

No conviene conectar ranking/scoring todavía. El siguiente paso técnico, si se hace, debería seguir limitado a salida no rankeada y explícitamente no definitiva.

## Estado de cierre

Microfase cerrada técnicamente en `main`.

Este documento cierra la trazabilidad documental de la microfase.
