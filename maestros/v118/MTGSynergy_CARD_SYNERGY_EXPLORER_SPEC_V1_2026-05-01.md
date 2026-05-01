# MTGSynergy — CARD_SYNERGY_EXPLORER_SPEC_V1
## Diseño técnico de explorador de sinergias por carta

- Fecha: 2026-05-01
- Versión documental: v118
- Estado: **Spec-only**
- Implementación: **No implementado**
- UI: **No UI**
- Motor nuevo: **No**

---

## 1) Estado y alcance del documento
Este documento define el diseño técnico canónico para una futura herramienta **Card Synergy Explorer** en MTGSynergy.

Este documento **no** implementa código, **no** crea UI y **no** modifica el motor actual.

---

## 2) Contexto de producto
La superficie pública de la web quedó centrada en el analizador de mazos.

La nueva herramienta futura debe permitir introducir **1 o 2 cartas semilla** y devolver:
- candidatas sinérgicas ordenadas,
- explicaciones auditables,
- filtros opcionales de uso.

El objetivo es ofrecer **candidatas sinérgicas explicables**, no “mejores cartas absolutas”.

---

## 3) Principios técnicos obligatorios
1. El núcleo de sinergia se basa en **evento/efecto + bridge causal explícito**.
2. No usar **SPS de mazo** como ranking de carta individual.
3. No usar Montecarlo para esta feature.
4. No compensar semántica faltante con heurística global difusa.
5. Separar claramente: coste, target, legalidad, efecto y payoff.
6. Core puro, determinista, auditable y client-side.
7. Adaptador de datos separado del core de ranking.
8. Degradación explícita de errores y ambigüedad.

---

## 4) Non-goals explícitos
- No construir recomendador “universal” de power level.
- No recalcular ni alterar scoring estructural existente del analizador.
- No tocar parser principal ni semantic overlay del pipeline actual.
- No reescribir cards index ni su flujo de build/verify en esta fase.
- No prometer legalidad exacta si el datasource activo no la expone.
- No exponer recomendaciones como sustituto de pruebas de juego.

---

## 5) Datasource actual (auditoría)
### 5.1 Ruta canónica runtime actual
El runtime canónico actual consume:
- `public/data/cards_index.json.gz`

Con esquema mínimo:
- `cardrecordmin-v1`

### 5.2 Campos mínimos efectivamente disponibles en runtime
Según flujo vigente de lookup/enrich, el camino canónico usa (como base firme):
- `name`
- `name_norm`
- `type_line`
- `oracle_text`
- `cmc`

### 5.3 Shards ricos existentes
Existen shards en:
- `public/data/cards_index/*.json`

Con campos ricos (ej. `colors`, `color_identity`, `legalities`, `mana_cost`, `keywords`, etc.).

### 5.4 Regla de diseño para v1
- V1 debe funcionar con el índice mínimo canónico.
- `colors/color_identity/legalities` se modelan como campos opcionales/futuros mientras no se formalice datasource rico en runtime.

---

## 6) Input contract propuesto
```ts
type CardSynergyExplorerInput = {
  seeds: [string] | [string, string];
  format?: "standard" | "historic" | "explorer" | "brawl" | "commander";
  colors?: string[]; // ["W","U","B","R","G"]
  manaValueRange?: { min?: number; max?: number };
  cardTypeFilter?: Array<
    "creature" | "instant" | "sorcery" | "artifact" | "enchantment" | "planeswalker" | "land"
  >;
  includeOffColor?: boolean; // default: true (con warning)
  sort?: { by?: "synergy_score" | "mana_value" | "name"; dir?: "desc" | "asc" };
  limit?: number; // default recomendado: 50
};
```

Notas:
- `seeds` con 1 o 2 cartas.
- `format/colors/mana/type` son filtros/ajustes secundarios, nunca núcleo causal.

---

