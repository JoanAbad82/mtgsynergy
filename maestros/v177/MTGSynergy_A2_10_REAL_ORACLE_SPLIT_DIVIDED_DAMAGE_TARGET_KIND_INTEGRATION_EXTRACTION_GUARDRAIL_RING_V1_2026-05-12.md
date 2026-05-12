# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION EXTRACTION GUARDRAIL RING V1

Fecha: 2026-05-12
Estado: Cerrada operativamente
Repositorio: `C:\MTGSynergy`
Rama final: `main`

## 1. Identificación de microfase

Nombre operativo:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_GUARDRAIL_RING_V1`

Tipo de microfase:

Test-only / guardrail ring.

Baseline de partida:

`929a7c4`

Commit de test/feature:

`b87613f`

Mensaje:

`test: add a210 split divided damage target kind extraction guardrail ring v1`

Merge operativo a `main`:

`021b90f`

Mensaje:

`merge: a210 split divided damage target kind extraction guardrail ring v1`

Estado final operativo:

`HEAD == origin/main == 021b90f`

Working tree final:

limpio.

## 2. Objetivo

Congelar como guardrail ring estable la integración añadida en la microfase anterior:

`split_divided_damage_target_model -> target_kinds`

La microfase protege que la proyección de `target_kinds` solo ocurra desde datos estructurados del modelo split/divided, sin abrir parser general de targets y sin inferir clases de objetivo desde Oracle text laxo.

## 3. Archivo añadido

Se añadió exactamente un archivo test-only:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts
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
target_kinds no reemplaza split_divided_damage_target_model
target_kinds no reemplaza target_count
target_kinds no crea modal_selection_model
target_kinds no crea legality_kinds
target_kinds no crea legality gates
ANY_TARGET no se expande a clases específicas
no se deriva target kind desde Oracle text laxo
no se abre parser general de targets
```

## 5. Proyección estructurada positiva

El guardrail ring prueba directamente la ruta:

`__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(...)`

Casos congelados:

```text
allowed_target_kinds
allowedTargetKinds
target_kinds
targetKinds
```

Valores canónicos permitidos:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
ANY_TARGET
```

Comportamiento protegido:

```text
ANY_TARGET permanece como umbrella
ANY_TARGET no se expande a CREATURE / PLAYER / PLANESWALKER / BATTLE
duplicados se deduplican
valores inválidos se filtran
inputs vacíos, inválidos o no-objeto degradan a []
```

## 6. Exclusión de valores no canónicos

El test congela que estos valores no pueden sobrevivir como `target_kinds`:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

Estos valores pertenecen a legalidad u otras capas, no al canal de clases de objetivo.

## 7. Corpus real congelado

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
target_kinds: []
target_count: null
modal_selection_model: null
legality_kinds: []
```

Lectura correcta:

El corpus real conserva `target_kinds` vacío porque el modelo split/divided actual todavía no expone arrays estructurados como `allowed_target_kinds`, `allowedTargetKinds`, `target_kinds` o `targetKinds`.

La microfase protege ese comportamiento conservador.

## 8. Split model kind congelado

El ring congela los tipos de modelo split/divided esperados:

```text
Electrolyze: ONE_OR_TWO_TARGETS
Arc Lightning: ONE_TWO_OR_THREE_TARGETS
Flames of the Firebrand: ONE_TWO_OR_THREE_TARGETS
Pyrotechnics: ANY_NUMBER_OF_TARGETS
Rolling Thunder: ANY_NUMBER_OF_TARGETS
```

## 9. Política ANY_NUMBER_OF_TARGETS

Para `Pyrotechnics` y `Rolling Thunder`, el ring congela:

```text
conceptual_target_slots_min: 0
conceptual_target_slots_max: null
target_count: null
```

No se inventa un mínimo de targets desde wording amplio. La política conservadora de slot mínimo `0` queda preservada.

## 10. Validación ejecutada

Test nuevo guardrail ring:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts

1 file passed
2 tests passed
marker:
SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_GUARDRAIL_RING_V1_COMPLETE
```

Test de extracción v1:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts

1 file passed
2 tests passed
```

Contract guard:

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

No se ejecutó build porque la microfase fue estrictamente test-only y no tocó runtime ni bundle.

## 11. Estado Git final

Feature/test commit:

```text
b87613f test: add a210 split divided damage target kind extraction guardrail ring v1
```

Merge commit:

```text
021b90f merge: a210 split divided damage target kind extraction guardrail ring v1
```

Push:

```text
929a7c4..021b90f main -> main
```

Estado final:

```text
branch: main
HEAD: 021b90f
origin/main: 021b90f
working tree: clean
```

## 12. Interpretación técnica

La microfase convierte la integración anterior en una regresión estable.

Valor técnico cerrado:

```text
proyección estructurada positiva protegida
baseline conservadora del corpus real protegida
ANY_TARGET protegido como umbrella
valores no canónicos filtrados
legality gates separados de target_kinds
modal_selection_model separado
target_count separado
split_divided_damage_target_model preservado como fuente semántica propia
```

Esto mantiene la tesis de A2.10:

```text
coste, target y legalidad son canales semánticos separados
```

## 13. Resultado

La microfase queda cerrada operativamente.

Queda pendiente únicamente este cierre documental en `maestros/v177`.

## 14. Siguiente microfase recomendada

Siguiente frente recomendado:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_PLAN_V1`

Objetivo sugerido:

Planificar cómo enriquecer en una fase futura el propio `split_divided_damage_target_model` con datos estructurados `allowed_target_kinds`, sin derivarlos desde Oracle text laxo y sin romper la política conservadora ya congelada.