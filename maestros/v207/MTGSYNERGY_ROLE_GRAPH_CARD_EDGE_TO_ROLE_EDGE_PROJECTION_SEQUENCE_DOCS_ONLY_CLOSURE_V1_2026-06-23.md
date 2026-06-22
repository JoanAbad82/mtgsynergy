# MTGSYNERGY_ROLE_GRAPH_CARD_EDGE_TO_ROLE_EDGE_PROJECTION_SEQUENCE_DOCS_ONLY_CLOSURE_V1

**Fecha de cierre:** 2026-06-23
**Repositorio:** `~/MTGSynergy`
**Rama canónica:** `main`
**Baseline de implementación:** `32af64d`
**Commit de implementación integrado:** `47c1db00742ca00157f3b68ac9be8a5b11336f51`
**Commit corto:** `47c1db0`
**Asunto del commit:** `fix(role-graph): project card edges to role edges`
**Naturaleza de este documento:** cierre docs-only
**Estado final:** cerrado, integrado, publicado y sincronizado

---

## 1. Objeto del cierre

Este documento cierra formalmente la secuencia completa de diagnóstico, contrato, implementación, validación, integración real, commit, push y sincronización asociada a la reparación del límite entre el grafo de cartas y el grafo estructural de roles.

La secuencia corrigió un defecto de integración real: el analizador entregaba directamente aristas del dominio de cartas al cálculo estructural, aunque dicho cálculo opera exclusivamente sobre roles canónicos.

No se abre una nueva fase funcional ni se autoriza trabajo adicional mediante este cierre.

---

## 2. Causa raíz confirmada

El productor `generateEdges` emite aristas de cartas con extremos normalizados por nombre de carta:

- `from: string`
- `to: string`
- `kind`
- `weight`
- `score`

El motor estructural consume `RoleEdge`, cuyos extremos deben pertenecer al dominio cerrado de roles:

- `ENGINE`
- `PAYOFF`
- `RAMP`
- `DRAW`
- `REMOVAL`
- `PROTECTION`
- `LAND`
- `UTILITY`

Antes de la reparación, el analizador conectaba ambos dominios sin una proyección explícita. Los nombres de cartas se usaban como claves en mapas indexados por rol. El acceso a claves inexistentes producía valores `undefined`; las operaciones aritméticas posteriores generaban `NaN`, y la serialización JSON convertía esos valores en `null`.

El efecto observable incluía:

- grados estructurales inválidos;
- centralidad nula o incorrecta;
- valores `null` en la salida serializada;
- pérdida de coherencia entre las aristas visibles y el resumen estructural.

---

## 3. Contrato de dominio congelado

La reparación conserva dos dominios distintos y explícitos.

### 3.1. Aristas de cartas

Las aristas de cartas permanecen como salida pública del analizador y continúan alimentando:

- interfaz;
- explicaciones;
- recomendaciones;
- inspección;
- Structural Power Score en su contrato vigente.

Se conservan sus campos:

- `from`
- `to`
- `kind`
- `weight`
- `score`

### 3.2. Aristas de roles

Las aristas de roles se generan únicamente para el resumen estructural mediante una proyección explícita:

`card edge endpoint -> CardEntry.name_norm -> CardEntry.role_primary`

El helper nuevo:

`src/engine/structural/project_card_edges_to_role_edges.ts`

aplica las siguientes reglas:

- preserva el orden de entrada;
- preserva la multiplicidad;
- preserva `weight`;
- conserva self-role edges;
- no deduplica;
- no usa `score`;
- no muta entradas ni aristas;
- omite determinísticamente los extremos que no puedan resolverse.

---

## 4. Implementación integrada

La integración quedó limitada a cuatro archivos:

1. `src/engine/analyzer/index.ts`
2. `src/engine/structural/project_card_edges_to_role_edges.ts`
3. `src/engine/__tests__/role_graph_card_edge_projection_v1.test.ts`
4. `src/engine/__tests__/role_graph_card_edge_projection_real_deck_integration_v1.test.ts`

