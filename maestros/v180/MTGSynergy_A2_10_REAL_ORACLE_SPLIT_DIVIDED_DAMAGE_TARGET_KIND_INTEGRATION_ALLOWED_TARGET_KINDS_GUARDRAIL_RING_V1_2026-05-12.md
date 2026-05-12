# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION ALLOWED TARGET KINDS GUARDRAIL RING V1

Fecha: 2026-05-12
Estado: Cerrada operativamente
Repositorio: `C:\MTGSynergy`
Rama final: `main`

## 1. Identificación de microfase

Nombre operativo:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_GUARDRAIL_RING_V1`

Tipo de microfase:

Test-only / guardrail ring.

Baseline de partida:

`14f1c30`

Commit de test/feature:

`353530d`

Mensaje:

`test: add a210 split divided damage allowed target kinds guardrail ring v1`

Merge operativo a `main`:

`3b53e4b`

Mensaje:

`merge: a210 split divided damage allowed target kinds guardrail ring v1`

Estado final operativo:

`HEAD == origin/main == 3b53e4b`

Working tree final:

limpio.

## 2. Objetivo

Congelar como guardrail ring estable la realidad estructurada introducida en la microfase anterior:

```text
split_divided_damage_target_model.allowed_target_kinds = ["ANY_TARGET"]
```

La microfase protege que `allowed_target_kinds` vive dentro de `split_divided_damage_target_model`, que `ANY_TARGET` permanece como umbrella canónico y que `target_kinds` no se convierte en fuente de verdad.

## 3. Archivo añadido

Se añadió exactamente un archivo test-only:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_guardrail_ring_v1.test.ts
```

No se modificó:

```text
runtime
lowering productivo
parser
contract JSON
tests existentes
UI
overlay
scoring
CSE
package/config
public data
build scripts
```

## 4. Guardrails congelados

La microfase congela estas fronteras:

```text
allowed_target_kinds pertenece al split_divided_damage_target_model
target_kinds no es fuente de verdad
target_kinds sigue gated por costTargetLegalityMin
target_count sigue siendo independiente
modal_selection_model sigue siendo independiente
legality_kinds sigue siendo independiente
ANY_TARGET no se expande
allowed_target_kinds no inventa target_count
```

## 5. Corpus real congelado

Corpus Oracle real validado:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

Para todo el corpus, el ring congela:

```text
split_divided_damage_target_model: presente
split_divided_damage_target_model.kind: SPLIT_DIVIDED_DAMAGE_TARGET_MODEL
productive_min_hint_currently_models_split_damage: true
allowed_target_kinds: ["ANY_TARGET"]
model_structured_target_kinds: ["ANY_TARGET"]
projected_target_kinds_from_model: ["ANY_TARGET"]
current_min_exists: false
current_target_kinds: []
target_count: null
modal_selection_model: null
legality_kinds: []
```

## 6. Split model kind congelado

El ring congela los tipos esperados:

```text
Electrolyze: ONE_OR_TWO_TARGETS
Arc Lightning: ONE_TWO_OR_THREE_TARGETS
Flames of the Firebrand: ONE_TWO_OR_THREE_TARGETS
Pyrotechnics: ANY_NUMBER_OF_TARGETS
Rolling Thunder: ANY_NUMBER_OF_TARGETS
```

## 7. Política ANY_TARGET

`ANY_TARGET` queda preservado como umbrella canónico.

No se expande a:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

La proyección desde el modelo puede devolver `["ANY_TARGET"]`, pero no puede transformarlo en clases específicas.

## 8. Política ANY_NUMBER_OF_TARGETS

Para `Pyrotechnics` y `Rolling Thunder`, el ring congela:

```text
conceptual_target_slots_min: 0
conceptual_target_slots_max: null
target_count: null
allowed_target_kinds: ["ANY_TARGET"]
```

Lectura correcta:

`allowed_target_kinds` describe clases permitidas. No describe cuántos objetivos se eligen y no inventa un mínimo de targets.

## 9. Forbidden leakage

El ring protege que estos valores no aparecen en `current_target_kinds`, `legality_kinds` ni en el `split_divided_damage_target_model` serializado:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

Estos valores pertenecen a legalidad u otros canales, no a clases de objetivo.

## 10. Projection helper guard

El ring usa directamente:

```text
__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1
```

Casos protegidos:

```text
{ allowed_target_kinds: ["ANY_TARGET", "CREATURE", "PLAYER"] } -> ["ANY_TARGET"]
{ allowed_target_kinds: ["CREATURE", "PLAYER", "CREATURE"] } -> ["CREATURE", "PLAYER"]
{ allowed_target_kinds: ["CAST_ONLY_IF", "INVALID", 7, null] } -> []
null / undefined / {} / non-object -> []
```

Esto congela:

```text
deduplicación canónica
filtrado de valores inválidos
preservación de ANY_TARGET como umbrella
degradación conservadora para inputs inválidos
```

## 11. Validación ejecutada

Nuevo guardrail ring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_guardrail_ring_v1.test.ts

1 file passed
2 tests passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_GUARDRAIL_RING_V1_COMPLETE
```

Allowed target kinds extraction v1:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_extraction_v1.test.ts

1 file passed
1 test passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_EXTRACTION_V1_COMPLETE
```

Extraction v1:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts

1 file passed
2 tests passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_V1_COMPLETE
```

Extraction guardrail ring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts

1 file passed
2 tests passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_GUARDRAIL_RING_V1_COMPLETE
```

Contract guard:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.test.ts

1 file passed
2 tests passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_CONTRACT_V1_COMPLETE
```

Split/divided model guardrail ring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts

1 file passed
1 test passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_GUARDRAIL_RING_COMPLETE
```

Lowering hint wiring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts

1 file passed
8 tests passed
```

Diff hygiene:

```text
git diff --check
clean

git diff --cached --check
clean

post-merge git diff --check
clean
```

No se ejecutó build porque la microfase fue estrictamente test-only y no tocó runtime ni bundle.

## 12. Estado Git final

Feature/test commit:

```text
353530d test: add a210 split divided damage allowed target kinds guardrail ring v1
```

Merge commit:

```text
3b53e4b merge: a210 split divided damage allowed target kinds guardrail ring v1
```

Push:

```text
14f1c30..3b53e4b main -> main
```

Estado final:

```text
branch: main
HEAD: 3b53e4b
origin/main: 3b53e4b
working tree: clean
```

## 13. Interpretación técnica

La microfase convierte la nueva realidad estructurada en una regresión estable:

```text
split_divided_damage_target_model.allowed_target_kinds -> projection helper -> projected target kinds
```

sin convertir `target_kinds` en fuente de verdad y sin forzar `costTargetLegalityMin`.

Valor técnico cerrado:

```text
allowed_target_kinds protegido dentro del modelo
ANY_TARGET protegido como umbrella
target_kinds sigue gated
target_count separado
modal_selection_model separado
legality_kinds separado
legality gates separados
ANY_NUMBER_OF_TARGETS conserva min slot 0
```

## 14. Resultado

La microfase queda cerrada operativamente.

Queda pendiente únicamente este cierre documental en `maestros/v180`.

## 15. Siguiente microfase recomendada

Siguiente frente recomendado:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_PLAN_V1`

Objetivo sugerido:

Planificar si conviene, y bajo qué contrato, permitir que `allowed_target_kinds` derive `target_kinds` en `costTargetLegalityMin` para este corpus, sin forzar emisiones amplias, sin romper el gating actual y sin contaminar `target_count`, `modal_selection_model` ni `legality_kinds`.