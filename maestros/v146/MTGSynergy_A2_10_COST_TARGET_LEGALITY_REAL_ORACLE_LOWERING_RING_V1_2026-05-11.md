# MTGSynergy — Cierre de microfase

## Identificación
- Microfase: `A2.10_COST_TARGET_LEGALITY_REAL_ORACLE_LOWERING_RING_V1`
- Fecha: `2026-05-11`
- Estado final: `main == origin/main == 8276c92`
- Feature/test commit: `3ecc213` (`test(semantic): add a210 real oracle lowering ring v1`)
- Merge commit: `8276c92` (`merge: a210 real oracle lowering ring v1`)

## Scope ejecutado
- Archivo añadido:
  - `src/engine/semantic/tests/sem_cost_target_legality_real_oracle_lowering_ring_v1.test.ts`
- Tamaño: `180 insertions`
- Naturaleza del cambio: `test-only`

## Objetivo técnico cerrado
Ring A2.10 contra índice real local:
- `public/data/cards_index.json.gz`

## Carga y resolución real
- Carga: `readFileSync` + `gunzipSync` + `JSON.parse`
- Resolución: `normalizeCardName` + `by_name` + `by_name_norm`

## Anclas validadas (Oracle real local)
- `Village Rites`
- `Bone Splinters`
- `Icy Manipulator`
- `Castle Vantress`

## Hint y shape validados
- Hint: `semantic_hints.cost_target_legality_min`
- Shape:
  - `cardName`
  - `hasOracleText`
  - `cost_kinds`
  - `target_kinds`
  - `legality_kinds`
  - `target_count`
  - `legality_count`
  - `known_gap`

## Gap conocido congelado
- `Castle Vantress` marcado como:
  - `MULTI_ABILITY_SELECTION_CASTLE_VANTRESS_REAL_ORACLE`
- Observación real local congelada:
  - `cost_kinds: ["TAP"]`
  - `legality_kinds: []`
- Se documenta gap actual; no se sobreafirma cobertura plena.

## Validaciones ejecutadas
- `git diff --check` → OK
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_real_oracle_lowering_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_canonical_lowering_snapshot_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
  - `1 file passed`
  - `5 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_canonical_snapshot_ring_v1.test.ts`
  - `1 file passed`
  - `5 tests passed`

## No-goals respetados
- No parser.
- No servicio A2.10.
- No lowering productivo.
- No contratos JSON.
- No cards_index.
- No runtime.
- No UI.
- No CSE.
- No sem_edges.
- No sem_profile.
- No public data.

## Nota de ejecución
- No hubo build ni smoke público: microfase `test-only` sin cambio de runtime visible.