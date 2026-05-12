# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION CONTRACT V1

Fecha: 2026-05-12
Estado: Cerrada operativamente y documentalmente
Repositorio: `C:\MTGSynergy`
Rama final: `main`

## 1. Identificación de microfase

Nombre operativo:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_CONTRACT_V1`

Objetivo contractual:

Congelar cómo `split_divided_damage_target_model` podrá alimentar `target_kinds` de forma segura en una fase futura, sin implementar todavía extracción productiva ni modificar runtime visible.

## 2. Estado Git final

Baseline previo:

`a7a774b`

Commit de feature/test:

`55a85c0`
`test(semantic): add a210 split divided damage target kind integration contract v1`

Merge operativo a `main`:

`dd33cf7`
`merge: a210 split divided damage target kind integration contract v1`

Estado final tras push:

`HEAD == origin/main == dd33cf7`

Working tree final:

limpio.

## 3. Archivos añadidos

Se añadieron exactamente dos artefactos contractuales:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.test.ts
```

No se tocaron archivos de parser, lowering productivo, UI, overlay, scoring, CSE, build, package/config ni datos públicos.

## 4. Decisiones congeladas

La microfase congela estas decisiones:

1. `split_divided_damage_target_model` es el modelo fuente para una futura integración de `target_kinds`.
2. Los `target_kinds` derivados desde ese modelo serán agregación diagnóstica, no sustitución del modelo.
3. `target_kinds` no reemplaza `split_divided_damage_target_model`.
4. `target_kinds` no reemplaza `target_count`.
5. `split_divided_damage_target_model` no puede crear ni modificar `modal_selection_model`.
6. `modal_selection_model` solo puede aparecer por extracción modal independiente.
7. Wording split/divided damage no puede inferir legality gates como:

   * `CAST_ONLY_IF`
   * `ACTIVATE_ONLY_AS_SORCERY`
   * `CONTROLS_X`
   * `ATTACKED_THIS_TURN`
   * `ONCE_EACH_TURN`
   * `OTHER_LEGALITY_TEXT`

8. La fase no implementa extracción productiva nueva.
9. Cualquier migración semántica real requiere microfase futura explícita.

## 5. Corpus focal congelado

Corpus real Oracle utilizado:

* `Electrolyze`
* `Arc Lightning`
* `Flames of the Firebrand`
* `Pyrotechnics`
* `Rolling Thunder`

La baseline actual queda congelada como:

* `split_divided_damage_target_model`: presente y aditivo.
* `costTargetLegalityMin`: no emitido para este corpus en la baseline actual.
* `target_kinds`: `[]`
* `target_count`: `null`
* `modal_selection_model`: `null`
* `legality_kinds`: `[]`

## 6. Lectura técnica

Esta microfase no busca que el runtime empiece a poblar `target_kinds`.

Su valor es bloquear una frontera segura antes de la integración productiva:

* el modelo split/divided queda preservado como objeto semántico propio;
* `target_kinds` queda definido como canal agregado/diagnóstico;
* modalidad y legality gates quedan explícitamente separados;
* los casos `ANY_NUMBER_OF_TARGETS` mantienen la política conservadora de slot mínimo `0`;
* no se abre inferencia amplia de targets ni legalidad.

## 7. Validación ejecutada

Validación pre-commit:

```text
JSON parse check: OK
focal test: 1 file passed, 2 tests passed
split/divided extraction test: passed
split/divided guardrail ring: passed
cost target legality lowering hint wiring: passed
cost target legality contract freeze: passed
git diff --check: clean
```

Validación post-merge:

```text
sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.test.ts
1 file passed, 2 tests passed

sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts
1 file passed, 1 test passed

sem_cost_target_legality_lowering_hint_wiring_v1.test.ts
1 file passed, 8 tests passed

git diff --check
clean
```

## 8. Incidencia operativa resuelta

Durante el staging inicial apareció una incidencia de finales de línea:

```text
fatal: CRLF would be replaced by LF
```

Se corrigió normalizando los dos archivos permitidos a:

```text
UTF-8 sin BOM
LF
```

La normalización fue validada con:

```text
hasBom=False
hasCR=False
```

Después de la corrección, `git add`, commit, merge y push se completaron correctamente.

## 9. Guardrails preservados

No se modificó:

* parser productivo;
* lowering productivo;
* extraction runtime;
* UI;
* CSE;
* overlay visible;
* scoring;
* structural engine;
* cards index;
* package/config;
* datos públicos;
* build scripts.

No se ejecutó build ni smoke público porque la microfase es `contract/test-only` y no toca runtime visible.

## 10. Resultado

La microfase queda cerrada operativamente y documentalmente.

Estado final esperado:

```text
branch: main
HEAD == origin/main == dd33cf7
working tree: clean
```

## 11. Siguiente microfase recomendada

Siguiente paso técnico recomendado:

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_PLAN_V1`

Objetivo sugerido:

Planificar la integración productiva futura por la cual `split_divided_damage_target_model` podrá alimentar `target_kinds` de forma conservadora, manteniendo separación con `modal_selection_model`, `target_count` y legality gates.

No conviene saltar directamente a implementación si todavía no está congelado el criterio exacto de evidencia textual para derivar `CREATURE`, `PLAYER`, `PLANESWALKER`, `BATTLE` o `ANY_TARGET`.