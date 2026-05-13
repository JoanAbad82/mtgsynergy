# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION TARGET KINDS EMISSION PLAN V1

## 1) Identificación de microfase
- Name: `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_PLAN_V1`
- Status: Planificada / docs-only
- Baseline: `92f54fb`
- Relación: continuidad directa de `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_GUARDRAIL_RING_V1` (feature/test `353530d`, merge `3b53e4b`, cierre documental `92f54fb`).

## 2) Objetivo
Definir cómo y cuándo `allowed_target_kinds` puede conducir emisión de `target_kinds` en `costTargetLegalityMin` en una fase productiva futura.

Condiciones base:
- `allowed_target_kinds` ya es dato estructurado del modelo.
- `target_kinds` es proyección/agrupación downstream.
- `target_kinds` no debe convertirse en source of truth.
- `costTargetLegalityMin` no debe emitirse de forma amplia solo porque exista `allowed_target_kinds`.

## 3) Estado actual
Estado congelado del corpus real:
- `split_divided_damage_target_model` presente.
- `allowed_target_kinds` = `["ANY_TARGET"]`.
- `projected_target_kinds_from_model` = `["ANY_TARGET"]`.
- `current_min_exists` permanece false.
- `current_target_kinds` permanece `[]`.
- `target_count` permanece `null`.
- `modal_selection_model` permanece `null`.
- `legality_kinds` permanece `[]`.

## 4) Boundary model
Separación obligatoria entre:
- `split_divided_damage_target_model`
- `allowed_target_kinds`
- projected target kinds (`projected_target_kinds_from_model`)
- `target_kinds`
- `costTargetLegalityMin`
- `target_count`
- `modal_selection_model`
- `legality_kinds` y legality gates

Reglas:
- `allowed_target_kinds` pertenece al modelo estructurado split/divided.
- `projected_target_kinds_from_model` puede existir como evidencia interna/helper.
- `target_kinds` es canal público/diagnóstico solo cuando existe `costTargetLegalityMin`.
- `target_kinds` no debe forzar creación de `costTargetLegalityMin` salvo contrato futuro explícito.
- `target_count` permanece independiente.
- `modal_selection_model` permanece independiente.
- `legality_kinds` permanece independiente.

## 5) Emission policy options
### Opción A: mantener gating actual
- Descripción: existe `allowed_target_kinds`; la proyección se puede probar; `current_target_kinds` sigue `[]` mientras `costTargetLegalityMin` esté ausente.
- Pros: máximo conservadurismo, cero ensanchamiento del surface de min.
- Contras: consumidores que leen solo `target_kinds` no ven señal.
- Guardrails: preservar aislamiento de canales y baseline actual del corpus.

### Opción B: emitir `costTargetLegalityMin` mínimo cuando hay `allowed_target_kinds`
- Descripción: permitir `target_kinds: ["ANY_TARGET"]`, `target_count: null`, `modal_selection_model: null`, `legality_kinds: []`.
- Pros: exposición uniforme de `target_kinds` en canal min.
- Contras: riesgo de ampliar de forma transversal la política de emisión de `costTargetLegalityMin`.
- Guardrails: freeze explícito de no-impacto en `target_count`, modalidad y legalidad.

### Opción C: superficie específica split/divided sin widening general de min
- Descripción: mantener gating actual de min y exponer target class por canal específico split/divided.
- Pros: control fino, evita widening global de `costTargetLegalityMin`.
- Contras: posible duplicación de representación y mayor complejidad de consumidores.
- Guardrails: contrato claro de prioridad y consistencia entre canales.

## 6) Política recomendada
Recomendación conservadora:
- No ensanchar inmediatamente la emisión de `costTargetLegalityMin`.
- Abrir primero `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_CONTRACT_V1`.
- Implementar después solo si el contrato prueba que emitir `target_kinds` para split/divided no implica `target_count`, modalidad ni legalidad.
- Preferir regla aditiva específica de split/divided frente a parser amplio de targets.

