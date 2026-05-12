# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION ALLOWED TARGET KINDS EXTRACTION V1

Fecha: 2026-05-12
Estado: Cerrada operativamente
Repositorio: `C:\MTGSynergy`
Rama final: `main`

## 1. Identificación de microfase

Nombre operativo:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_EXTRACTION_V1`

Tipo de microfase:

Productiva mínima con tests focales y actualización de guardrails afectados.

Baseline de partida:

`40d0210`

Commit de feature:

`ca847c1`

Mensaje:

`feat: add a210 split divided damage allowed target kinds extraction v1`

Merge operativo a `main`:

`710e54e`

Mensaje:

`merge: a210 split divided damage allowed target kinds extraction v1`

Estado final operativo:

`HEAD == origin/main == 710e54e`

Working tree final:

limpio.

## 2. Objetivo

Añadir `allowed_target_kinds` como dato estructurado dentro de `split_divided_damage_target_model` para templates split/divided damage ya reconocidos de forma segura por el modelo.

La microfase no convierte `target_kinds` en fuente de verdad. `target_kinds` sigue siendo una proyección/agregación posterior, subordinada al modelo estructurado.

## 3. Archivos modificados

Se modificaron exactamente cinco archivos dentro del scope permitido:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_extraction_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts
```

No se modificó:

```text
parser
contract JSON
UI
overlay
scoring
CSE
package/config
public data
build scripts
```

## 4. Cambio técnico implementado

Se añadió `allowed_target_kinds: ["ANY_TARGET"]` dentro de `split_divided_damage_target_model` para templates split/divided damage reconocidos por `inferSplitDividedDamageTargetModelMinV1(...)`.

Templates cubiertos:

```text
ONE_OR_TWO_TARGETS
ONE_TWO_OR_THREE_TARGETS
ANY_NUMBER_OF_TARGETS
```

La evidencia estructurada queda en el modelo, no en un parser amplio de Oracle text.

## 5. Resultado del corpus real

Corpus Oracle real validado:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

Para el corpus, el modelo queda así a nivel conceptual:

```text
split_divided_damage_target_model: presente
allowed_target_kinds: ["ANY_TARGET"]
model_structured_target_kinds: ["ANY_TARGET"]
projected_target_kinds_from_model: ["ANY_TARGET"]
current_target_kinds: []
target_count: null
modal_selection_model: null
legality_kinds: []
```

Lectura correcta:

`allowed_target_kinds` ya existe como dato estructurado dentro del modelo split/divided. Sin embargo, `current_target_kinds` permanece vacío porque no se fuerza la emisión de `costTargetLegalityMin`.

Esto preserva el gating actual y evita ampliar la superficie runtime más allá del objetivo de la microfase.

## 6. Política ANY_TARGET

La microfase preserva `ANY_TARGET` como umbrella canónico.

No se expande a:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

Si `allowed_target_kinds` contiene `ANY_TARGET`, la proyección estructurada puede devolver `["ANY_TARGET"]`, pero no debe convertirlo en clases específicas.

## 7. Canales independientes preservados

Se preserva la separación entre:

```text
split_divided_damage_target_model
allowed_target_kinds
target_kinds
target_count
modal_selection_model
legality_kinds
legality gates
```

La microfase valida que:

```text
target_kinds no reemplaza split_divided_damage_target_model
target_kinds no reemplaza target_count
allowed_target_kinds no inventa target_count
allowed_target_kinds no crea modal_selection_model
allowed_target_kinds no crea legality_kinds
allowed_target_kinds no crea legality gates
```

## 8. Legalidad y leakage

La microfase valida que no se introduzcan gates de legalidad como:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

Estos valores siguen perteneciendo al canal de legalidad, no al canal de clases de objetivo.

## 9. Política ANY_NUMBER_OF_TARGETS

Para `Pyrotechnics` y `Rolling Thunder`, se preserva:

```text
split_damage_model_kind: ANY_NUMBER_OF_TARGETS
conceptual_target_slots_min: 0
conceptual_target_slots_max: null
target_count: null
allowed_target_kinds: ["ANY_TARGET"]
```

`allowed_target_kinds` describe clases permitidas, no cuántos targets se eligen.

No se inventa un mínimo de targets.

## 10. Validación ejecutada

Test focal nuevo:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_extraction_v1.test.ts

1 file passed
1 test passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_EXTRACTION_V1_COMPLETE
```

Test de extracción v1:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts

1 file passed
2 tests passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_V1_COMPLETE
```

Guardrail ring de extracción:

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

Build antes del commit:

```text
npm run build
cards_index manifest verified: OK
astro build complete
4 page(s) built
```

Build final en `main` tras merge:

```text
npm run build
cards_index manifest verified: OK
astro build complete
4 page(s) built
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

## 11. Estado Git final

Feature commit:

```text
ca847c1 feat: add a210 split divided damage allowed target kinds extraction v1
```

Merge commit:

```text
710e54e merge: a210 split divided damage allowed target kinds extraction v1
```

Push:

```text
40d0210..710e54e main -> main
```

Estado final:

```text
branch: main
HEAD: 710e54e
origin/main: 710e54e
working tree: clean
```

## 12. Interpretación técnica

La microfase cierra el siguiente avance:

```text
split_divided_damage_target_model.allowed_target_kinds = ["ANY_TARGET"]
```

para templates split/divided reconocidos.

Esto convierte la proyección anterior en un pipeline estructurado:

```text
split_divided_damage_target_model.allowed_target_kinds
-> projection helper
-> projected target kinds
```

sin convertir `target_kinds` en fuente de verdad y sin forzar `costTargetLegalityMin`.

## 13. Resultado

La microfase queda cerrada operativamente.

Queda pendiente únicamente este cierre documental en `maestros/v179`.

## 14. Siguiente microfase recomendada

Siguiente frente recomendado:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_GUARDRAIL_RING_V1`

Objetivo sugerido:

Congelar como ring estable la nueva realidad estructurada:

```text
allowed_target_kinds presente dentro de split_divided_damage_target_model
ANY_TARGET preservado como umbrella
target_kinds sigue gated por costTargetLegalityMin
target_count sigue independiente
modal_selection_model sigue independiente
legality_kinds sigue independiente
ANY_NUMBER_OF_TARGETS conserva min slot 0
```