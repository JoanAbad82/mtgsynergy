# MTGSynergy — Protocolo Operativo Post-v33
## Validation and Microphase Workflow v1
**Fecha:** 2026-03-19  
**Ámbito:** PÁGINA WEB MAGIC / MTGSynergy  
**Propósito:** acelerar el desarrollo sin degradar calidad, manteniendo microfases estrechas, trazabilidad fuerte y cierres limpios.

---

## 1. Naturaleza de este documento

Este documento es **metodológico/operativo**.  
No sustituye ninguna fuente normativa, semántica o de reglas del proyecto.

Su función es definir **cómo trabajar a partir de v33** para:
- reducir fricción operativa,
- evitar validaciones redundantes,
- mantener el estándar de calidad,
- preservar commits atómicos y cierres auditables.

---

## 2. Principios que NO cambian

Se mantienen intactos estos principios:

1. **Microfases estrechas y contractuales**  
   Cada cambio debe tener alcance pequeño, cerrable y verificable.

2. **Contrato antes que implementación**  
   Primero se fija qué se quiere cerrar y qué queda explícitamente fuera.

3. **Parche mínimo**  
   No abrir refactors laterales ni “aprovechar” la microfase para tocar más de lo necesario.

4. **Fallback explícito antes que silencio semántico**  
   No maquillar semántica faltante con heurísticas difusas.

5. **Separación fuerte entre capas**
   - estructural = chasis / baseline / depuración
   - semántico = capa principal de ambición y valor diferencial
   - visible/UI = surface contractual, no lugar para compensar carencias internas

6. **Commit atómico y trazabilidad limpia**  
   Todo cierre debe poder explicarse con precisión.

---

## 3. Problema del método anterior

Hasta v33, el proyecto ha trabajado con rigor, pero con demasiada fricción operativa:

- validación manual repetitiva incluso en microfases internas/no visibles,
- deploy y smoke visible casi por defecto,
- exceso de ciclos humanos para comprobar no-regresión,
- cierre documental demasiado pesado para slices pequeños.

El problema no es de nivel técnico, sino de **coste operativo innecesario**.

---

## 4. Objetivo del nuevo protocolo

A partir de v33, el objetivo es:

- avanzar más rápido,
- mantener la calidad,
- reducir validaciones manuales redundantes,
- seguir teniendo control fuerte,
- conservar la disciplina de microfases,
- evitar drift y regresiones.

---

## 5. Estructura del nuevo método: tres anillos + puerta de promoción

### 5.1. Anillo A — Microfase focal obligatoria
Siempre obligatorio.

Incluye:
- freeze de alcance,
- archivos permitidos,
- no-goals,
- corpus focal mínimo,
- test focal de la microfase,
- validación de contrato si aplica.

Sin Anillo A en verde, no hay continuación.

---

### 5.2. Anillo B — Ring estable
Siempre obligatorio.

Consiste en una batería pequeña y congelada de tests que protegen familias ya cerradas.

Objetivo:
- impedir regresiones en semántica ya conquistada,
- proteger invariantes absorbidos por el motor,
- convertir cierres previos en guardarraíles permanentes.

Este ring debe ser:
- pequeño,
- versionado,
- estable,
- poco ruidoso,
- no expansivo por inercia.

---

### 5.3. Anillo C — Smoke de decks canónicos + snapshots estructurados
Obligatorio solo cuando aplique.

Aplica cuando la microfase toca:
- runtime real,
- surface visible,
- prominence,
- ordering visible,
- wording runtime,
- overlay visible,
- buckets visibles,
- lookup/oracle/loader,
- o cuando exista riesgo razonable de gap test/runtime.

No se basa en HTML crudo ni en screenshots manuales por defecto.  
Se basa en:
- decks canónicos,
- snapshots estructurados,
- diff legible.

---

### 5.4. Puerta de promoción
Regla general:

- si A falla → se detiene la microfase,
- si B falla → no hay push/deploy,
- si C aplica y falla → no hay cierre operativo,
- solo con A+B y C cuando corresponda se permite promoción.

---

## 6. Qué validaciones siguen siendo obligatorias

### Siempre obligatorias
- test focal de microfase,
- ring estable,
- revisión de diff,
- staging explícito,
- commit atómico,
- build local cuando el cambio toque bundle/runtime.

### Obligatorias solo según tipo de cambio
- smoke canónico,
- snapshots de salida,
- validación visible manual en web,
- comprobación de deploy visible.

---

## 7. Qué validaciones se compactan

Se compactan o dejan de ser universales:

- revisión visual completa de la web para microfases internas/no visibles,
- smoke visible manual en cada slice pequeño,
- probes repetitivos de producción cuando no hay cambio visible,
- actualización documental extensa inmediatamente tras cualquier cambio mínimo,
- relectura manual del mismo deck si snapshots y ring estable no cambiaron.

La validación visible **no desaparece**.  
Pasa a ser **condicional y de alto valor**, no rutinaria por defecto.

---

## 8. Reparto ideal de trabajo

### Usuario
Decide:
- qué frente exacto se abre,
- criterio de cierre,
- aceptación final cuando hay cambio visible,
- validación funcional visible cuando el protocolo lo exija.

No debe seguir cargando con validaciones mecánicas repetitivas.

### ChatGPT
Debe:
- congelar el alcance,
- redactar el bloque exacto para CODEX,
- decidir qué anillos aplican,
- interpretar resultados,
- validar que no haya deriva lateral,
- redactar el delta corto de cierre,
- decidir si hace falta validación visible manual.

### CODEX
Debe:
- editar solo archivos permitidos,
- aplicar el parche mínimo,
- añadir/ajustar tests focales,
- ejecutar los comandos exactos definidos,
- devolver diff y resultados,
- no improvisar alcance ni abrir refactors laterales.

