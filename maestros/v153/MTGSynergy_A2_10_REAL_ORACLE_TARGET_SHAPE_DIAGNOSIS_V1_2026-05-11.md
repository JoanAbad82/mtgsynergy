# Cierre Microfase: A2.10_REAL_ORACLE_TARGET_SHAPE_DIAGNOSIS_V1

## 1) Estado
- Cerrada operativamente.
- Cerrada documentalmente: pendiente hasta commitear este documento.
- Tipo: test-only diagnosis.
- Sin cambios runtime/productivos.

## 2) Estado final antes del commit documental
- repo: `C:\MTGSynergy`
- branch: `main`
- `main == origin/main == 65aa3eb`
- working tree clean before doc.
- merge commit: `65aa3eb`
- diagnostic/test commit: `dcb8dc4`
- previous docs/base commit: `c8b8d42`

## 3) Scope
- Added exactly:
  - `src/engine/semantic/tests/sem_cost_target_legality_target_shape_diagnosis_v1.test.ts`
- `115 insertions`
- No source/runtime/UI/overlay/scoring/CSE/data/package/config changes.

## 4) Propósito técnico
Diagnosticar el comportamiento actual de A2.10 para formas de target formal con Oracle real local usando `public/data/cards_index.json.gz` y `buildCostTargetLegalityHints`.

## 5) Corpus Oracle real y snapshots observados
- Lightning Bolt:
  - oracle: `Lightning Bolt deals 3 damage to any target.`
  - `min_exists: true`
  - `target_kinds: ["UNKNOWN_TARGET_KIND"]`
  - `target_count: 1`

- Shock:
  - oracle: `Shock deals 2 damage to any target.`
  - `min_exists: true`
  - `target_kinds: ["UNKNOWN_TARGET_KIND"]`
  - `target_count: 1`

- Duress:
  - oracle starts: `Target opponent reveals their hand.`
  - `min_exists: true`
  - `target_kinds: ["UNKNOWN_TARGET_KIND"]`
  - `target_count: 1`

- Thoughtseize:
  - oracle starts: `Target player reveals their hand.`
  - `min_exists: true`
  - `target_kinds: ["UNKNOWN_TARGET_KIND"]`
  - `target_count: 1`

- Fatal Push:
  - oracle starts: `Destroy target creature if it has mana value 2 or less.`
  - `min_exists: true`
  - `target_kinds: ["CREATURE"]`
  - `target_count: 1`

- Abrade:
  - oracle starts: `Choose one —`
  - `min_exists: true`
  - `target_kinds: ["ARTIFACT", "CREATURE"]`
  - `target_count: 2`
  - note: se observa agregación modal de target; no se repara en esta microfase.

- Fire Prophecy:
  - oracle: `Fire Prophecy deals 3 damage to target creature...`
  - `min_exists: true`
  - `target_kinds: ["CREATURE"]`
  - `target_count: 1`
  - note: el Oracle local no contenía el wording sospechado originalmente de `up to one target card`.

- Into the Roil:
  - oracle starts: `Kicker {1}{U}`
  - `min_exists: true`
  - `target_kinds: ["UNKNOWN_TARGET_KIND"]`
  - `target_count: 1`

- Electrolyze:
  - oracle: `Electrolyze deals 2 damage divided as you choose among one or two targets.`
  - `min_exists: false`
  - `target_kinds: []`
  - `target_count: null`
  - note: el phrasing de target dividido actualmente produce minimum hints nulos.

## 6) Conclusiones diagnósticas
- Los targets simples de criatura se reconocen como `CREATURE`.
- En Abrade se ve agregación modal artifact/creature, pero `target_count=2` no equivale necesariamente a selección simultánea de dos targets.
- `any target` actualmente cae a `UNKNOWN_TARGET_KIND`.
- `target player/opponent` actualmente cae a `UNKNOWN_TARGET_KIND`.
- `target nonland permanent` actualmente cae a `UNKNOWN_TARGET_KIND`.
- `one or two targets / divided damage` actualmente produce `min_exists=false`.
- Esta microfase intencionalmente no reparó comportamiento.

## 7) Siguiente microfase recomendada
`A2.10_REAL_ORACLE_TARGET_KIND_CANONICALIZATION_V1`

Scope recomendado para la siguiente microfase:
- Reparación productiva estrecha para target kinds simples no modales:
  - `any target` -> `ANY_TARGET` o kind canónico equivalente si el contrato ya lo permite.
  - `target player / target opponent` -> `PLAYER` o kind canónico equivalente si el contrato ya lo permite.
  - `target nonland permanent` -> `PERMANENT` o kind conservador existente si el contrato lo permite; en caso contrario, mantener gap explícito.
- No reparar agregación modal de targets (Abrade) en la misma microfase.
- No reparar split target/divided damage (Electrolyze) en la misma microfase.
- Preservar separación `CostIR`, `TargetSpec`, `LegalityGate`.

## 8) Validación ejecutada y aprobada
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_target_shape_diagnosis_v1.test.ts`
  - `1 file passed`
  - `1 test passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_casting_legality_gate_guardrail_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_casting_legality_gate_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_activation_legality_gate_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_activation_legality_gate_guardrail_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
  - `1 file passed`
  - `8 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_contract_freeze_v1.test.ts`
  - `1 file passed`
  - `3 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_canonical_lowering_snapshot_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_real_oracle_lowering_ring_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_canonical_snapshot_ring_v1.test.ts`
  - `1 file passed`
  - `5 tests passed`
- `git diff --check origin/main..HEAD` limpio antes del push.
- Push correcto.
- Sincronización final verificada: `main == origin/main == 65aa3eb`.

## 9) Build/smoke
- `npm run build` no requerido porque el cambio operativo fue test-only.
- npm run build not required because the operational change was test-only.
- Smoke público no requerido: sin cambios en runtime visible, UI, overlay, CSE, loader, ordering ni public data.

## 10) Guardrails preservados
- Oracle permanece como input léxico/sintáctico.
- Comprehensive Rules permanecen como semántica de ejecución.
- `CostIR`, `TargetSpec` y `LegalityGate` permanecen separados.
- Los formal targets son solo diagnóstico en esta fase.
- Sin compensación por scoring, etiquetas UI, CSE ni overlay.
