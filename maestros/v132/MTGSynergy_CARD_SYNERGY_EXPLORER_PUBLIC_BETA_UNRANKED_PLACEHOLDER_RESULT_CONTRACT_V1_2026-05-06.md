# MTGSynergy — Card Synergy Explorer Public Beta Unranked Placeholder Result Contract V1

Fecha de cierre: 2026-05-06
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_PUBLIC_BETA_UNRANKED_PLACEHOLDER_RESULT_CONTRACT_V1`

## Estado final confirmado

- Repositorio local: `C:\MTGSynergy`
- Branch final: `main`
- Estado final: `main == origin/main == e648e99`
- Commit de merge publicado: `e648e99 merge: card synergy explorer unranked placeholder result contract v1`
- Commit de rama: `42713f3 feat(site): add card synergy explorer unranked placeholder result contract v1`

## Objetivo de la microfase

Añadir una forma pública mínima de resultado placeholder no rankeado en la página del Card Synergy Explorer, sin generar candidatos reales y sin conectar el motor.

La microfase no pretendía construir recomendaciones. Su objetivo era mostrar un contrato visual de formato futuro para la salida pública, manteniendo límites explícitos y evitando sobrepromesas.

## Archivo modificado

- `src/pages/es/explorador-de-sinergias-mtg.astro`

## Cambio cerrado

Se añadió dentro de `Vista previa de salida` un bloque visual de contrato placeholder no rankeado.

El bloque introduce una representación pública mínima y honesta de lo que podrá ser una salida futura, sin simular resultados ni usar cartas reales como candidatos.

Nuevas cadenas públicas añadidas:

- `Placeholder no rankeado`
- `Candidato no generado todavía`
- `Ranking no disponible`
- `Score no disponible`
- `Explicación causal no disponible`
- `Formato de salida futuro`
- `Sin candidatos reales`

## Lectura correcta del cambio

La página pública ahora comunica tres niveles:

1. entrada beta local ya disponible,
2. vista previa de salida sincronizada con seeds locales,
3. contrato visual de formato futuro para salida no rankeada.

Esto mejora la percepción de producto, pero no convierte la página en recomendador.

## No-goals preservados

Esta microfase no implementa:

- generación real de candidatos,
- ranking,
- scoring,
- explicación causal real,
- recomendaciones reales,
- conexión pública al core del Card Synergy Explorer,
- import de `runCardSynergyExplorerCoreSkeleton`,
- import de `createCardSynergyCardsIndexAdapter`,
- `AnalyzerApp`,
- parser,
- semantic overlay,
- SPS por carta,
- Monte Carlo,
- `fetch`,
- `Date.now`,
- `Math.random`,
- `localStorage`,
- `sessionStorage`.

## Scope preservado

Scope real de la microfase:

- `src/pages/es/explorador-de-sinergias-mtg.astro`

Zonas explícitamente no tocadas:

- `src/engine/**`
- `src/components/**`
- `public/data/**`
- `maestros/**` durante la fase técnica
- `package.json`
- `package-lock.json`
- configuración Astro
- layout global
- CSS global

## Validación ejecutada antes del merge

- `npm run build`: OK
- `git diff --check`: OK
- Scope exacto: OK
- Source contiene strings placeholder esperadas: OK
- Required strings en HTML generado: OK
- Nuevas strings placeholder en HTML generado: OK
- Forbidden technical strings ausentes: OK
- No-overpromise strings ausentes: OK

Required strings preservadas:

- `Explorador de Sinergias MTG`
- `Entrada beta`
- `Carta seed 1`
- `Carta seed 2 opcional`
- `Preparar entrada beta`
- `Limpiar entrada`
- `Vista previa de salida`
- `Salida no rankeada pendiente de activación`
- `Todavía no hay candidatos generados`
- `Todavía no se generan candidatos reales`
- `Introduce al menos una carta seed`
- `Entrada preparada localmente`
- `Seed 1 preparada`
- `No calcula ranking`
- `No calcula score`
- `No genera explicación causal`
- `100% client-side`

Forbidden technical strings verificadas como ausentes:

- `runCardSynergyExplorerCoreSkeleton`
- `createCardSynergyCardsIndexAdapter`
- `AnalyzerApp`
- `localStorage`
- `sessionStorage`
- `fetch(`
- `Date.now`
- `Math.random`

No-overpromise strings verificadas como ausentes:

- `ranking real`
- `score real`
- `recomendador final`
- `recomendaciones reales`
- `genera candidatos reales ahora`
- `mejor candidato`
- `top candidato`
- `sinergia recomendada`
- `explicación causal real disponible`

## Smoke público

Producción validada en:

- `https://mtgsynergy.com/es/explorador-de-sinergias-mtg/`

Resultado:

- HTTP 200 OK
- HTML servido correctamente
- Required strings: OK
- Nuevas strings placeholder: OK
- Forbidden technical strings: OK
- No-overpromise strings: OK
- Guardrail negativo sobre candidatos reales: OK
- Temporal eliminado
- Working tree limpio

Tamaño observado del HTML público:

- `14782` bytes

## Estado funcional tras la microfase

La ruta pública sigue sin generar:

- candidatos reales,
- ranking,
- score,
- explicación causal,
- recomendaciones finales.

La microfase es UI/copy/contract-only. No cambia motor, datos, parser, scoring ni contratos internos.

## Siguiente fase recomendada

Después de esta fase, las rutas razonables son:

- seguir refinando la beta pública si hay deuda de claridad visual,
- o abrir una fase muy controlada de salida no rankeada con contrato técnico real.

Condición importante:

- no conectar ranking/scoring todavía,
- no presentar recomendaciones reales,
- no simular candidatos reales,
- mantener la salida como no rankeada y explícitamente no definitiva.

## Estado de cierre

Microfase cerrada técnicamente en `main`, publicada y validada en producción.

Este documento cierra la trazabilidad documental de la microfase.
