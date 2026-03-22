# POST-v33 — institucionalización operativa del protocolo A/B/C v1

## finalidad
Fijar la base operativa mínima y trazable para ejecutar microfases post-v33 sin abrir alcance lateral ni cambiar contratos visibles.

## freeze post-v57 (metodológico)
- Alcance: solo workflow/operativa (ring, decks, snapshot, plantilla CODEX, puerta A/B/C).
- No abre familias semánticas nuevas.
- No toca parser/lowering/runtime/scoring/UI.
- Reutiliza artefactos existentes en vez de duplicar.

## artefactos canónicos reutilizables (no duplicar)
- Workflow base: `maestros/v33/POST_V33_WORKFLOW_EXECUTABLE_v1.md`
- Protocolo operativo: `maestros/v33/MTGSynergy_PROTOCOLO_OPERATIVO_POST_v33_VALIDATION_AND_MICROPHASE_WORKFLOW_v1_2026-03-19.md`
- Verificación ring: `scripts/qa/run_post_v33_ring.mjs`
- Verificación smoke/snapshot: `scripts/qa/run_post_v33_smoke.mjs`
- Decks smoke: `tools/semantics/gold/post_v33_canonical_smoke_v1.json`
- Snapshot shape: `tools/semantics/gold/post_v33_snapshot_schema_v1.json`

## Anillo B estable v1 (canónico único post-v57)
Ring pequeño y reutilizable para proteger familias absorbidas sin expansión por inercia.

### Ring canónico post-v57 (overlay bridges locales)
- `src/engine/semantic/tests/sem_overlay_deal_damage_lose_life_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_damage_with_lifelink_life_gain_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_produce_mana_enablement_closure_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_counters_matter_local_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_tapped_status_local_enablement_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_leaves_battlefield_draw_cards_local_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_cast_spell_draw_cards_local_bridge_min_v1.test.ts`

Total canónico del ring: **7 tests**.

### Regla operativa del ring
- Mantenerlo corto (5-8 tests).
- Solo familias cerradas y absorbidas.
- Cualquier alta nueva exige justificación de riesgo de regresión real.

## Decks canónicos v1
Decks pequeños, congelados y con propósito técnico explícito:

- `rakdos_dies_payoff_v1`:
  smoke de ejes sacrifice/dies/payoff y edges prohibidos.
- `spells_matter_damage_v1`:
  smoke de cast-spell damage y coherencia de overlay de hechizos.
- `draw_second_tokens_damage_v1`:
  smoke de draw-second + tokens + damage con diff estable.

Fuente canónica de decks:
- `tools/semantics/gold/post_v33_canonical_smoke_v1.json`

## Snapshot estructurado v1
- required_top_level: `coverage`, `SOS`, `total_edge_score`, `top_edges`, `forbidden_edges_absent`
- optional_top_level: `labels_clave`, `buckets_clave`, `notes`
- formato orientado a diff corto, estable y legible

Fuente canónica de shape:
- `tools/semantics/gold/post_v33_snapshot_schema_v1.json`

## Bloque estándar para CODEX (plantilla congelada)
Usar este bloque base en cada microfase:

1. Objetivo exacto (una sola microfase).
2. Freeze de alcance (qué entra / qué no entra).
3. Archivos permitidos (lista cerrada).
4. No-goals explícitos (runtime, UI, widening, refactors).
5. Cambio mínimo esperado (contrato/wiring/test focal).
6. Validación obligatoria (Anillo A/B y C si aplica).
7. Formato de retorno obligatorio (preflight, cambios, tests, resultado).
8. Prohibición explícita de commit/push salvo instrucción directa.

## Puerta de promoción
- Anillo A: siempre obligatorio. Debe validar el foco exacto del slice.
- Anillo B: siempre obligatorio en microfases semánticas/overlay/contrato.
- Anillo C: condicional; aplica solo cuando hay riesgo real en surface visible o runtime.

### Criterio operativo de activación de Anillo C
Disparar Anillo C si el diff toca alguno de estos frentes:
- UI visible (`src/components/**`, páginas, copy visible).
- Scoring/prominence/surface contractual visible.
- Runtime de ejecución (stack/priority/simulación/stateful).
- Carga de datos o salida visible de snapshots/overlay en producción.

Si nada de lo anterior cambia:
- `Anillo C no aplica en esta microfase`.

## guardrails
- no tocar `src/engine/**` salvo tests estrictamente necesarios para ring.
- no tocar `src/components/**` ni surface visible de UI.
- no tocar scoring global.
- no deploy requerido para cierre metodológico por defecto.

## cierre esperado
- ring estable pequeño, congelado y reutilizable.
- decks canónicos explícitos y con propósito técnico.
- shape de snapshot estructurado fijada y trazable.
- bloque estándar para CODEX reutilizable.
- puerta A/B/C operativa para promoción disciplinada.
