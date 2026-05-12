# MTGSynergy — A2.10 REAL ORACLE SPLIT/DIVIDED DAMAGE TARGET KIND INTEGRATION EXTRACTION PLAN V1

## 1. Identificación de microfase
- Nombre: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_PLAN_V1
- Estado: Planificada / docs-only
- Baseline: cf97c8a
- Relación: esta microfase planifica la siguiente etapa productiva a partir de la microfase contractual previa A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_CONTRACT_V1 y su cierre en `maestros/v174/MTGSynergy_A2_10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_CONTRACT_V1_2026-05-12.md`.

## 2. Objetivo
Definir un plan técnico para que una futura extracción productiva derive `target_kinds` desde `split_divided_damage_target_model` únicamente como agregación conservadora y diagnóstica, sin sustituir los canales actuales ni ampliar semántica fuera de alcance.

## 3. Boundary model
Separación obligatoria entre:
- split_divided_damage_target_model
- target_kinds
- target_count
- modal_selection_model
- legality_kinds y legality gates

Reglas de frontera:
- `target_kinds` no reemplaza `split_divided_damage_target_model`.
- `target_kinds` no reemplaza `target_count`.
- `target_kinds` no crea `modal_selection_model`.
- `target_kinds` no crea legality gates ni nuevos valores en `legality_kinds`.
- `modal_selection_model` permanece independiente.
- legality gates permanecen independientes.

## 4. Future extraction principle
La futura extracción debe operar como proyección desde el modelo estructurado:
- `split_divided_damage_target_model.slots[*].allowed_target_kinds` (o estructura equivalente ya existente)
- hacia una agregación conservadora y única de `target_kinds`.

Queda explícitamente rechazado derivar `target_kinds` directamente desde Oracle text suelto cuando no exista modelo estructurado split/divided.

## 5. Conservative derivation policy
Valores aceptados para futura derivación:
- CREATURE
- PLAYER
- PLANESWALKER
- BATTLE
- ANY_TARGET

La futura implementación solo podrá emitir `target_kinds` cuando el modelo estructurado split/divided ya identifique de forma explícita la clase de objetivo permitida.

## 6. ANY_TARGET policy
`ANY_TARGET` se mantiene como paraguas canónico cuando el wording realmente permite cualquier objetivo.
No se expande `ANY_TARGET` en `CREATURE` / `PLAYER` / `PLANESWALKER` / `BATTLE` salvo contrato futuro explícito.

## 7. Any number of targets policy
Para casos tipo Rolling Thunder:
- `target_count` puede permanecer null o estrictamente diagnóstico.
- `split_divided_damage_target_model` conserva la señal estructural principal.
- `target_kinds` puede agregar clases permitidas solo si ya están modeladas explícitamente.
- no se inventa mínimo de objetivos desde wording libre más allá de la política existente `ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0`.

## 8. Corpus focal para futura fase productiva
Corpus base:
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

Expectativa de integración futura (alto nivel, sin implementar):
- Electrolyze: mantener separación split/divided y habilitar solo agregación conservadora si hay evidencia estructural.
- Arc Lightning: misma política conservadora para patrón one/two/three targets.
- Flames of the Firebrand: misma política conservadora para patrón one/two/three targets.
- Pyrotechnics: respetar política ANY_NUMBER y no sobrededucir obligatoriedad.
- Rolling Thunder: respetar política ANY_NUMBER y mantener `target_count` diagnóstico.

## 9. Guardrails
La futura fase productiva deberá demostrar:
- ausencia de leakage hacia `modal_selection_model`.
- ausencia de leakage de legality gates a partir de split/divided.
- ausencia de reemplazo de `target_count`.
- ausencia de cambio visible de runtime UI salvo microfase explícita posterior.
- ausencia de parser Oracle general de targets fuera de alcance.
- ausencia de sobreafirmación en plantillas de daño dividido.
- ausencia de inferencias desde `CAST_ONLY_IF`, `ACTIVATE_ONLY_AS_SORCERY`, `CONTROLS_X`, `ATTACKED_THIS_TURN`, `ONCE_EACH_TURN`, `OTHER_LEGALITY_TEXT`.

## 10. Siguiente microfase productiva sugerida
Nombre recomendado:
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_V1

Alcance esperado (orientativo):
- probablemente el archivo de lowering donde vive actualmente el modelo split/divided;
- probablemente un test focal nuevo;
- posiblemente sin cambio contractual si el contrato actual ya cubre la integración prevista.

No se definen ediciones exactas aquí porque esta microfase es solo de planificación.

## 11. Validation plan para futura fase productiva
Plan mínimo recomendado:
- test focal de integración split/divided -> target_kinds.
- guardrail ring dedicado.
- comparación explícita contra el contrato vigente.
- `git diff --check`.
- sin build si no hay cambio material de bundle/runtime.
- sin public smoke salvo cambios visibles en UI o superficie pública de runtime.

## 12. Criterios de cierre de esta microfase de plan
Esta microfase queda cerrada cuando:
- se añade solo este documento de plan;
- formato UTF-8 sin BOM;
- saltos LF;
- sin trailing whitespace;
- marcadores obligatorios presentes;
- commit docs-only;
- merge a main;
- push;
- `HEAD == origin/main`;
- working tree clean.

## Marcadores obligatorios
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_PLAN_V1
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_V1
- split_divided_damage_target_model
- target_kinds
- target_count
- modal_selection_model
- legality_kinds
- ANY_TARGET
- CAST_ONLY_IF
- ACTIVATE_ONLY_AS_SORCERY
- cf97c8a