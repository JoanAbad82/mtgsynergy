# MTGSynergy — Cierre de microfase

## Identificación
- Microfase: `A2.10_REAL_ORACLE_ACTIVATION_LEGALITY_GATE_GUARDRAIL_RING_V1`
- Fecha: `2026-05-11`
- Estado final: `main == origin/main == b641bf1`
- Feature/test commit: `3504320` (`test(semantic): add a210 activation legality gate guardrail ring v1`)
- Merge commit: `b641bf1` (`merge: a210 activation legality gate guardrail ring v1`)

## Scope ejecutado
- Naturaleza del cambio: `test-only`
- Archivo añadido:
  - `src/engine/semantic/tests/sem_cost_target_legality_activation_legality_gate_guardrail_ring_v1.test.ts`
- Tamaño: `154 insertions`

## Objetivo técnico cerrado
Ring estable con Oracle real local para proteger detección A2.10 de:
- `Activate only as a sorcery`
- `ACTIVATE_ONLY_AS_SORCERY`

## Carga real
- `public/data/cards_index.json.gz`
- `readFileSync`
- `gunzipSync`
- `JSON.parse`
- `normalizeCardName`
- `by_name` / `by_name_norm`

## Corpus protegido
- `Bloodtithe Harvester`
- `Birthing Pod`
- `Transmogrifying Wand`

## Guardrails cerrados
- `ACTIVATE_ONLY_AS_SORCERY` permanece en `legality_kinds`.
- `ACTIVATE_ONLY_AS_SORCERY` no se filtra a `target_kinds`.
- `ACTIVATE_ONLY_AS_SORCERY` no se filtra a `cost_kinds`.
- `Bloodtithe Harvester` preserva target `CREATURE`.
- `Bloodtithe Harvester` preserva costes `TAP` y `SACRIFICE`.

## Validaciones ejecutadas
- `git diff --check` → OK
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_activation_legality_gate_guardrail_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_activation_legality_gate_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
  - `1 file passed`
  - `7 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_real_oracle_lowering_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_cost_target_legality_multi_ability_selection_guardrail_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npx vitest run src/engine/semantic/tests/sem_canonical_snapshot_ring_v1.test.ts`
  - `1 file passed`
  - `5 tests passed`

## No-goals respetados
- No runtime.
- No UI.
- No CSE.
- No scoring.
- No parser.
- No contratos JSON.
- No cards_index/public data.
- No lowering productivo.
- No servicio A2.10.
- No sem_edges.
- No sem_profile.

## Nota de ejecución
- No hubo build ni smoke público: microfase `test-only` sin cambio de runtime visible.