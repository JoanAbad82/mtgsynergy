# A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_REPAIR_PLAN_V1

## 1) Estado
- Plan-only.
- Este documento no implementa reparación.
- No cambia runtime, parser, contratos, UI, CSE, scoring, overlay, public data, package/config.
- Su objetivo es reducir ambigüedad antes de tocar código productivo.
- Referencias de estado: docs commit `984308e`, merge operativo previo `f9169b5`, test commit previo `1429e5f`.

## 2) Problema técnico diagnosticado
El `target_count` actual en cartas modales representa una agregación diagnóstica de targets observados en el Oracle text, no necesariamente los requisitos simultáneos reales al castear o resolver la carta.

Anclas explícitas del problema:
- Abrade
- Kolaghan's Command
- Cryptic Command
- Prismari Command
- Casualties of War
- Electrolyze

## 3) Estado actual protegido por rings
Snapshots actuales congelados:
- Abrade: `target_kinds ["ARTIFACT","CREATURE"]`, `target_count 2`
- Kolaghan's Command: `target_kinds ["ANY_TARGET","ARTIFACT","CREATURE","PLAYER"]`, `target_count 4`
- Cryptic Command: `target_kinds ["PERMANENT","UNKNOWN_TARGET_KIND"]`, `target_count 2`
- Prismari Command: `target_kinds ["ANY_TARGET","ARTIFACT","PLAYER"]`, `target_count 4`
- Casualties of War: `target_kinds ["ARTIFACT","CREATURE","LAND","UNKNOWN_TARGET_KIND"]`, `target_count 5`
- Electrolyze: `min_exists false`, `target_kinds []`, `target_count null`

## 4) Modelo conceptual protegido
Modelo conceptual observado y documentado:
- Abrade: `CHOOSE_ONE`, conceptual target slots `1..1`
- Kolaghan's Command: `CHOOSE_TWO`, conceptual target slots `2..2`
- Cryptic Command: `CHOOSE_TWO`, conceptual target slots `0..2`
- Prismari Command: `CHOOSE_TWO`, conceptual target slots `2..2`
- Casualties of War: `CHOOSE_ONE_OR_MORE`, conceptual target slots `1..5`
- Electrolyze: `SPLIT_DIVIDED_DAMAGE_NON_MODAL`, conceptual target slots `1..2`

## 5) Plan de reparación recomendado (futuro, no implementado aquí)
Secuencia estrecha propuesta de microfases:
1. Definir contrato/snapshot para un modelo modal explícito.
2. Implementar extracción modal mínima y conservadora.
3. Añadir guardrail ring real Oracle para esa extracción modal.
4. Hacer migración controlada de consumo interno, solo si aplica.
5. Tratar `split/divided damage` como línea separada posterior.

## 6) Diseño recomendado
Separar explícitamente canales de salida:
- `target_kinds` agregados actuales.
- `target_count` agregado actual.
- `modal_selection_model` conceptual.
- `conceptual_target_slots_min`.
- `conceptual_target_slots_max`.
- `mode_selection_kind`.
- `split/divided damage` como categoría separada.

Nota clave: no conviene romper `target_count` inmediatamente, porque está protegido por rings y sigue siendo una señal diagnóstica útil.

## 7) Non-goals
- No reparar parser ahora.
- No cambiar `buildCostTargetLegalityHints` ahora.
- No cambiar TargetSpec/CostIR/LegalityGate ahora.
- No tocar UI/CSE/scoring/overlay.
- No mezclar Electrolyze con la reparación modal.
- No declarar semántica final completa de Magic.

## 8) Riesgos
- Romper rings ya cerrados.
- Confundir targets alternativos con targets simultáneos.
- Perder señal diagnóstica útil.
- Mezclar modes con `split/divided damage`.
- Sobregeneralizar desde pocas cartas.

## 9) Criterio de cierre futuro
Una futura reparación productiva solo debería aceptarse si:
- Preserva rings existentes o los migra explícitamente.
- Mantiene no-leakage entre `cost_kinds`, `target_kinds` y `legality_kinds`.
- Mantiene `CAST_ONLY_IF` y `ACTIVATE_ONLY_AS_SORCERY` fuera de `target_kinds`.
- Separa modal de `split/divided damage`.
- Añade tests focales y guardrails antes de tocar UI/CSE.

## 10) Siguiente microfase recomendada
Primera opción recomendada:
- `A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_CONTRACT_PLAN_V1`

Opción alternativa si se decide pasar a implementación después del plan:
- `A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_CONTRACT_V1`