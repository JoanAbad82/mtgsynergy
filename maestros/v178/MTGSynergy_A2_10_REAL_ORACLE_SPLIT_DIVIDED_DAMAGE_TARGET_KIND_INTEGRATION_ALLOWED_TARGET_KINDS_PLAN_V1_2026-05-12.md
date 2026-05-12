# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION ALLOWED TARGET KINDS PLAN V1

## 1. Identificación de microfase
- Name: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_PLAN_V1
- Status: Planificada / docs-only
- Baseline: 39f437b
- Relación con la microfase previa: este plan continúa el cierre de `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_GUARDRAIL_RING_V1`, fijando el siguiente paso productivo sin romper el guardrail ya consolidado.

## 2. Objetivo
Definir una fase productiva futura que enriquezca `split_divided_damage_target_model` con `allowed_target_kinds` como dato estructurado del modelo, y no como inferencia libre de `target_kinds` desde Oracle text suelto.

## 3. Boundary model
Separación obligatoria entre:
- `split_divided_damage_target_model`
- `allowed_target_kinds`
- `target_kinds`
- `target_count`
- `modal_selection_model`
- `legality_kinds` y legality gates

Reglas de frontera:
- `allowed_target_kinds` pertenece al modelo estructurado split/divided.
- `target_kinds` es proyección/agregación posterior desde datos estructurados.
- `target_kinds` no puede convertirse en fuente de verdad.
- `target_count` permanece independiente.
- `modal_selection_model` permanece independiente.
- `legality_kinds` permanece independiente.
- legality gates permanecen independientes.

## 4. Accepted canonical allowed target kinds
Valores canónicos permitidos para futura fase:
- CREATURE
- PLAYER
- PLANESWALKER
- BATTLE
- ANY_TARGET

Cualquier valor fuera de ese conjunto debe ser rechazado o ignorado.

## 5. ANY_TARGET policy
- `ANY_TARGET` es un paraguas canónico.
- `ANY_TARGET` no debe expandirse a `CREATURE` / `PLAYER` / `PLANESWALKER` / `BATTLE`.
- Si un slot se modela como `ANY_TARGET`, la proyección a `target_kinds` puede emitir únicamente `ANY_TARGET` para ese slot/grupo.
- Cualquier expansión futura requeriría un contrato explícito posterior.

## 6. Evidence policy
Solo puede justificar `allowed_target_kinds` en el futuro:
- reconocimiento estructurado de plantillas split/divided ya dentro del builder del modelo;
- familias exactas de plantilla como "any target" solo cuando el patrón split/divided ya está reconocido;
- no abrir parser Oracle de targets de propósito general;
- no derivar clases desde texto suelto fuera del boundary del modelo split/divided.

## 7. Real corpus plan
Corpus de referencia:
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

Plan de expectativa a alto nivel:
- Electrolyze: candidato a `allowed_target_kinds` solo si el patrón estructurado confirma clase explícita; en caso contrario se mantiene sin modelar.
- Arc Lightning: mismo criterio conservador, sin sobregeneralizar wording.
- Flames of the Firebrand: mismo criterio conservador, sin inferencia abierta.
- Pyrotechnics: preservar política conservadora en conteo; `allowed_target_kinds` solo con evidencia estructurada.
- Rolling Thunder: igual que Pyrotechnics, sin inventar semántica de cantidad.

Si la clase exacta de objetivo permanece incierta, debe quedar unmodelled hasta contrato productivo explícito.

## 8. Split model kind compatibility
`allowed_target_kinds` debe coexistir con:
- ONE_OR_TWO_TARGETS
- ONE_TWO_OR_THREE_TARGETS
- ANY_NUMBER_OF_TARGETS

Distinción funcional:
- el model kind describe estructura de slots/conteo de selección;
- `allowed_target_kinds` describe clases de objetivo permitidas.

## 9. ANY_NUMBER_OF_TARGETS policy
Para Pyrotechnics y Rolling Thunder:
- `conceptual_target_slots_min` debe mantenerse en 0 salvo contrato futuro explícito.
- `conceptual_target_slots_max` se mantiene en null.
- `target_count` se mantiene en null.
- `allowed_target_kinds` no inventa cantidad de objetivos.
- `allowed_target_kinds` describe clases permitidas, no cuántos objetivos se eligen.

## 10. Forbidden leakage
La fase productiva futura debe demostrar que `allowed_target_kinds` no crea ni contamina:
- `modal_selection_model`
- `legality_kinds`
- CAST_ONLY_IF
- ACTIVATE_ONLY_AS_SORCERY
- CONTROLS_X
- ATTACKED_THIS_TURN
- ONCE_EACH_TURN
- OTHER_LEGALITY_TEXT

## 11. Suggested future productive microphase
Nombre recomendado:
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_EXTRACTION_V1

Scope probable de archivos permitidos en esa microfase:
- probablemente el archivo de lowering/model builder donde vive `split_divided_damage_target_model`;
- probablemente un test focal nuevo;
- probablemente actualización o nuevo guardrail test;
- sin tocar archivos UI/config/scoring/public data.

Este documento no prescribe ediciones exactas, solo el plan técnico.

## 12. Validation plan for future productive phase
Validaciones propuestas:
- test focal positivo para `allowed_target_kinds` dentro de `split_divided_damage_target_model`;
- test de proyección que pruebe que `target_kinds` sigue `allowed_target_kinds`;
- guardrail ring para política paraguas de `ANY_TARGET`;
- guardrail ring para ausencia de leakage modal/legality;
- comparación contra baseline del corpus;
- `git diff --check`;
- build solo si hay cambio TypeScript de runtime;
- sin public smoke salvo cambios visibles en UI/superficie pública de runtime.

## 13. Closure criteria for this plan microphase
Esta microfase se considera cerrada cuando:
- se añade únicamente este documento;
- UTF-8 sin BOM;
- saltos LF;
- sin trailing whitespace;
- marcadores obligatorios presentes;
- commit docs-only;
- merge a main;
- push;
- `HEAD == origin/main`;
- working tree clean.

## Marcadores obligatorios
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_PLAN_V1
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_EXTRACTION_V1
- split_divided_damage_target_model
- allowed_target_kinds
- target_kinds
- target_count
- modal_selection_model
- legality_kinds
- ANY_TARGET
- ONE_OR_TWO_TARGETS
- ONE_TWO_OR_THREE_TARGETS
- ANY_NUMBER_OF_TARGETS
- CAST_ONLY_IF
- ACTIVATE_ONLY_AS_SORCERY
- 39f437b