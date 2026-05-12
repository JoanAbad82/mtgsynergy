# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_CONTRACT_PLAN_V1

## Estado
- Plan-only.
- No implementa contrato JSON.
- No implementa reparación productiva.
- No cambia runtime/lowering/parser/service/UI/CSE/scoring/overlay/public data/package/config.
- Objetivo: definir el contrato futuro antes de tocar código productivo.
- Referencias de estado previo: `5c44d0f`, `e877237`, `cc5d105`.

## Problema Técnico Diagnosticado
- El wording real Oracle de split/divided damage no está modelado por `costTargetLegalityMin`.
- Actualmente `Electrolyze`, `Arc Lightning`, `Flames of the Firebrand`, `Pyrotechnics` y `Rolling Thunder` devuelven `min_exists false`, `target_kinds []`, `target_count null`.
- Este fenómeno debe permanecer separado de `modal_selection_model`, porque no es selección modal tipo Choose one / Choose two.
- Debe separarse de `target_kinds` y `target_count` diagnósticos hasta que haya reparación explícita.

## Corpus Diagnóstico Base
- Electrolyze: `ONE_OR_TWO_TARGETS`, conceptual slots `1..2`.
- Arc Lightning: `ONE_TWO_OR_THREE_TARGETS`, conceptual slots `1..3`.
- Flames of the Firebrand: `ONE_TWO_OR_THREE_TARGETS`, conceptual slots `1..3`.
- Pyrotechnics: `ANY_NUMBER_OF_TARGETS`, conceptual slots `0..null` conservador, `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0`.
- Rolling Thunder: `ANY_NUMBER_OF_TARGETS`, conceptual slots `0..null` conservador, `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0`.

## Contrato Futuro Recomendado
Propuesta de campo aditivo conceptual: `split_divided_damage_target_model`.

Campos recomendados:
- `kind`
- `split_damage_model_kind`
- `conceptual_target_slots_min`
- `conceptual_target_slots_max`
- `damage_allocation_is_divided`
- `productive_min_hint_currently_models_split_damage`
- `target_kinds_policy`
- `notes`
- `known_gap`

Enums recomendados para `split_damage_model_kind`:
- `ONE_OR_TWO_TARGETS`
- `ONE_TWO_OR_THREE_TARGETS`
- `ANY_NUMBER_OF_TARGETS`
- `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`

## Política de Integración
- El contrato debe ser aditivo.
- No sustituye todavía `target_kinds`.
- No sustituye todavía `target_count`.
- No debe aparecer dentro de `modal_selection_model`.
- Debe preservar `modal_selection_model` para cartas modales normales.
- Debe preservar no-leakage: `CAST_ONLY_IF` y `ACTIVATE_ONLY_AS_SORCERY` fuera de target/model channels.
- Debe preservar función total y fallback explícito.

## Non-Goals
- No reparar split/divided damage en esta microfase.
- No cambiar `buildCostTargetLegalityHints`.
- No cambiar TargetSpec/CostIR/LegalityGate.
- No tocar UI/CSE/scoring/overlay.
- No tocar public data/package/config.
- No declarar semántica final completa de Magic.

## Riesgos
- Mezclar split/divided damage con modal selection.
- Interpretar `any number of targets` de forma demasiado agresiva.
- Forzar `target_count` antes de tener política clara.
- Romper rings actuales donde Electrolyze sigue `min_exists false`.
- Crear contrato demasiado rígido para wording futuro.

## Criterio de Cierre Futuro
Una futura microfase de contrato debe:
- Añadir contrato JSON + test freeze.
- Preservar diagnosis y guardrails existentes.
- Congelar corpus base.
- Mantener split/divided separado de modal.
- Mantener no-leakage.
- Documentar unknown/fallback.

## Siguiente Microfase Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_CONTRACT_V1`
