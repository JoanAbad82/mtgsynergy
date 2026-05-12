# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION EXTRACTION V1

Fecha: 2026-05-12
Estado: Cerrada operativamente
Repositorio: `C:\MTGSynergy`
Rama final: `main`

## 1. Identificación de microfase

Nombre operativo:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_V1`

Tipo de microfase:

Productiva mínima con test focal.

Baseline de partida:

`fc0c1f8`

Commit de feature:

`9f22d00`

Mensaje:

`feat: add a210 split divided damage target kind extraction v1`

Merge operativo a `main`:

`69ff2d6`

Mensaje:

`merge: a210 split divided damage target kind extraction v1`

Estado final operativo:

`HEAD == origin/main == 69ff2d6`

Working tree final:

limpio.

## 2. Objetivo

Implementar una integración mínima por la cual `split_divided_damage_target_model` pueda alimentar `target_kinds` de forma conservadora cuando exista información estructurada suficiente dentro del propio modelo split/divided.

La microfase no busca abrir un parser general de targets ni inferir clases de objetivo desde texto Oracle laxo.

## 3. Archivos modificados

Se modificaron exactamente dos archivos:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts
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

Se añadió un helper productivo local:

`projectTargetKindsFromSplitDividedDamageModelMinV1(...)`

Su función es proyectar de forma conservadora `target_kinds` desde datos estructurados ya presentes en `split_divided_damage_target_model`.

El helper lee únicamente candidatos estructurados como:

```text
allowed_target_kinds
allowedTargetKinds
target_kinds
targetKinds
```

La proyección filtra a valores canónicos:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
ANY_TARGET
```

Si aparece `ANY_TARGET`, se preserva como paraguas canónico y no se expande a clases específicas.

## 5. Ruta test-only añadida

Para demostrar evidencia positiva sin abrir inferencia amplia sobre Oracle text, se añadió una ruta test-only:

`__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(...)`

Esta ruta permite probar directamente la proyección estructurada sin convertir el runtime en un parser amplio de targets.

La prueba positiva demuestra que:

```text
["ANY_TARGET"] se conserva como ["ANY_TARGET"]
los duplicados se deduplican
los valores inválidos se filtran
ANY_TARGET no se expande a CREATURE / PLAYER / PLANESWALKER / BATTLE
```

## 6. Comportamiento del corpus real

Corpus focal validado:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

Resultado operativo actual:

```text
split_divided_damage_target_model: presente
target_kinds: []
target_count: null
modal_selection_model: null
legality_kinds: []
```

Lectura correcta:

El corpus real conserva `target_kinds` vacío porque el modelo split/divided actual todavía no expone arrays estructurados como `allowed_target_kinds`.

Esto es deliberadamente conservador. La microfase deja instalado el hook productivo y probado positivamente, pero no inventa clases de objetivo desde wording laxo.

## 7. Guardrails preservados

La microfase preserva estos límites:

```text
target_kinds no reemplaza split_divided_damage_target_model
target_kinds no reemplaza target_count
target_kinds no crea modal_selection_model
target_kinds no crea legality_kinds
ANY_TARGET no se expande
no se deriva target kind desde Oracle text laxo
no se abre parser general de targets
```

También se valida que no aparezcan gates de legalidad como:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

## 8. Validación ejecutada

Validación focal:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts

1 file passed
2 tests passed
```

Validación contractual:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.test.ts

1 file passed
2 tests passed
```

Guardrail ring split/divided:

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

## 9. Estado Git final

Feature commit:

```text
9f22d00 feat: add a210 split divided damage target kind extraction v1
```

Merge commit:

```text
69ff2d6 merge: a210 split divided damage target kind extraction v1
```

Push:

```text
fc0c1f8..69ff2d6 main -> main
```

Estado final:

```text
branch: main
HEAD: 69ff2d6
origin/main: 69ff2d6
working tree: clean
```

## 10. Interpretación técnica

La microfase cierra una frontera útil y segura:

```text
split_divided_damage_target_model -> target_kinds
```

pero solo cuando el modelo ya expone datos estructurados. El runtime no amplía cobertura mediante inferencia textual débil.

Esto evita tres riesgos:

```text
sobreafirmar targets desde Oracle text incompleto
mezclar target kinds con target count
contaminar modalidad o legality gates desde wording split/divided damage
```

## 11. Resultado

La microfase queda cerrada operativamente.

Queda pendiente únicamente este cierre documental en `maestros/v176`.

## 12. Siguiente microfase recomendada

Siguiente frente recomendado:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_GUARDRAIL_RING_V1`

Objetivo sugerido:

Congelar la integración recién añadida como guardrail ring estable, protegiendo:

```text
proyección estructurada positiva
ANY_TARGET como umbrella
filtrado de valores no canónicos
no expansión de target_count
no leakage a modal_selection_model
no leakage a legality_kinds
baseline conservadora del corpus real
```