## 7) Output contract propuesto
```ts
type CandidateCard = {
  name: string;
  name_norm: string;
  type_line?: string | null;
  mana_value?: number | null;
  colors?: string[] | null;
  color_identity?: string[] | null;
  legalities?: Record<string, string> | null;
};

type CandidateScoreBreakdown = {
  semanticCore: number;
  bridgeStrength: number;
  roleComplementarity: number;
  redundancyOrEnablement: number;
  manaAdjustment: number;
  colorAdjustment: number;
  formatAdjustment: number;
  penalties: number;
};

type DetectedBridge = {
  sourceSeed: string;
  targetCandidate: string;
  key: string; // p.ej. EVENT:X -> ACTION:Y
  evidence: string[];
  weight: number;
};

type CandidateWarning =
  | "OFF_COLOR"
  | "UNSUPPORTED_FORMAT_LEGALITY"
  | "MISSING_ORACLE_TEXT"
  | "INSUFFICIENT_SEMANTIC_PROFILE";

type CardSynergyCandidate = {
  candidateCard: CandidateCard;
  totalScore: number;
  scoreBreakdown: CandidateScoreBreakdown;
  explanation: string;
  detectedBridges: DetectedBridge[];
  roles: string[];
  warnings: CandidateWarning[];
  confidence: number; // 0..1
};

type ExplorerWarning =
  | "UNKNOWN_CARD"
  | "AMBIGUOUS_NAME"
  | "INSUFFICIENT_SEED_SEMANTICS"
  | "MISSING_ORACLE_TEXT"
  | "UNSUPPORTED_FORMAT_LEGALITY";

type CardSynergyExplorerResult = {
  seedsResolved: CandidateCard[];
  candidates: CardSynergyCandidate[];
  warnings: ExplorerWarning[];
  meta?: { considered: number; filteredOut: number };
};
```

---

## 8) Ranking model propuesto
Modelo aditivo, determinista y auditable.

`totalScore = semanticCore + bridgeStrength + roleComplementarity + redundancyOrEnablement + manaAdjustment + colorAdjustment + formatAdjustment - penalties`

Componentes:
1. `semanticCore` (principal): causalidad semántica mínima verificable.
2. `bridgeStrength`: calidad/cantidad de bridges explícitos detectados.
3. `roleComplementarity`: si la candidata completa patrón enabler/payoff/protection.
4. `redundancyOrEnablement`: redundancia funcional útil o habilitación de líneas.
5. `manaAdjustment`: ajuste suave por coste/curva.
6. `colorAdjustment`: compatibilidad por identidad de color (si hay datos).
7. `formatAdjustment`: legalidad por formato (si hay datos).
8. `penalties`: ambigüedad, falta de oracle, off-color estricto, etc.

**Regla obligatoria:**
> Ningún ajuste de mana/color/formato puede fabricar sinergia si no existe base semántica mínima.

Si `semanticCore` es nulo o insuficiente, la carta no debe escalar por ajustes cosméticos.

---

## 9) Orden por defecto
Orden por defecto recomendado:
- `synergy_score desc`

Empates:
1. mayor `semanticCore`
2. mayor `bridgeStrength`
3. menor `mana_value`
4. `name_norm` asc

---

## 10) Criterios de maná
- Considerar `mana_value` absoluto.
- Considerar diferencia respecto a semillas.
- Ajuste gradual de curva.
- Penalización progresiva a costes muy altos.
- Sin hard-cut por coste: si la sinergia causal es fuerte, la carta puede quedar arriba.

---

## 11) Criterios de color
- Si existe `color_identity`, aplicar compatibilidad con semillas/filtro.
- Off-color puede:
  - excluirse (`includeOffColor=false`), o
  - incluirse con warning (`OFF_COLOR`) y penalización.
- Si el datasource runtime no trae color, no bloquear por color: marcar estado desconocido.

---

## 12) Criterios de formato
- Si `legalities` existe, usarlo para filtrar/ajustar.
- Si no existe en datasource runtime canónico, retornar warning `UNSUPPORTED_FORMAT_LEGALITY` o estado `unknown`.
- No prometer exactitud de legalidad en v1 sin datasource enriquecido formal.

---

## 13) Semántica mínima MVP
Cobertura inicial sugerida (ya alineada con familias presentes en el repositorio):
- `cast spell -> spells-matter` (draw/token/damage payoffs)
- `draw -> draw-matters` (damage/token/mill/life/counters según bridge)
- `damage -> life loss`
- `life gain -> add counters / draw`
- `create token -> ETB`
- `sacrifice as cost -> draw/payoff` cuando exista bridge local explícito
- `attacks -> payoff simple` cuando el perfil sea explícito y estrecho

