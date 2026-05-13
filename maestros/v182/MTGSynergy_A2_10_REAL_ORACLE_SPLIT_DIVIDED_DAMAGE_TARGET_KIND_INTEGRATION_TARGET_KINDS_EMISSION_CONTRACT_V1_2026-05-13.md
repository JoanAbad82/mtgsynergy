# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION TARGET KINDS EMISSION CONTRACT V1

Fecha: 2026-05-13
Estado: Cerrada operativamente; cierre documental registrado aquí
Repositorio: `C:\MTGSynergy`
Rama final: `main`

## 1. Identificación de microfase

Nombre operativo:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_CONTRACT_V1`

Tipo de microfase:

Contract/test-only.

Baseline de partida:

`94252e9`

Commit de feature/test:

`cebc786`

Mensaje:

`test: add a210 split divided damage target kinds emission contract v1`

Merge operativo a `main`:

`e233b45`

Mensaje:

`merge: a210 split divided damage target kinds emission contract v1`

Estado final operativo:

`HEAD == origin/main == e233b45`

Working tree final:

limpio.

## 2. Objetivo

Congelar un contrato explícito para una futura emisión de `target_kinds` desde `split_divided_damage_target_model.allowed_target_kinds` hacia `costTargetLegalityMin.target_kinds`.

La microfase no implementa emisión runtime.

El objetivo fue fijar la frontera contractual antes de tocar `costTargetLegalityMin`.

## 3. Archivos añadidos

Se añadieron exactamente dos archivos contract/test-only:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_contract_v1.test.ts
```

No se modificó:

```text
runtime
lowering productivo
parser
tests existentes
contract JSON existentes
UI
overlay
scoring
CSE
package/config
public data
build scripts
```

## 4. Contrato congelado

El contrato añadido identifica:

```text
contract_id: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_CONTRACT_V1
status: contract_only_no_runtime_emission
baseline: 94252e9
source_model: split_divided_damage_target_model
source_field: allowed_target_kinds
projected_field: projected_target_kinds_from_model
emission_target: costTargetLegalityMin.target_kinds
runtime_emission_in_this_phase: false
```

Decisión central:

```text
No se implementa emisión de target_kinds en esta fase.
```

## 5. Estado actual congelado

Para el corpus real, el contrato congela la realidad actual:

```text
split_divided_damage_target_model: presente
allowed_target_kinds: ["ANY_TARGET"]
projected_target_kinds_from_model: ["ANY_TARGET"]
current_min_exists: false
current_target_kinds: []
target_count: null
modal_selection_model: null
legality_kinds: []
```

Lectura técnica:

`allowed_target_kinds` ya existe como dato estructurado dentro del modelo split/divided. `projected_target_kinds_from_model` demuestra la proyección posible. Pero `costTargetLegalityMin` no se fuerza todavía y `target_kinds` permanece vacío en el runtime actual.

## 6. Corpus real congelado

Corpus validado:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

Split model kinds esperados:

```text
Electrolyze: ONE_OR_TWO_TARGETS
Arc Lightning: ONE_TWO_OR_THREE_TARGETS
Flames of the Firebrand: ONE_TWO_OR_THREE_TARGETS
Pyrotechnics: ANY_NUMBER_OF_TARGETS
Rolling Thunder: ANY_NUMBER_OF_TARGETS
```

## 7. Política ANY_TARGET

El contrato preserva `ANY_TARGET` como umbrella canónico.

No se expande a:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

Futura emisión permitida, si se implementa bajo contrato:

```text
allowed_target_kinds: ["ANY_TARGET"] -> target_kinds: ["ANY_TARGET"]
```

No se permite convertir `ANY_TARGET` en clases específicas sin una microfase contractual explícita.

## 8. Canales independientes preservados

El contrato congela que `target_kinds` no es fuente de verdad.

Canales separados:

```text
split_divided_damage_target_model
allowed_target_kinds
projected_target_kinds_from_model
costTargetLegalityMin
target_kinds
target_count
modal_selection_model
legality_kinds
legality gates
```

