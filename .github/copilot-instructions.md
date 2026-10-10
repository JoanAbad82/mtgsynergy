# Copilot repository context

Follow root AGENTS.md and current src/engine tests. This is an Astro,
TypeScript and Preact project with deterministic, explainable rules.
Never silently change card identity, legality, Oracle interpretation,
candidate ordering, score weights or handling of unsupported mechanics.
For engine modifications write positive, negative and ambiguity tests.
Run npm test -- --run, npm run cards:index:verify and npm run build.
Do not invoke Scryfall bulk downloads or regenerate image assets during
a documentation-only change. Apache-2.0 does not cover Wizards content;
see THIRD_PARTY_NOTICES.md. Avoid credential handling and deployments.
