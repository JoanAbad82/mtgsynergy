# MTGSynergy — Cierre de microfase

## Identificación
- Microfase: `ANALYZER_CREATURE_SPELL_PAYOFF_LABEL_CONTEXT_WIRING_REPAIR_V2`
- Fecha de cierre: `2026-05-10`
- Estado operativo: `main == origin/main == bf60bd1`
- Commits relevantes:
  - `22d1c93` — `fix(semantic): wire creature spell payoff label context`
  - `bf60bd1` — `merge: analyzer creature spell payoff label context wiring repair v2`
  - `10ef396` — `docs: close analyzer creature spell payoff label repair v1`

## Causa real del fallo
- El edge real traía `cast_spell_context: CREATURE_SPELL`.
- La ruta de label leía `castSpellContext`.
- Ese mismatch forzaba fallback en `explainKeyHuman(...)`:
  - `Lanzas instantáneo o conjuro (experimental)`
- La V2 acepta ambos formatos:
  - `castSpellContext`
  - `cast_spell_context`

## Cambios operativos cerrados
- `src/components/analyzer/SemanticOverlayPanel.tsx`
- `src/components/analyzer/tests/semantic_overlay_panel.test.ts`
- `src/engine/semantic/overlay/sem_profile.ts`
- `src/engine/semantic/tests/sem_overlay_cast_spell_draw_cards_local_bridge_min_v1.test.ts`

## Resultado funcional
- Creature-spell payoff muestra:
  - `Lanzas un hechizo de criatura (experimental)`
- Fallback histórico preservado:
  - `Lanzas instantáneo o conjuro (experimental)`

## Validaciones locales
- `git diff --check` → OK
- cast-spell/draw-cards ring → `2 files`, `3 tests passed`
- Elves/ramp → `1 file`, `3 tests passed`
- SemanticOverlayPanel → `1 file`, `13 tests passed`
- draw-second no-regression → `2 files`, `2 tests passed`
- `npm run build` → OK
- cards_index manifest verified → OK

## Auditoría real post-patch
- `resolvedUnique: 10`
- `missingUnique: 0`
- `edgesTopCount: 6`
- Beast Whisperer edge: `cast_spell_context: CREATURE_SPELL`
- labels:
  - `Lanzas un hechizo de criatura (experimental)`
  - `Action · DRAW_CARDS`
- `hasCreatureLabel: true`
- `hasWrongFallback: false`

## Smoke público
- Producción sirve `bf60bd1`
- HTML:
  - meta git-sha `bf60bd195e8afd6f0ee54ceeb4a90ae5236bc902`
  - build: `bf60bd1`
- Bundle:
  - `/_astro/AnalyzerApp.xKDo2i1Y.js`
- Strings en bundle:
  - `Lanzas un hechizo de criatura` => `True`
  - `Lanzas instantáneo o conjuro` => `True`
  - `cast_spell_context` => `True`
  - `castSpellContext` => `True`
  - `CREATURE_SPELL` => `True`
- Guardrails:
  - `ranking final` => `False`
  - `recomendación final` => `False`
  - `score del CSE` => `False`

## No-goals respetados
- Sin cambios en parser.
- Sin bridge nuevo.
- Sin cambios de scoring/ranking.
- Sin cambios en CSE/SPS/Monte Carlo.
- Sin cambios grandes de UI ni estilos globales.