# MTGSynergy — Cierre de microfase

## Identificación
- Microfase: `A2.10_REAL_ORACLE_ACTIVATION_LEGALITY_GATE_V1`
- Fecha: `2026-05-11`
- Estado final: `main == origin/main == 46e7825`
- Feature commit: `112533c` (`feat(semantic): add a210 activation legality gate v1`)
- Merge commit: `46e7825` (`merge: a210 activation legality gate v1`)

## Scope ejecutado
- Archivos modificados:
  - `src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts`
  - `src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
- Archivo añadido:
  - `src/engine/semantic/tests/sem_cost_target_legality_activation_legality_gate_v1.test.ts`
- Tamaño: `174 insertions`, `2 deletions`

## Objetivo técnico cerrado
A2.10 detecta legalidad de activación real tipo:
- `Activate only as a sorcery.`

## Resultado funcional
- `ACTIVATE_ONLY_AS_SORCERY` entra en `legality_kinds`.
- No contamina `target_kinds`.
- No se clasifica como efecto.
- Se preservan costes y targets.

## Corpus real local
- `Bloodtithe Harvester`
- `Birthing Pod`

## Resultado destacado (Bloodtithe Harvester)
- `cost_kinds` contiene `TAP` y `SACRIFICE`
- `target_kinds` contiene `CREATURE`
- `legality_kinds` contiene `ACTIVATE_ONLY_AS_SORCERY`
- Conserva restricción de summoning sickness para `{T}` en criatura

## Validaciones ejecutadas
- `git diff --check` → OK
- activation legality gate: `1 file / 2 tests passed`
- lowering hint wiring: `1 file / 7 tests passed`
- real-oracle ring: `1 file / 2 tests passed`
- multi-ability guardrail ring: `1 file / 2 tests passed`
- pure service: `1 file / 5 tests passed`
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
- No servicio A2.10.
- No contratos JSON.
- No cards_index/public data.
- No sem_edges.
- No sem_profile.