El wiring final separa:

- `cardEdges`, conservadas en `AnalyzeResult.deckState` y usadas por SPS;
- `roleEdges`, usadas exclusivamente para construir `structuralDeckState`;
- `computeStructuralSummary(structuralDeckState)`;
- `computeStructuralPowerScore(summary, cardEdges)`.

No se modificó la semántica de producción de aristas de cartas.

---

## 5. Cobertura de pruebas

### 5.1. Test unitario de proyección

El test unitario verifica:

- proyección exacta de extremos;
- preservación de orden;
- ausencia de deduplicación;
- preservación de `weight`;
- conservación de self-role edges;
- omisión de endpoints irresolubles;
- ausencia de mutación;
- valores finitos en grados y centralidad;
- ausencia de `null` derivados de `NaN`.

### 5.2. Test de integración con mazo real

La integración real usa el índice local de cartas y un mazo público reproducible.

Quedó validado:

- `TAGGING_ACTIVE`;
- ausencia de `TAGGING_UNAVAILABLE`;
- 15 aristas públicas de cartas;
- 15 aristas estructurales de roles;
- `summary.edges_total === 15`;
- `summary.density === 15 / (8 * 7)`;
- preservación pública de `from`, `to`, `kind`, `weight` y `score`;
- grados finitos;
- centralidad finita;
- centralidad positiva en `REMOVAL`;
- centralidad positiva en `PAYOFF`;
- ausencia de `null` estructurales.

---

## 6. Validaciones ejecutadas

La secuencia cerró con las siguientes validaciones:

- test aislado de integración real: `1/1` PASS;
- anillo focal: `44/44` tests PASS;
- A2.10 stable ring: `30/30` tests PASS;
- verificación del manifest del cards index: PASS;
- build Astro: PASS;
- generación estática: 4 páginas;
- scope exacto de commit: 4 archivos;
- hashes SHA-256 verificados antes del commit;
- árbol final limpio;
- sincronización local/remota confirmada.

---

## 7. Commit, push y sincronización

La implementación fue integrada mediante:

`47c1db00742ca00157f3b68ac9be8a5b11336f51`

con el asunto:

`fix(role-graph): project card edges to role edges`

El push avanzó:

`32af64d..47c1db0  main -> main`

Estado final confirmado:

- `HEAD = 47c1db0`
- `origin/main = 47c1db0`
- `ahead = 0`
- `behind = 0`
- worktree limpio

---

## 8. Recuperación de identidad Git

El primer intento de commit quedó bloqueado porque el repositorio no tenía identidad Git configurada.

La recuperación:

- no modificó código ni tests;
- confirmó los mismos cuatro archivos staged;
- volvió a verificar sus hashes;
- configuró identidad exclusivamente a nivel local del repositorio;
- no modificó la configuración Git global;
- completó commit, push y sincronización.

Identidad local aplicada:

- `user.name = Joan Abad`
- `user.email = rellotgeriaoficina1947@gmail.com`

---

## 9. Límites preservados

La secuencia no cambió:

- UI;
- copy de producto;
- fórmula del Structural Power Score;
- scoring de aristas;
- cards index;
- parser;
- lowering;
- contratos semánticos A2.10;
- reglas de Magic;
- formato de importación de mazos;
- sistema de recomendaciones fuera del wiring ya existente.

El cambio fue una reparación de frontera de dominio, no una ampliación funcional.

---

## 10. Resultado de cierre

La reparación queda formalmente:

- diagnosticada;
- contratada;
- implementada;
- probada en unidad;
- probada en integración real;
- validada contra regresiones;
- validada contra A2.10;
- compilada;
- integrada en `main`;
- publicada en `origin/main`;
- sincronizada;
- documentada.

**Resultado final: CERRADO.**

No queda trabajo pendiente dentro del scope de esta secuencia.

Cualquier evolución posterior del role graph, del weighting estructural, del SPS o de las explicaciones de producto deberá abrirse como una microfase independiente, con precheck propio y alcance nuevo explícitamente autorizado.
