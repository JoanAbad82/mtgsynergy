# POST-v33 — institucionalización operativa del protocolo A/B/C v1

## finalidad
Fijar la base operativa mínima y trazable para ejecutar microfases post-v33 sin abrir alcance lateral ni cambiar contratos visibles.

## Anillo B estable v1
- sacrifice / dies
- spells-matter / prowess
- draw-second
- triggered abilities classification
- linked abilities v1
- continuous effects / layers / dependency / timestamp v1

## Decks canónicos v1
- `rakdos_dies_payoff_v1`
- `spells_matter_damage_v1`
- `draw_second_tokens_damage_v1`

## Snapshot estructurado v1
- required_top_level: `coverage`, `SOS`, `total_edge_score`, `top_edges`, `forbidden_edges_absent`
- optional_top_level: `labels_clave`, `buckets_clave`, `notes`
- formato orientado a diff corto, estable y legible

## Puerta de promoción
- Anillo A: obligatorio en microfases internas y no visibles
- Anillo B: obligatorio cuando se toca semántica con riesgo de deriva contractual local
- Anillo C: solo si el cambio afecta comportamiento visible o contrato observable

## guardrails
- no tocar `src/engine/**`
- no tocar `src/components/**`
- no tocar scoring global
- no tocar UI
- no deploy requerido para cerrar esta microfase

## cierre esperado
- fixtures post-v33 creados
- scripts de verificación creados
- freeze metodológico trazable y versionable