## 7) Política de ANY_TARGET
- `ANY_TARGET` permanece umbrella.
- `ANY_TARGET` no se expande a `CREATURE`, `PLAYER`, `PLANESWALKER` o `BATTLE`.
- Si `target_kinds` se emite desde `allowed_target_kinds` con `ANY_TARGET`, el resultado esperado es solo `["ANY_TARGET"]`.
- Cualquier expansión futura requeriría contrato explícito separado.

## 8) Plan de corpus real
Corpus focal:
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

Estado y posible emisión futura por carta:
- Estado actual: `allowed_target_kinds: ["ANY_TARGET"]`, `target_count: null`, `modal_selection_model: null`, `legality_kinds: []`.
- Emisión futura posible: `target_kinds: ["ANY_TARGET"]` si y solo si el contrato de emisión lo habilita.

Compatibilidad de kind del modelo:
- Electrolyze: `ONE_OR_TWO_TARGETS`
- Arc Lightning: `ONE_TWO_OR_THREE_TARGETS`
- Flames of the Firebrand: `ONE_TWO_OR_THREE_TARGETS`
- Pyrotechnics: `ANY_NUMBER_OF_TARGETS`
- Rolling Thunder: `ANY_NUMBER_OF_TARGETS`

## 9) Política para ANY_NUMBER_OF_TARGETS
Para Pyrotechnics y Rolling Thunder:
- `conceptual_target_slots_min` debe permanecer `0` salvo contrato explícito posterior.
- `conceptual_target_slots_max` permanece `null`.
- `target_count` permanece `null`.
- Emitir `target_kinds` no debe inventar cardinalidad de objetivos.
- `target_kinds` describe clase permitida, no cantidad seleccionada.

## 10) Forbidden leakage
La futura fase productiva debe demostrar que la emisión de `target_kinds` no crea:
- `modal_selection_model`
- `target_count`
- `legality_kinds`
- `CAST_ONLY_IF`
- `ACTIVATE_ONLY_AS_SORCERY`
- `CONTROLS_X`
- `ATTACKED_THIS_TURN`
- `ONCE_EACH_TURN`
- `OTHER_LEGALITY_TEXT`

## 11) Siguiente microfase de contrato sugerida
`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_CONTRACT_V1`

Alcance probable del contrato:
- congelar si `costTargetLegalityMin` puede emitirse para split/divided target kinds;
- congelar si `target_kinds` puede ser `["ANY_TARGET"]` con `target_count: null`;
- congelar no-leakage modal/legal;
- congelar política de `ANY_NUMBER_OF_TARGETS` (min slot conservador);
- congelar expectativas del corpus actual.

## 12) Siguiente microfase productiva sugerida
`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_V1`

Alcance probable:
- `lower_to_ability_ir_min_v1.ts` si la emisión vive ahí;
- un test focal nuevo;
- posible actualización o nuevo guardrail ring;
- sin cambios en UI/config/scoring/public data.

## 13) Plan de validación futura
- Test focal que pruebe emisión de `target_kinds` desde `allowed_target_kinds`.
- Regresión que pruebe que `allowed_target_kinds` sigue siendo source estructurado.
- Guardrail de umbrella `ANY_TARGET`.
- Guardrail de `target_count` aún `null`.
- Guardrail de `modal_selection_model` aún `null`.
- Guardrail de `legality_kinds` aún `[]`.
- Contract guard.
- Split/divided guardrail ring.
- Lowering hint wiring.
- `git diff --check`.
- `npm run build` solo si hay cambios TypeScript runtime.
- Sin smoke público salvo cambio en superficie UI/runtime pública.

## 14) Criterios de cierre de esta microfase de plan
Esta microfase se considera cerrada cuando:
- solo se añade este documento;
- formato UTF-8 sin BOM;
- finales de línea LF;
- sin trailing whitespace;
- marcadores obligatorios presentes;
- commit docs-only;
- merge a main;
- push;
- `HEAD == origin/main`;
- working tree limpio.