---

## 9. Freeze obligatorio antes de cada microfase

Antes de editar nada, debe existir una ficha breve con:

- nombre de microfase,
- objetivo contractual exacto,
- dentro de alcance,
- fuera de alcance,
- archivos permitidos,
- corpus focal,
- guardrails,
- anillos aplicables,
- criterio de cierre.

Sin freeze, no se abre microfase.

---

## 10. Uso correcto de CODEX a partir de ahora

CODEX no debe recibir instrucciones ambiguas.

Debe trabajar con un bloque congelado que incluya:

1. objetivo exacto,
2. archivos permitidos,
3. no-goals explícitos,
4. patch mínimo,
5. tests a ejecutar,
6. prohibición de tocar fuera de scope,
7. formato de retorno esperado.

Esto reduce:
- cambios laterales,
- iteraciones innecesarias,
- ruido de revisión.

---

## 11. Ring estable recomendado post-v33

Debe empezar pequeño.  
No debe intentar cubrir todo el motor.

### Familias iniciales candidatas
- sacrifice / dies
- spells-matter / prowess
- draw-second
- triggered abilities classification
- linked abilities v1
- continuous effects / layers / dependency / timestamp v1

Solo deben entrar familias realmente cerradas y absorbidas.

---

## 12. Smoke de decks canónicos recomendado

Debe existir una batería fija y corta de decks gold/canónicos.

No muchos.  
Lo correcto es empezar con **3 a 5**.

Cada deck debe servir para detectar:
- presencia de edges esperados,
- ausencia de edges prohibidos,
- estabilidad de métricas estructurales/semánticas clave,
- coherencia de buckets/overlay cuando aplique.

---

## 13. Snapshots correctos

Los snapshots deben ser **estructurados**, no volcados gigantes ni HTML crudo.

### Snapshot mínimo recomendado
- coverage relevante,
- SOS / score total si aplica,
- total_edge_score,
- top edges relevantes,
- edges prohibidos ausentes,
- buckets visibles clave,
- labels visibles clave cuando aplique.

### Reglas
- deben ser pequeños,
- legibles,
- comparables,
- con diff humano útil,
- sin ruido innecesario.

---

## 14. Flujo operativo exacto para una microfase estándar

### Paso 1 — Freeze
ChatGPT redacta la ficha de microfase.

### Paso 2 — Bloque congelado para CODEX
CODEX ejecuta solo lo permitido.

### Paso 3 — Revisión del diff
ChatGPT valida:
- respeto de alcance,
- suficiencia del test focal,
- ausencia de deriva lateral.

### Paso 4 — Ejecutar Anillo B
Se corre el ring estable.

### Paso 5 — Ejecutar Anillo C si aplica
Solo si el cambio toca runtime/surface o presenta riesgo real de gap test/runtime.

### Paso 6 — Git
- `git status`
- staging explícito
- commit atómico

### Paso 7 — Push / deploy
Solo si A+B y C cuando aplique están verdes.

### Paso 8 — Cierre documental
- primero delta corto,
- luego absorción en maestros si corresponde.

---

## 15. Riesgos del nuevo método y mitigación

### Riesgo 1 — confiar demasiado en tests
**Mitigación:** mantener smoke canónico condicional para cambios de runtime o surface.

### Riesgo 2 — que el ring estable se vuelva enorme
**Mitigación:** tamaño pequeño, alta señal, incorporación conservadora.

### Riesgo 3 — snapshots ruidosos
**Mitigación:** snapshot estructurado y mínimo.

### Riesgo 4 — CODEX se salga del alcance
**Mitigación:** freeze fuerte + archivos permitidos + no-goals explícitos.

### Riesgo 5 — pérdida de trazabilidad documental
**Mitigación:** delta corto inmediato + absorción posterior en maestros.

---

## 16. Criterios de calidad que NO pueden rebajarse

No se rebajan:

- microfases estrechas,
- contrato antes que patch,
- honestidad semántica,
- anti-drift,
- commits atómicos,
- trazabilidad fuerte,
- separación entre structural / semantic / visible,
- cierre limpio y explicable.

---

## 17. Decisión documental para “fuentes”

### Se debe AÑADIR a “fuentes”
**Nuevo documento recomendado:**

`MTGSynergy_PROTOCOLO_OPERATIVO_POST_v33_VALIDATION_AND_MICROPHASE_WORKFLOW_v1_2026-03-19.md`

### No se deben sustituir
- fuentes normativas,
- fuentes de reglas,
- investigaciones semánticas,
- master specs A2.x,
- fuentes canónicas doctrinales.

### Se debe RETIRAR del núcleo activo de “fuentes”
**Archivo recomendado para sacar del núcleo doctrinal activo:**

`MTGSynergy_Informe_Derivado_Operativo_Canonico_2026-03-08_v3_consolidado.pdf`

**Motivo:**  
Es útil como referencia derivada/histórica, pero no debe seguir ocupando lugar de fuente primaria activa dentro del núcleo doctrinal.

No es necesario destruirlo; basta con:
- archivarlo fuera del núcleo,
- o moverlo a una subcarpeta tipo `historico_derivado`.

---

## 18. Recomendación final operativa

La siguiente conversación del proyecto debería abrir una microfase exclusivamente metodológica para:

- fijar el ring estable,
- fijar los decks canónicos,
- fijar el formato de snapshots,
- fijar el bloque estándar para CODEX,
- institucionalizar la puerta de promoción A/B/C.

No conviene abrir todavía otra familia semántica antes de dejar esta infraestructura metodológica cerrada.
