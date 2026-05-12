# A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_GUARDRAIL_RING_V1

## 1) Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit de este documento.
- Tipo: test-only real Oracle modal target selection model guardrail ring.

## 2) Estado final operativo
- repo: C:\MTGSynergy
- branch final: main
- main == origin/main == f9169b5
- merge commit: f9169b5
- test commit: 1429e5f
- previous docs/base commit: ef11708

## 3) Scope
- Archivo añadido:
  - src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_guardrail_ring_v1.test.ts
- Tamaño operativo:
  - 1 file changed
  - 259 insertions
- Sin cambios productivos/runtime/UI/CSE/scoring/overlay/public-data/package/config.

## 4) Propósito técnico
- Congelar el output agregado actual y el modelo conceptual de selección modal derivado de la diagnosis anterior.
- Usar Oracle real desde public/data/cards_index.json.gz.
- Usar buildCostTargetLegalityHints.
- No declarar semántica modal final.
- Proteger que target_count sigue siendo una señal de agregación diagnóstica, no una garantía de requisitos simultáneos de ejecución.

## 5) Corpus protegido
- Abrade
- Kolaghan's Command
- Cryptic Command
- Prismari Command
- Casualties of War
- Electrolyze

## 6) Modelo conceptual protegido
- Abrade: CHOOSE_ONE, conceptual target slots 1..1
- Kolaghan's Command: CHOOSE_TWO, conceptual target slots 2..2
- Cryptic Command: CHOOSE_TWO, conceptual target slots 0..2
- Prismari Command: CHOOSE_TWO, conceptual target slots 2..2
- Casualties of War: CHOOSE_ONE_OR_MORE, conceptual target slots 1..5
- Electrolyze: SPLIT_DIVIDED_DAMAGE_NON_MODAL, conceptual target slots 1..2

## 7) Snapshots actuales protegidos
- Abrade: target_kinds ["ARTIFACT","CREATURE"], target_count 2
- Kolaghan's Command: target_kinds ["ANY_TARGET","ARTIFACT","CREATURE","PLAYER"], target_count 4
- Cryptic Command: target_kinds ["PERMANENT","UNKNOWN_TARGET_KIND"], target_count 2
- Prismari Command: target_kinds ["ANY_TARGET","ARTIFACT","PLAYER"], target_count 4
- Casualties of War: target_kinds ["ARTIFACT","CREATURE","LAND","UNKNOWN_TARGET_KIND"], target_count 5
- Electrolyze: min_exists false, target_kinds [], target_count null

## 8) Non-goals
- No reparar agregación modal.
- No reparar split/divided damage.
- No cambiar parser productivo.
- No cambiar contratos.
- No cambiar UI/CSE/scoring/overlay/runtime/public data.

## 9) Invariantes preservadas
- target kinds no filtran a cost_kinds.
- target kinds no filtran a legality_kinds.
- CAST_ONLY_IF no aparece en target_kinds.
- ACTIVATE_ONLY_AS_SORCERY no aparece en target_kinds.
- CostIR, TargetSpec y LegalityGate permanecen separados.

## 10) Validaciones aprobadas
- focal modal target selection model guardrail ring: 1 file passed, 1 test passed
- modal target selection model diagnosis: 1 file passed, 1 test passed
- modal target aggregation guardrail ring: 1 file passed, 1 test passed
- modal target aggregation diagnosis: 1 file passed, 1 test passed
- target kind canonicalization guardrail ring: 1 file passed, 2 tests passed
- target kind canonicalization: 1 file passed, 3 tests passed
- target shape diagnosis: 1 file passed, 1 test passed
- lowering hint wiring: 1 file passed, 8 tests passed
- contract freeze: 1 file passed, 3 tests passed
- git diff --check clean
- push succeeded
- final sync verified: main == origin/main == f9169b5

## 11) Build/smoke
- npm run build not required
- cambio test-only
- public smoke no requerido

## 12) Siguiente microfase recomendada
A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_REPAIR_PLAN_V1

Antes de reparar productivamente conviene un plan estrecho para separar explícitamente:
- output agregado diagnóstico actual
- selección modal conceptual
- split/divided damage como scope separado