Fuera de MVP:
- motor completo de reglas de combate/capas,
- inferencias semánticas abiertas no auditables,
- recomendaciones por “similitud difusa” sin evidencia causal.

---

## 14) Manejo de ambigüedad y degradación
Degradaciones obligatorias:
- `UNKNOWN_CARD`: semilla no resuelta.
- `AMBIGUOUS_NAME`: múltiples matches razonables.
- `INSUFFICIENT_SEED_SEMANTICS`: seed sin señal causal mínima.
- `MISSING_ORACLE_TEXT`: texto no utilizable.
- `UNSUPPORTED_FORMAT_LEGALITY`: formato no evaluable con datasource activo.

Casos especiales:
- split/adventure/DFC: resolver a nombre canónico y alias conocidos.
- tokens: no tratarlos como candidatas jugables por defecto.
- oracle vacío/no informativo: puntuar con penalización fuerte y warning.

---

## 15) Explainability obligatoria
Cada candidata debe incluir:
1. explicación corta (1-2 líneas),
2. evidence fragments (keys/bridges/texto reducido),
3. factores de subida (`why up`),
4. factores de bajada (`why down`).

No se aceptan scores opacos sin desglose.

---

## 16) API interna futura
```ts
// Core puro: sin I/O, sin fetch, sin side effects
function exploreCardSynergyCandidatesCore(
  input: CardSynergyExplorerInput,
  context: CardSynergyExplorerContext,
): CardSynergyExplorerResult;

// Adaptador de datos: lookup/resolución/pool/caché
async function buildCardSynergyExplorerContext(
  input: CardSynergyExplorerInput,
  opts?: { baseUrl?: string }
): Promise<CardSynergyExplorerContext>;
```

Regla arquitectónica:
- Core de ranking separado del adaptador.
- Core testeable con fixtures puras.

---

## 17) Plan por microfases
1. `SPEC_DOC_V1` (esta fase)
2. `CONTRACT_TYPES_V1`
3. `NORMALIZATION_AND_RESOLUTION_V1`
4. `ENGINE_MIN_V1`
5. `GOLDEN_FIXTURES_V1`
6. `DEBUG_INSPECTION_V1`
7. `UI_INTERNAL_V1`
8. `UI_PUBLIC_V1`

---

## 18) Tests previstos
- Contract tests de input/output.
- Determinismo (mismo input => mismo resultado y orden).
- Inmutabilidad de input/context.
- Degradación explícita (unknown/ambiguous/missing oracle).
- Ranking sanity (sin semántica mínima no hay top score artificial).
- Filtros de mana/color/formato con datos presentes y ausentes.
- Explainability mínima obligatoria por candidata.
- No-regression: sin imports/calls a SPS, Montecarlo, parser principal de mazo, UI.

---

## 19) Riesgos
1. Fuente de datos dual (índice mínimo vs shards ricos) puede generar discrepancias.
2. Cobertura semántica parcial en cartas complejas.
3. Coste computacional client-side si se recorre pool grande sin preindexado.
4. Ambigüedad de nombres y variantes de impresión.
5. Expectativas de usuarios sobre “top cards universales” frente a “candidatas explicables”.

---

## 20) Preguntas abiertas
1. ¿Formalizar datasource rico en runtime o seguir con mínimo + enriquecimiento opcional?
2. ¿Búsqueda parcial de nombres en v1 o solo exacta/normalizada?
3. ¿Política por defecto para off-color (incluir con warning vs excluir)?
4. ¿Límite de candidatos por defecto (30, 50, 100)?
5. ¿Cómo exponer legalidad cuando el dato no esté disponible de forma canónica?

---

## 21) Recomendación final de siguiente microfase
Siguiente fase técnica recomendada:

**CARD_SYNERGY_EXPLORER_CONTRACT_TYPES_V1**

Objetivo inmediato:
- fijar tipos TS canónicos,
- warnings y códigos de degradación,
- contratos de score breakdown,
- tests de contrato/determinismo base,
- sin UI y sin tocar motor funcional.

---

## Estado final de esta fase
- Documento de diseño creado.
- Sin cambios de implementación.
- Sin cambios de UI.
- Sin cambios de motor.
- Sin cambios de datasource.
