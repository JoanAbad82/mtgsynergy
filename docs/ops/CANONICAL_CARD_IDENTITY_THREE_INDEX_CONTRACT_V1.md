# Contrato V1 — identidad canónica y cobertura entre tres índices

**Microfase:** CANONICAL_CARD_IDENTITY_THREE_INDEX_CONTRACT_V1
**Fuente:** índice estático Oracle, instantánea de legalidad Scryfall y señales de maná.
**Límite:** identidad, resolución determinista y tratamiento de incertidumbre. **No cambia** puntuaciones semánticas, selección de anclajes, ranking, estrategia ni corpus ciego de revisión humana.

## Problema reproducido antes del parche (RED)

- La entrada `Delver of Secrets` seleccionaba por orden `Delver of Secrets // Delver of Secrets`, cuyo texto Oracle está vacío, ignorando `Delver of Secrets // Insectile Aberration`, que sí ofrece texto Oracle.
- Un nombre corto compartido por dos cartas distintas con Oracle no vacío elegía arbitrariamente la primera.
- `Emeritus of Ideation` no encontraba la legalidad ni las señales de maná cuyos mapas utilizaban exclusivamente `emeritus of ideation // ancestral recall`.
- La prueba del conflicto de legalidad daba `unknown` correctamente y debía mantenerse.

Registro test-first: en `src/engine/__tests__/canonical_identity_three_indexes_contract_v1.test.ts`, resultado inicial **4 FAIL / 1 PASS**, previo a modificar código de producción.

## Política contractual

1. **Nombre canónico exacto:** la clave completa (incluidas caras) conserva prioridad y el registro solicitado no se cambia de identidad. Normalización de espacios y caja Unicode existente.
2. **Alias de primera cara Oracle:** si existen varios registros con el mismo primer nombre, se selecciona uno solo cuando **exactamente uno** tiene texto Oracle utilizable. Si dos o más ofrecen texto, resolver como **desconocido**; nunca elegir por el orden de JSON. El caso de un único registro sin Oracle conserva su identidad, sin certificar contenido.
3. **Alias de instantáneas auxiliares:** los índices locales de legalidad y maná permiten un nombre corto únicamente cuando corresponde a **una sola clave canónica** en la instantánea. Si hay varias claves, se devuelve desconocido **aunque tengan el mismo estatus**: no se puede certificar que sean la misma carta sin una identidad verificada.
4. **Sin equivalencia transversal presunta:** el alias identifica la clave dentro de cada instantánea; no inventa campos de `oracle_id`, reimpresiones, restricciones, identidades de caras ni estatus.
5. **Fallos cerrados:** `banned` y `not_legal` siguen excluidos; `restricted`, ambiguos, faltantes y snapshots caducados siguen sin clasificarse como legales. Las fuentes de maná faltantes/ambiguas siguen `unknown`, sin promover cartas.
6. **Transparencia:** una tarjeta con color disponible significa que existe una fuente directa, **no** que haya suficientes fuentes, que la curva sea viable o que la carta mejore el mazo.
7. **Sin dependencias externas nuevas:** todo se calcula con instantáneas estáticas de origen local y una caché ligada a la identidad de cada mapa de datos, sin enviar mazos a servicios externos durante análisis.
8. **Invariantes:** exact lookup, cardinalidad de candidatas, scoring, límites y ordenación de resultados sin modificar. Mantener el protocolo de la issue #71 separado.

## Código afectado

- `src/engine/cards/canonical_identity_v1.ts`: funciones deterministas y fail-closed para resolución de primera cara de Oracle y correspondencia en snapshots.
- `src/engine/cards/lookup.ts`: evita aliases arbitrarios.
- `src/engine/deck_context/format_legality_v1.ts`: consulta alias único antes de verificar formato (sin cambiar reglas ni caducidad).
- `src/engine/deck_context/mana_feasibility_v1.ts`: consulta alias único antes de interpretar fuentes (sin cambiar fórmulas).
- `src/engine/__tests__/canonical_identity_three_indexes_contract_v1.test.ts`: positivos, negativos y ambigüedades.

## Alcance y límites

El registro de octubre de 2026 del índice principal Oracle es en realidad de **2026-05-07** (36.267 registros), mientras los snapshots de legalidad y maná son de **2026-10-12**. El contrato reduce fallos de alias, pero **no sincroniza automáticamente las instantáneas** ni resuelve todos los casos de Oracle ambiguos o ausentes.

En datos reales, `Emeritus of Ideation // Ancestral Recall` puede tener coste compuesto `{3}{U}{U} // {U}`; aunque ahora se localice la ficha de maná, el analizador puede mantener `unknown` si no modela ese coste. El contrato no elimina deliberadamente esa incertidumbre.

La evaluación humana sigue congelada: ningún resultado de las dos IA sirve como verdad de calidad competitiva. Su criterio de éxito es independiente y no se modifica con esta intervención.

## Validaciones exigidas antes de proponer integración

- Evidencia RED de cuatro fallos, seguida de los mismos casos en GREEN.
- Regresión de identidad y legalidad negativa de cartas con varias caras.
- `npm test -- --run`, `npm run cards:index:verify`, verificación de legalidad y maná, `npm run build`.
- Revisión de diff estrictamente limitado, `git diff --check`, commit firmado y CI del PR. **No desplegar ni fusionar** sin observar los resultados.

**Nota:** compatibilidad real de curva, cantidades y estrategia queda fuera de este contrato.


## Evidencia final de esta ejecución (12-10-2026)

- **RED previo:** 5 pruebas nuevas: 4 fallos observados, 1 caso de incertidumbre correcto.
- **GREEN posterior:** 7/7 pruebas nuevas, incluidas lecturas de los snapshots locales Oracle, legalidad y maná.
- **Regresión focal:** 4 archivos / 33 pruebas PASS.
- **Regresión completa de producción:** `npx vitest run src --reporter=dot`: 237 archivos / 763 pruebas PASS.
- **Integridad de datos:** `npm run cards:index:verify`, `verify_cards_format_legalities.mjs` y `verify_cards_mana_signals.mjs`: PASS.
- **Compilación:** `npm run build`: PASS, 4 páginas estáticas.
- **Incidencia no atribuible a la reparación:** `npm test -- --run` sin restringir scope incluye `review/.../replay_ten_decks.test.ts`, un script auxiliar histórico con importación relativa `../analyzer` inválida. Esta invocación da error aunque los 761 tests de src ejecutados entonces pasaron. No se modificó ni borró material histórico para ocultar el error. La ejecución definitiva, restringida a `src/`, pasa íntegramente.
- No se modificaron fichas Scryfall, el ranking, las 155 evaluaciones IA ni los paquetes humanos. La referencia de `main` queda inmóvil hasta revisión y merge separado.