Reglas congeladas:

```text
target_kinds no sustituye split_divided_damage_target_model
target_kinds no inventa target_count
target_kinds no crea modal_selection_model
target_kinds no crea legality_kinds
target_kinds no crea legality gates
costTargetLegalityMin no se fuerza en esta fase
```

## 9. Forbidden leakage

El contrato y el test protegen que estos valores no aparezcan en `current_target_kinds`, `legality_kinds` ni en el modelo split/divided serializado:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

Estos valores pertenecen a legalidad u otros canales, no al canal de clases de objetivo.

## 10. Política ANY_NUMBER_OF_TARGETS

Para `Pyrotechnics` y `Rolling Thunder`, el contrato congela:

```text
split_damage_model_kind: ANY_NUMBER_OF_TARGETS
conceptual_target_slots_min: 0
conceptual_target_slots_max: null
target_count: null
target_kinds_emission_must_not_invent_target_count: true
```

Lectura correcta:

`target_kinds` describe clases permitidas, no cuántos objetivos se eligen.

## 11. Validación ejecutada

Test nuevo de contrato:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_contract_v1.test.ts

1 file passed
2 tests passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KINDS_EMISSION_CONTRACT_V1_COMPLETE
```

Allowed target kinds guardrail ring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_guardrail_ring_v1.test.ts

1 file passed
2 tests passed
```

Allowed target kinds extraction v1:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_extraction_v1.test.ts

1 file passed
1 test passed
```

Extraction v1:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts

1 file passed
2 tests passed
```

Extraction guardrail ring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts

1 file passed
2 tests passed
```

Previous contract guard:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.test.ts

1 file passed
2 tests passed
```

Split/divided model guardrail ring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts

1 file passed
1 test passed
```

Lowering hint wiring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts

1 file passed
8 tests passed
```

Higiene de diff:

```text
git diff --check
clean

git diff --cached --check
clean

post-merge git diff --check
clean
```

No se ejecutó build porque la microfase fue contract/test-only y no tocó runtime ni bundle.

## 12. Incidencia operativa resuelta

Durante la primera validación apareció un fallo de marker:

```text
ERROR: missing test marker: Electrolyze
```

Diagnóstico:

El test no contenía literalmente `Electrolyze` porque el corpus se recorría desde el contrato JSON. La implementación no estaba mal; el error estaba en la validación manual previa, que exigía nombres de cartas como literales dentro del test.

Corrección:

Se repitió la validación separando:

```text
nombres de cartas exigidos en el contract JSON
markers funcionales exigidos en el test
```

La validación recuperada pasó correctamente.

## 13. Estado Git final operativo

Feature/test commit:

```text
cebc786 test: add a210 split divided damage target kinds emission contract v1
```

Merge commit:

```text
e233b45 merge: a210 split divided damage target kinds emission contract v1
```

Push:

```text
94252e9..e233b45 main -> main
```

Estado final operativo:

```text
branch: main
HEAD: e233b45
origin/main: e233b45
working tree: clean
```

## 14. Interpretación técnica

Esta microfase cierra el contrato previo a una posible emisión runtime:

```text
split_divided_damage_target_model.allowed_target_kinds
-> projected_target_kinds_from_model
-> futura costTargetLegalityMin.target_kinds
```

Pero mantiene congelado que la fase actual no fuerza:

```text
costTargetLegalityMin
target_kinds
target_count
modal_selection_model
legality_kinds
legality gates
```

## 15. Resultado

La microfase queda cerrada operativamente y este documento registra su cierre documental.

## 16. Siguiente microfase recomendada

Siguiente frente recomendado:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_V1`

Objetivo sugerido:

Implementar, si procede, la emisión mínima y contratada de `target_kinds: ["ANY_TARGET"]` desde `allowed_target_kinds`, sin inventar `target_count`, sin crear `modal_selection_model`, sin llenar `legality_kinds` y sin expandir `ANY_TARGET`.