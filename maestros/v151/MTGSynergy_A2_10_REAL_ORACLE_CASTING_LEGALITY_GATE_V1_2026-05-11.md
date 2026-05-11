# MTGSynergy — Cierre de microfase

## Identificación
- Microfase: `A2.10_REAL_ORACLE_CASTING_LEGALITY_GATE_V1`
- Fecha: `2026-05-11`
- Estado final: `main == origin/main == 7c008ba`
- Feature commit: `c654be2` (`feat(semantic): add a210 casting legality gate v1`)
- Merge commit: `7c008ba` (`merge: a210 casting legality gate v1`)

## Scope ejecutado
- Archivos modificados:
  - `src/engine/semantic/cost_target_legality/sem_cost_target_legality_service_v1.ts`
  - `src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts`
  - `src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
- Archivo añadido:
  - `src/engine/semantic/tests/sem_cost_target_legality_casting_legality_gate_v1.test.ts`
- Tamaño: `174 insertions`, `1 deletion`

## Objetivo técnico cerrado
A2.10 detecta legalidad de lanzamiento real tipo:
- `Cast this spell only if ...`
- `Cast this spell only during ...`
- `Cast this spell only before ...`

## Resultado funcional
- `CAST_ONLY_IF` entra en `legality_kinds`.
- No contamina `cost_kinds`.
- No contamina `target_kinds`.
- No se clasifica como efecto.
- Se preservan targets formales cuando existen.

## Corpus real local
- `Would You Have Done the Same?`
- `Defiant Stand`
- `Rapid Fire`

## Resultado del corpus
- Las tres cartas emiten `CAST_ONLY_IF` en `legality_kinds`.
- Las tres preservan target formal `CREATURE`.
- No hay leakage de `CAST_ONLY_IF` a `cost_kinds` ni `target_kinds`.

## Validaciones ejecutadas
- `git diff --check` → OK
- casting legality gate: `1 file / 2 tests passed`
- activation legality gate: `1 file / 2 tests passed`
- activation legality guardrail ring: `1 file / 2 tests passed`
- lowering hint wiring: `1 file / 8 tests passed`
- contract freeze: `1 file / 3 tests passed`
- canonical semantic ring: `1 file / 5 tests passed`
- `npm run build` → OK
- `cards_index manifest verified: OK`

## No-goals respetados
- No UI.
- No CSE.
- No scoring.
- No overlay visible.
- No parser amplio.
- No cards_index/public data.
- No contratos JSON.
- No sem_edges.
- No sem_profile.