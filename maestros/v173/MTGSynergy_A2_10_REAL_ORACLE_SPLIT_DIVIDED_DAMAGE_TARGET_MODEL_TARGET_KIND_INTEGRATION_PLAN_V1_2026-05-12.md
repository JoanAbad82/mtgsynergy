# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_PLAN_V1

## Estado
- Plan-only.
- No runtime changes.
- No tests changed.
- No contract JSON changed.
- Cierre documental pendiente hasta commit.

## Scope
- Solo documento en `maestros/v173`.
- No tocar lowering/parser/service/runtime.
- No tocar tests.
- No tocar contract JSON.
- No tocar UI/CSE/scoring/overlay.
- No tocar public data/package/config.

## Contexto Técnico
- Base actual: `main == origin/main == c8bef19`.
- Microfase previa cerrada: `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_GUARDRAIL_RING_V1`.
- Referencias operativas/documentales: `e816ce5`, `5dbf6b4`, `f59c23c`, `c0b97bf`, `ab649e1`, `be48276`.
- `split_divided_damage_target_model` ya existe como extracción productiva aditiva.
- `splitDividedDamageTargetModel` existe como salida top-level del bundle de hints.
- El corpus base congelado por guardrail ring: `Electrolyze`, `Arc Lightning`, `Flames of the Firebrand`, `Pyrotechnics`, `Rolling Thunder`.
- `modal_selection_model` debe permanecer separado.
- `target_kinds` y `target_count` siguen siendo canales diagnósticos existentes.

## Problema A Resolver
- El modelo actual detecta split/divided damage, pero no traduce todavía ese resultado a `target_kinds` ni a `target_count`.
- La integración futura debe evitar sobregeneralizar wording ambiguo.
- La integración no debe mezclar split/divided damage con modal selection.
- La integración no debe absorber legality gates.

## Plan Técnico Propuesto
1. Definir una política semántica explícita para derivación de target kind desde `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`.
2. Separar en diseño y validación:
   - existencia del modelo split/divided damage,
   - número conceptual de slots,
   - clase semántica de objetivo,
   - `target_count` diagnóstico heredado.
3. Mantener `split_divided_damage_target_model` como fuente especializada y aditiva.
4. Integrar `target_kinds` solo cuando el wording permita lectura conservadora y verificable.
5. Mantener fallback `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`.
6. Mantener `ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0` para casos `ANY_NUMBER_OF_TARGETS`.
7. Documentar explícitamente que `target_count` simple puede no representar semántica final de daño dividido.
8. Mantener separación estricta con `modal_selection_model`.
9. Proteger no-leakage: `CAST_ONLY_IF` y `ACTIVATE_ONLY_AS_SORCERY` fuera de target/model channels.

## Riesgos
- Convertir “targets” genérico en clase demasiado específica.
- Confundir número de objetivos posibles con número de objetivos obligatorios.
- Romper casos `any number of targets`.
- Mezclar split/divided damage con `modal_selection_model`.
- Introducir `CAST_ONLY_IF` o `ACTIVATE_ONLY_AS_SORCERY` en canales de target/model.
- Hacer que `target_count` parezca semántica final cuando sigue siendo diagnóstico.

## Microfase Futura Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_CONTRACT_V1`
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_DIAGNOSIS_V1`

## Marcadores Literales
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_PLAN_V1
- c8bef19
- e816ce5
- 5dbf6b4
- f59c23c
- c0b97bf
- ab649e1
- be48276
- split_divided_damage_target_model
- splitDividedDamageTargetModel
- target_kinds
- target_count
- modal_selection_model
- SPLIT_DIVIDED_DAMAGE_TARGET_MODEL
- ONE_OR_TWO_TARGETS
- ONE_TWO_OR_THREE_TARGETS
- ANY_NUMBER_OF_TARGETS
- UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL
- ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder
- CAST_ONLY_IF
- ACTIVATE_ONLY_AS_SORCERY
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_CONTRACT_V1
- A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_DIAGNOSIS_V1