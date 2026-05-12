# A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_CONTRACT_PLAN_V1

## 1) Estado
- Contract-plan-only.
- No implementa contrato todavía.
- No cambia runtime, parser, lowering, contratos JSON, UI, CSE, scoring, overlay, public data, package/config ni tests.
- Su propósito es diseñar el contrato antes de tocar código.
- Referencias de contexto: `main == origin/main == 5342abb`, repair plan commit `be104f9`, guardrail docs `984308e`, guardrail merge `f9169b5`, guardrail test `1429e5f`.

## 2) Problema que resuelve el contrato futuro
A2.10 ya distingue `cost_kinds`, `target_kinds` y `legality_kinds`, pero el `target_count` actual en cartas modales sigue siendo agregado diagnóstico.
No se debe confundir:
- targets observados en todos los modos
- targets exigidos por una selección concreta de modos
- `split/divided damage`

## 3) Contrato conceptual propuesto
Se propone una estructura futura aditiva llamada `modal_selection_model` con estos campos:
- `kind`
- `mode_selection_kind`
- `selected_modes_min`
- `selected_modes_max`
- `modes_total`
- `targeted_modes_count`
- `conceptual_target_slots_min`
- `conceptual_target_slots_max`
- `aggregated_target_kinds`
- `notes` o `known_gap`

Valores previstos para `mode_selection_kind`:
- `CHOOSE_ONE`
- `CHOOSE_TWO`
- `CHOOSE_ONE_OR_MORE`
- `SPLIT_DIVIDED_DAMAGE_NON_MODAL`
- `UNKNOWN_MODAL_SELECTION`

## 4) Relación con campos actuales
- `target_kinds` actual se conserva como agregación diagnóstica.
- `target_count` actual se conserva como agregación diagnóstica.
- `modal_selection_model` debe entrar como capa aditiva, no sustitutiva, en la primera fase.
- No se deben romper rings cerrados.
- La migración semántica real debe ser una fase posterior explícita.

## 5) Corpus inicial para contrato
- Abrade: `CHOOSE_ONE`, `conceptual_target_slots_min 1`, `conceptual_target_slots_max 1`
- Kolaghan's Command: `CHOOSE_TWO`, `conceptual_target_slots_min 2`, `conceptual_target_slots_max 2`
- Cryptic Command: `CHOOSE_TWO`, `conceptual_target_slots_min 0`, `conceptual_target_slots_max 2`
- Prismari Command: `CHOOSE_TWO`, `conceptual_target_slots_min 2`, `conceptual_target_slots_max 2`
- Casualties of War: `CHOOSE_ONE_OR_MORE`, `conceptual_target_slots_min 1`, `conceptual_target_slots_max 5`
- Electrolyze: `SPLIT_DIVIDED_DAMAGE_NON_MODAL`, `conceptual_target_slots_min 1`, `conceptual_target_slots_max 2`

## 6) Non-goals
- No implementar `modal_selection_model` ahora.
- No cambiar `buildCostTargetLegalityHints` ahora.
- No cambiar `TargetSpec`, `CostIR` ni `LegalityGate` ahora.
- No cambiar UI/CSE/scoring/overlay.
- No reparar Electrolyze ahora.
- No declarar semántica final completa de modos MTG.
- No eliminar ni reinterpretar `target_count` todavía.

## 7) Invariantes obligatorias futuras
- No-leakage entre `cost_kinds`, `target_kinds` y `legality_kinds`.
- `CAST_ONLY_IF` fuera de `target_kinds`.
- `ACTIVATE_ONLY_AS_SORCERY` fuera de `target_kinds`.
- `split/divided damage` separado de modal normal.
- Fallback explícito para `UNKNOWN_MODAL_SELECTION`.
- Función total: si no se puede modelar, no debe romper output.

## 8) Plan de implementación futuro sugerido
- `A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_CONTRACT_V1`
- `A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_DIAGNOSIS_V1`
- `A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_V1`
- `A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_GUARDRAIL_RING_V1`
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_DIAGNOSIS_V1`

## 9) Riesgos
- Romper rings existentes.
- Sobregeneralizar desde seis cartas.
- Confundir mode count con target slots.
- Mezclar `split/divided damage` con modes.
- Introducir contrato demasiado rígido.
- Crear dependencia prematura desde UI/CSE.

## 10) Criterio de cierre futuro
Una futura microfase de contrato debe considerarse aceptable solo si:
- Es aditiva.
- Preserva snapshots/rings existentes.
- No cambia comportamiento productivo visible.
- Tiene fixtures/snapshots de contrato.
- Documenta unknown/fallback.
- Deja `split/divided damage` separado.

## 11) Siguiente microfase recomendada
- `A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_CONTRACT_V1`