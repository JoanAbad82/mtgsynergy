# MTGSynergy — Cierre documental real v194

## Microfase

`A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_EXTRACTION_V1`

## Fecha

2026-05-21

## Estado

Cerrada, mergeada, pusheada y sincronizada en `main`.

## Commits

- Feature/test commit: `64b4f22`
  - `test(semantic): add split divided damage target count corpus v1`
- Merge commit en `main`: `a32233e`
  - `merge: a210 split divided damage target count corpus v1`

## Alcance real

La microfase añadió un test de corpus Oracle real adicional para endurecer la extracción del modelo A2.10 de `split/divided damage target count`.

Archivo añadido:

- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_additional_corpus_extraction_v1.test.ts`

Cambio real:

- `tests-only`
- `1 file changed`
- `257 insertions`
- sin cambios de runtime
- sin cambios en parser/lowering/contratos
- sin cambios en UI
- sin cambios en scoring/SPS/MC
- sin cambios en overlay visible
- sin cambios en structural engine

## Corpus cubierto

Casos positivos de extracción productiva:

- `Fire // Ice`
- `Magma Opus`
- `Boulderfall`

Casos diferidos / conservadores con predicado específico:

- `Pyrokinesis`
- `Aerial Volley`

Casos negativos de daño multitarget no dividido:

- `Fall of the Titans`
- `Arc Trail`
- `Comet Storm`

Guardrail de daño sin target formal:

- `Earthquake`

## Lectura técnica

La fase confirma que el modelo productivo actual reconoce patrones estrechos de:

- `damage divided as you choose among one or two targets`
- `damage divided as you choose among any number of targets`

También preserva límites importantes:

- no inventa targets formales desde texto de daño sin target;
- no infiere divided damage desde patrones multitarget distintos;
- no confunde modo con target count;
- no proyecta `target_count_model` hacia `current_target_count`;
- conserva `ANY_TARGET` como umbrella de target kind cuando procede;
- mantiene `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL` para predicados no modelados de forma segura.

## Validación ejecutada

Antes del merge:

- test focal nuevo:
  - `1 file passed`
  - `1 test passed`
- ring A2.10 split/divided:
  - `5 files passed`
  - `12 tests passed`
- `git diff --check`:
  - limpio

Después del merge:

- test focal nuevo:
  - `1 file passed`
  - `1 test passed`
- ring A2.10 split/divided:
  - `5 files passed`
  - `12 tests passed`
- `git diff --check`:
  - limpio

## Estado final verificado

- `main = a32233e`
- `origin/main = a32233e`
- working tree limpio
- `FAILED=0`

## Limitación conocida preservada

Los casos con predicado específico sobre targets, como `target creatures` o `target creatures with flying`, siguen deliberadamente sin reclamar `target_count_model` productivo completo cuando la semántica excede el contrato estrecho actual.

Eso es correcto para esta fase: se prefiere fallback explícito y conservador antes que sobreafirmación semántica.

## Cierre

La microfase queda cerrada como refuerzo de corpus real Oracle para A2.10. No cambia producto visible, pero aumenta robustez contractual del modelo `split/divided damage target count`.

Siguiente frente recomendado:

- una fase posterior de `predicate-bearing split/divided damage target model`, si se decide modelar formalmente restricciones como `target creatures`, `target creatures with flying`, etc.
- alternativamente, continuar con revisión estable A2.10 de coste/target/legalidad antes de abrir nueva familia semántica.