# MTGSynergy — Cierre de Microfase

## 1) Microfase
`ANALYZER_POST_KEYWORDS_INDEX_SMOKE_V1`

## 2) Tipo
Smoke documental post-despliegue del índice con `keywords` para validar estabilidad funcional del Analizador de Mazos MTG en producción.

## 3) Estado Base
- `main == origin/main == 0af62c7`
- Commit documental previo:
  - `0af62c7 docs: close card synergy explorer keyword signal filter v2`
- `CSE KEYWORD SIGNAL FILTER V2` quedó cerrado, mergeado, pusheado y documentado.
- `cards_index` nuevo en producción:
  - `schema_version: cardrecordmin-v1`
  - `record_count: 36267`
  - `records_with_non_empty_keywords: 16419`
  - `sha256_gz: 487aa7a21a42b3ff8a2f9ab627c1d06a6952cc3beab5ae1ab27f5b262fccd424`

## 4) Objetivo Del Smoke
Validar manual y funcionalmente que el Analizador de Mazos MTG sigue funcionando correctamente con el nuevo índice que incluye `keywords`.

## 5) Ruta Pública Validada
- `https://mtgsynergy.com/es/analizador-de-mazos-mtg/`

## 6) Alcance
- Verificación funcional/manual de carga, lookup y análisis en la ruta pública del analizador.
- Verificación de degradación segura ante entradas inválidas.
- Verificación de consistencia global tras despliegue del índice enriquecido.

## 7) No-Goals
- No cambios de UI.
- No cambios en `src/`, `scripts/`, `public/data/`, tests o configuración.
- No cambios en scoring, Monte Carlo o refactor global.
- No ajuste de semántica avanzada fuera del smoke.

## 8) Evidencias Registradas
Se validaron manualmente y con PDF los siguientes escenarios:

### 8.1) Izzet Spells / Burn-Control
- Resultado: **OK fuerte**.
- El analizador cargó, resolvió cartas y produjo resultado coherente.
- SPS observado: `100.4`.
- Sinergias detectadas: `16`.
- Densidad: `0.286`.
- Roles dominantes: `Motor`, `Robo de cartas`, `Utilidad`.
- Conexiones observadas:
  - `Lightning Bolt -> Monastery Swiftspear`
  - `Consider -> Monastery Swiftspear`
  - `Consider -> Third Path Iconoclast`
  - `Counterspell -> Third Path Iconoclast`

### 8.2) Elves / Ramp
- Resultado: **OK funcional**.
- El analizador cargó y resolvió cartas principales.
- Roles dominantes razonables: `Aceleración`, `Motor`, `Robo de cartas`.
- Cobertura semántica observada: `77.8% (7/9)`.
- Limitación detectada: no capta todavía de forma suficiente la familia tribal/ramp de elfos.
- `Heritage Druid` aparece reconocida pero aún fuera de plantillas v1.
- Lectura correcta: no es regresión del índice; es deuda semántica futura.

### 8.3) Artifacts / Mana Rocks
- Resultado: **OK funcional**.
- Roles dominantes: `Aceleración`, `Robo de cartas`, `Utilidad`.
- Cobertura semántica observada: `66.7% (6/9)`.
- Conexiones explicadas observadas:
  - `Sai, Master Thopterist -> The One Ring`
  - `Sai, Master Thopterist -> Thought Monitor`
- `Basalt Monolith` y `Grim Monolith` aparecen reconocidas pero aún fuera de plantillas v1.
- Lectura correcta: estabilidad OK; señal semántica parcial.

### 8.4) Invalid / Mixed Sanity Check
- Resultado: **OK degradación segura**.
- Carta inválida: `Not A Real MTG Card 12345`.
- El analizador no se rompe.
- La carta inválida aparece como no encontrada en índice o sin texto de reglas.
- Tierras sin texto analizable degradan correctamente.
- `SPS 0 / 0 sinergias` esperado para el caso degradado.

## 9) Lectura Correcta De Resultados
- El comportamiento observado es consistente con el estado actual del sistema.
- Donde falta profundidad semántica (elf/ramp o algunos mana rocks), el analizador mantiene operación estable sin colapsos.
- Las limitaciones detectadas son de cobertura semántica v1, no de disponibilidad ni integridad del índice.

## 10) Riesgos Residuales
- Riesgo bajo-medio de percepciones de “falta de precisión” en arquetipos con dependencia tribal/ramp específica.
- Riesgo bajo de confundir cobertura parcial semántica con regresión técnica.
- Mitigación: priorizar microfase técnica estrecha sobre puentes semánticos para `mana dorks`/`elf ramp`.

## 11) Decisión De Cierre
**Aprobado**.

La validación manual del Analizador queda aprobada:
- No hay evidencia de regresión por el nuevo `cards_index` con `keywords`.
- El analizador sigue siendo `100% client-side`.
- El índice nuevo no rompe carga, lookup, análisis ni degradación con entradas inválidas.

## 12) Siguiente Microfase Recomendada
`ANALYZER_ELF_MANA_DORK_RAMP_SEMANTIC_BRIDGE_V1`

Motivo:
- El caso `Elves/ramp` fue el más claro donde el analizador funciona correctamente pero aún no modela con precisión suficiente la sinergia `mana dork + elf/ramp`.

Alcance recomendado para el siguiente paso:
- Microfase técnica estrecha.
- Sin abrir ahora UI, scoring, Monte Carlo ni refactor global.
