# MTGSynergy — Metodología Operativa Consolidada Post-v90 v1
Fecha: 2026-04-19
Estado base verificado: `main`, `HEAD == origin/main == e648475`

## 1) Propósito y alcance
Consolidar en un único artefacto operativo post-v90, sin reabrir motor ni FQ, fijando: ring estable v1, decks canónicos v1, snapshot estructurado mínimo v1, bloque estándar freeze/prompt CODEX v1 y puerta de promoción A/B/C v1.

## 2) Estado de partida post-v90
- v90 cerró `FQ-M4` y dejó separación bootstrap vs real-seed absorbida en `e648475`.
- No autorizado por continuidad: reabrir motor, reabrir FQ-M4, recalibrar `OPEN_CANDIDATE`, implementar `NEEDS_RECONCILIATION`, limpieza física masiva u ordenación física.
- Corpus de referencia aplicado:  
  `maestros/v90/MTGSynergy_CIERRE_DOCUMENTAL_REAL_v90_2026-04-18.txt`  
  `maestros/ops/MTGSynergy_FAMILY_QUALIFICATION_SYSTEM_V1_MASTER_SPEC.md`  
  `fuentes/MTGSynergy_PROTOCOLO_OPERATIVO_POST_v33_VALIDATION_AND_MICROPHASE_WORKFLOW_v1_2026-03-19.md`

## 3) Qué es canónico activo hoy
### Canónico activo (gobernante)
- `maestros/v33/POST_V33_WORKFLOW_EXECUTABLE_v1.md` (ring/decks/snapshot/puerta A-B-C).
- `tools/semantics/gold/post_v33_canonical_smoke_v1.json` (decks canónicos v1).
- `tools/semantics/gold/post_v33_snapshot_schema_v1.json` (snapshot mínimo v1).
- Este documento: `maestros/ops/MTGSynergy_METODOLOGIA_OPERATIVA_CONSOLIDADA_POST_v90_v1.md`.

### Histórico/derivado (referencia no gobernante)
- `tools/semantics/gold/sem_gold_v1_*`, `sem_gold_v2_*`, `sem_gold_v3_*`.
- Prompts/cierres de continuidad por versión (`maestros/v8x`, `maestros/v9x`) fuera de este cierre operativo.

### Auxiliar/no gobernante (verificación operativa)
- `scripts/qa/run_post_v33_ring.mjs`.
- `scripts/qa/run_post_v33_smoke.mjs`.

## 4) Ring estable v1
Ring canónico activo (7 tests, fijo y no expansivo por inercia):
- `src/engine/semantic/tests/sem_overlay_deal_damage_lose_life_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_damage_with_lifelink_life_gain_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_produce_mana_enablement_closure_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_counters_matter_local_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_tapped_status_local_enablement_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_leaves_battlefield_draw_cards_local_bridge_min_v1.test.ts`
- `src/engine/semantic/tests/sem_overlay_cast_spell_draw_cards_local_bridge_min_v1.test.ts`

Verificación estructural auxiliar del ring:
- `node scripts/qa/run_post_v33_ring.mjs`

## 5) Decks canónicos v1
Fuente canónica activa:
- `tools/semantics/gold/post_v33_canonical_smoke_v1.json`

Decks fijados:
- `rakdos_dies_payoff_v1`
- `spells_matter_damage_v1`
- `draw_second_tokens_damage_v1`

## 6) Snapshot estructurado mínimo v1
Fuente canónica activa:
- `tools/semantics/gold/post_v33_snapshot_schema_v1.json`

`required_top_level`:
- `coverage`
- `SOS`
- `total_edge_score`
- `top_edges`
- `forbidden_edges_absent`

`optional_top_level`:
- `labels_clave`
- `buckets_clave`
- `notes`

## 7) Bloque estándar de freeze/prompt CODEX v1
Plantilla operativa mínima reutilizable:

```txt
MICROFASE: <ID> — <NOMBRE>
NATURALEZA: <metodológica|semántica> (una sola)

OBJETIVO CONTRACTUAL EXACTO
- <resultado verificable único>

ALCANCE PERMITIDO
- <lista cerrada de archivos/rutas>

NO-GOALS EXPLÍCITOS
- <motor/ui/runtime/refactor/limpieza/ordenación fuera de scope>

CORPUS FOCAL OBLIGATORIO
- <artefactos existentes y verificables>

VALIDACIÓN OBLIGATORIA
- Anillo A: <test focal contractual>
- Anillo B: ring estable v1 (7 tests fijados)
- Anillo C: <aplica/no aplica> + motivo explícito

FORMATO DE RETORNO OBLIGATORIO
1) archivos inspeccionados
2) confirmación de alcance
3) candidatos elegidos
4) diff/resumen estructurado
5) comandos ejecutados
6) resultado final

REGLA DURA
- sin commit/push/deploy salvo instrucción explícita
```

## 8) Puerta de promoción A/B/C v1
- Si falla A: microfase detenida.
- Si falla B: sin cierre operativo ni promoción.
- C es condicional; aplica cuando el diff toca alguno:
  - UI visible (`src/components/**`, páginas, copy visible).
  - scoring/prominence/surface contractual visible.
  - runtime de ejecución (stack/priority/simulación/stateful).
  - carga de datos o salida visible de snapshots/overlay en producción.
- Si C aplica y falla: sin cierre operativo ni promoción.
- Solo con A+B verdes y C verde cuando aplique: promoción permitida.

## 9) Qué queda fuera
- Reabrir motor.
- Reabrir FQ-M4.
- Cambiar contratos semánticos existentes.
- Recalibrar `OPEN_CANDIDATE`.
- Implementar `NEEDS_RECONCILIATION`.
- Limpieza física masiva / ordenación física del repo.

Estado metodológico de esos puntos:
- `documentado pero no institucionalizado` para esta consolidación post-v90 v1.

## 10) Criterio de uso en siguientes microfases
1. Tomar este documento como gate metodológico único de entrada.
2. Congelar cada microfase con el bloque estándar CODEX v1.
3. Ejecutar A y B siempre; ejecutar C solo con disparador explícito.
4. Si no hay evidencia material nueva y limpia, mantener cierre/auditoría sin abrir frente nuevo.
5. Si para institucionalizar un cambio futuro hiciera falta tocar más artefactos, registrar deuda metodológica explícita en el freeze de esa microfase, sin romper alcance.
