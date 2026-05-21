# MTGSynergy — Cierre documental real v195

## Microfase

`A2.10_REAL_ORACLE_PREDICATE_BEARING_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_V1`

## Fecha

2026-05-21

## Estado

Cerrada técnicamente, mergeada, pusheada y sincronizada en `main`.

## Commits

- Feature commit: `5a23a9f`
  - `semantic: add predicate bearing split divided damage target model v1`
- Merge commit en `main`: `8a58b46`
  - `merge: predicate bearing split divided damage target model v1`

## Alcance real

La microfase añadió un modelo estrecho para `predicate-bearing split/divided damage target model` dentro de A2.10.

El objetivo no fue resolver toda la legalidad de targets ni toda la semántica de resolución, sino abrir una excepción productiva mínima y explícita para textos Oracle reales con predicados sobre targets.

## Archivos modificados

- `src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.json`
- `src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_additional_corpus_extraction_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_predicate_bearing_split_divided_damage_target_model_v1.test.ts`

Cambio real:

- `5 files changed`
- `520 insertions`
- `25 deletions`
- nuevo test focal predicate-bearing
- cambio estrecho en lowering
- actualización contractual explícita
- sin cambios en UI
- sin cambios en scoring/SPS/MC
- sin cambios en overlay visible
- sin cambios en routing/deploy/build
- sin cambios de producto visible

## Modelo añadido

Se añadió reconocimiento productivo estrecho para:

- `any number of target creatures`
- `one, two, or three target creatures with flying`

Casos Oracle cubiertos:

- `Pyrokinesis`
  - `target_predicate_kind: CREATURE_ONLY`
  - `target_predicate_text: target creatures`
- `Aerial Volley`
  - `target_predicate_kind: WITH_FLYING`
  - `target_predicate_text: target creatures with flying`

## Invariantes preservadas

La fase preserva:

- `ANY_TARGET` como umbrella en casos legacy;
- `target_count_model` como canal diagnóstico/aditivo;
- `current_target_count = null` para legacy split/divided `ANY_TARGET`;
- no-proyección escalar de `target_count_model`;
- separación entre target kind, target predicate, target count model, modes y legality;
- `modal_selection_model` sin cambios;
- ausencia de full target legality;
- ausencia de resolution model completo;
- fallback conservador para predicados no cubiertos.

## Contrato actualizado

El contrato `sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.json` fue actualizado para reflejar que esta fase abre una excepción estrecha y explícita:

- `CREATURE_ONLY`
- `WITH_FLYING`
- additive/diagnostic only
- no full target legality
- no resolution model
- no target count replacement
- no modal selection change
- no broad runtime widening fuera de esta excepción

También se actualizó el baseline runtime de los casos legacy `ANY_TARGET` que ya estaban siendo modelados productivamente:

- `Electrolyze`
- `Arc Lightning`
- `Flames of the Firebrand`
- `Pyrotechnics`
- `Rolling Thunder`

## Validación ejecutada

Antes del merge:

- contract test:
  - `1 file passed`
  - `2 tests passed`
- predicate + additional corpus:
  - `2 files passed`
  - `2 tests passed`
- full A2.10 split/divided ring:
  - `7 files passed`
  - `14 tests passed`
- wider lowering safety ring:
  - `6 files passed`
  - `19 tests passed`
- `git diff --check`:
  - limpio

Después del merge:

- contract test:
  - `1 file passed`
  - `2 tests passed`
- predicate + additional corpus:
  - `2 files passed`
  - `2 tests passed`
- A2.10 ring:
  - `6 files passed`
  - `13 tests passed`
- wider lowering safety ring:
  - `6 files passed`
  - `19 tests passed`
- `git diff --check`:
  - limpio

## Estado final verificado

- `main = 8a58b46`
- `origin/main = 8a58b46`
- working tree limpio
- `FAILED=0`

## Limitación conocida preservada

La cobertura predicate-bearing sigue siendo deliberadamente estrecha.

Cubierto ahora:

- `target creatures`
- `target creatures with flying`

No cubierto todavía:

- predicados de estado de combate;
- predicados de color;
- predicados de controlador;
- predicados de tipo múltiple;
- predicados negativos;
- full target legality;
- full CR 601/608;
- resolution model completo;
- simulación de asignación de daño.

Estos casos deben seguir cayendo en fallback conservador o en modelo parcial explícito hasta una fase posterior.

## Cierre

La microfase queda cerrada como avance real del motor semántico A2.10: pasa de reconocer solo split/divided damage genérico a modelar de forma limitada targets con predicado, sin romper la disciplina de CostIR / EffectIR ni proyectar semántica no garantizada.

Siguiente frente recomendado:

- `A2.10_REAL_ORACLE_PREDICATE_BEARING_SPLIT_DIVIDED_DAMAGE_ADDITIONAL_PREDICATE_CORPUS_V1`, si queremos ampliar corpus sin cambiar gramática de forma agresiva.
- O bien una revisión estable de consolidación A2.10 coste/target/legalidad antes de abrir predicados más complejos.