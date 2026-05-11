# MTGSynergy — Cierre de microfase

## Identificación
- Microfase: `A2.10_COST_TARGET_LEGALITY_REAL_ORACLE_MULTI_ABILITY_SELECTION_REPAIR_V1`
- Fecha: `2026-05-11`
- Estado final: `main == origin/main == 6b2dbe4`
- Fix commit: `09a369a` (`fix(semantic): repair a210 real oracle multi ability selection v1`)
- Merge commit: `6b2dbe4` (`merge: a210 real oracle multi ability selection repair v1`)

## Scope ejecutado
- Archivos modificados:
  - `src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts`
  - `src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
  - `src/engine/semantic/tests/sem_cost_target_legality_real_oracle_lowering_ring_v1.test.ts`
- Tamaño: `58 insertions`, `12 deletions`

## Problema corregido
- Oracle real de `Castle Vantress` contiene múltiples habilidades activadas.
- El lowering tomaba la primera habilidad con `:` del bloque completo (`{T}: Add {U}.`), dejando lectura parcial.
- Se reparó la selección para preferir la línea activada no-mana relevante (`{2}{U}{U}, {T}: Scry 2.`).

## Resultado final (Castle Vantress)
- `cost_kinds` contiene `MANA` y `TAP`
- `target_count = 0`
- `legality_count = 0`
- `known_gap = null`

## Validaciones ejecutadas
- real-oracle ring: `1 file / 2 tests passed`
- lowering hint wiring: `1 file / 6 tests passed`
- canonical lowering ring: `1 file / 2 tests passed`
- pure service: `1 file / 5 tests passed`
- contract freeze: `1 file / 3 tests passed`
- canonical semantic ring: `1 file / 5 tests passed`
- `npm run build` → OK
- `cards_index manifest verified: OK`

## No-goals respetados
- No UI.
- No CSE.
- No scoring.
- No parser amplio.
- No servicio A2.10.
- No contratos JSON.
- No cards_index/public data.
- No `sem_edges`.
- No `sem_profile`.
- No overlay visible.