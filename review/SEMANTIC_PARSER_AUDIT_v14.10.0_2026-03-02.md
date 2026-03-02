# MTGSynergy — Audit del sistema semántico vs arquitectura “parser determinista” (2026-03-02)

## 1) Resumen ejecutivo
Estado: el “Semantic Overlay” actual es una solución determinista por plantillas + lowering ligero, con métricas de cobertura y fallback implícito.
Es compatible con la arquitectura recomendada (preprocesado → tokenización → AST esqueleto → IR tipada → features → índices),
pero el siguiente salto defendible NO es “AST completo”; es:
(1) inventario cerrado de eventos/efectos, y
(2) separación Cost vs Effect en la IR / perfiles produce-consume.

Arquitectura objetivo (según investigación): total function guarantee + fallback tipo OpaqueText, normalizar por eventos y efectos, separar CostIR vs EffectIR, build-time compilation, tests de regresión por snapshot y métricas de cobertura para detectar drift del Oracle.

## 2) Inventario actual implícito (v1/v2) — lo que YA existe hoy

### 2.1 Señales / conceptos observables
El sistema actual ya maneja:
- Normalización: normalizeOracleTextV1(...)
- Parser: parseSemanticIrV0(...)
- Perfil: buildSemanticCardProfile(ir) produce {produced, consumed}
- Diagnóstico Coverage-First con razones deterministas:
  - NO_ORACLE
  - EMPTY_TEXT
  - NO_MATCH_V1_TEMPLATES
  - PARSE_ERROR
- TextTags (heurísticos, roadmap):
  - ETB, DIES, SACRIFICE, DRAW, TOKEN, SPELLS

Esto equivale a una “IR mínima por plantillas” + una capa de diagnóstico (Coverage-First) que permite decidir plantillas por datos.

### 2.2 “Eventos/Efectos” actuales (aproximación operativa)
A nivel de overlay, hoy ya aparecen (como tags o IDs/acciones/recursos):
- Evento: CAST_SPELL (spells-matter)
- Acción: DEAL_DAMAGE
- Recursos/acciones: LIFE, DRAW, TOKEN (frecuentes como producciones)
- Ejes: ETB / DIES / SACRIFICE / DRAW / TOKEN / SPELLS (TextTags)

Observación: todavía no existe un “inventario cerrado” formal de EventTypes/EffectTypes; existe como conjunto emergente de tags/ids.

## 3) Gap list vs arquitectura objetivo (priorizado)

La arquitectura objetivo recomienda:
- Normalizar por inventario cerrado de EventTypes y EffectTypes (ejemplos: DAMAGE_DEALT, LIFE_GAINED, SPELL_CAST; efectos: DRAW, DEAL_DAMAGE, GAIN_LIFE, CREATE_TOKEN, ADD_MANA).
- AST esqueleto y lowering a IR tipada; fallback OpaqueText para garantizar total function.
- Separar CostIR vs EffectIR (y marcar origen produce/consume).
- Build-time compilation del corpus Oracle y tests de regresión/cobertura para detectar drift.

### GAPs (con ROI y riesgo)
G1 (ROI muy alto, riesgo bajo): Formalizar inventario cerrado “OverlayEvents/OverlayEffects” como enums/ids canónicos.
- Motivo: reduce incoherencias, facilita tests y diagnóstico, y evita duplicaciones (“cast spell” con nombres distintos).
- Compatibilidad: alta (refactor/normalización de nombres y mapeos; no requiere AST).

G2 (ROI alto, riesgo medio): Separar Cost vs Effect en perfiles produce/consume.
- Motivo: reduce falsos positivos (“sacrificar como coste” vs “sacrificar como efecto”); mejora precisión y explicabilidad.
- Recomendación central del diseño objetivo.

G3 (ROI medio, riesgo medio/alto): AST esqueleto completo.
- Motivo: robustez a largo plazo; permite modelar triggers/activated/modal/replacement/prevention de forma estructural.
- Recomendación: NO empezar aquí; primero inventario cerrado + cost/effect.

G4 (ROI alto, riesgo bajo): Snapshot tests de coverage/drift por dataset.
- Ya existe Coverage-First; falta estandarizar baselines, thresholds y “gold sets” por arquetipo para detectar regresiones.

## 4) Mapa de compatibilidad (qué queda como Opaque / fallback)

En el modelo objetivo, todo input debe producir IR con subárbol opaco si no se clasifica (OpaqueText) para mantener total function.

En MTGSynergy, el equivalente operativo actual es:
- Si parseSemanticIrV0 falla → PARSE_ERROR
- Si produce/consume vacío → NO_MATCH_V1_TEMPLATES
- Si no hay oracle text → NO_ORACLE

Recomendación: evolucionar esto hacia un nodo explícito “Opaque/Unclassified” dentro de la IR (en vez de “silencio semántico”), manteniendo determinismo y diagnósticos estables.

## 5) Plan de 2 iteraciones (sin romper invariantes)

Iteración A (1 PR):
- Introducir inventario cerrado (OverlayEventId/OverlayEffectId) y mapear lo existente:
  - eventos: CAST_SPELL, ETB, DIES, SACRIFICE, DRAW (si aplica como evento)
  - efectos/acciones: DEAL_DAMAGE, GAIN_LIFE/LIFE_CHANGE (según convención), CREATE_TOKEN, DRAW_CARDS
- Añadir test que asegure que Coverage-First reasonIds y textTags siguen estables (no drift de IDs).

Iteración B (1 PR):
- Introducir “origin” en produce/consume: {origin: "cost" | "effect"}.
- Añadir 1 plantilla coste mínima (p.ej. “As an additional cost …” o “Sacrifice a creature:” como coste) y distinguirlo de sacrificios como efecto.
- Añadir test gold que demuestre diferencia coste vs efecto en el matching (reduce falsos positivos).

(Iteración C, futura):
- AST esqueleto para triggers/activated/modal/replacement/prevention, con OpaqueText para todo lo no cubierto.
