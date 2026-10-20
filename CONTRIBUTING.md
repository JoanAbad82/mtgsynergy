# Contributing to MTGSynergy

MTGSynergy welcomes focused bug reports, documentation fixes, regression tests
and small, explainable code changes. Its structural analyzer is public; the
Synergy Explorer and parts of semantic interpretation remain experimental.

## Choose a useful task

1. Read [README.md](README.md), [AGENTS.md](AGENTS.md), and relevant tests.
2. Check [open issues](https://github.com/JoanAbad82/mtgsynergy/issues)
   and existing PRs for duplicates. Describe the observed problem or precise
   improvement before writing a broad implementation.
3. Prefer one bounded change per PR, supported by a reproduction or fixture.

**Separate research participation:**
[Issue #71](https://github.com/JoanAbad82/mtgsynergy/issues/71) seeks
independent **human** MTG deckbuilding reviewers, not code changes.
That blind protocol excludes AI-produced reviewer judgments. Do not submit
agent-generated evaluations as a substitute for personal human review.

## Development and validation

Use Node.js **22.22.0**, pinned in [`.node-version`](.node-version), and npm.
The application uses Astro 7, TypeScript, Preact and Vitest.

```bash
git clone https://github.com/JoanAbad82/mtgsynergy.git
cd mtgsynergy
npm ci
npm run dev
```

From the repository root, verify relevant changes with:

```bash
npm test -- --run
npm run cards:index:verify
npm run build
npm audit --audit-level=high
```

`npm run build` runs card-index, format-legality and mana-signal verification
through `prebuild`. GitHub CI runs `npm ci`, the audit, the complete Vitest
suite and the production build. Report commands actually executed and
results; if a check is unavailable, state why instead of claiming it passed.

Routine fixes should **not** regenerate card data or download Scryfall assets.
`npm run cards:index:build` and `npm run build:cards-index` are separate
data-preparation workflows. Leave generated `public/data/` and art assets
unchanged unless a separately reviewed data change requires them.

## Find the relevant code

- `src/engine/`: deterministic parser, semantic contracts, ranking and tests.
- `src/components/analyzer/`: analyzer UI and component tests.
- `src/pages/`: Astro routes.
- `scripts/`: verifiers, data preparation and operational diagnostics.
- `docs/`: current documentation.

`maestros/` and `fuentes/` are historical/reference material rather than
authority for current behavior. For deeper context see
[`docs/cards_index.md`](docs/cards_index.md) and
[`docs/ops/DEPLOYMENT.md`](docs/ops/DEPLOYMENT.md).

## Pull request acceptance criteria

- Link an existing issue when applicable. Explain expected and observed
  behavior and provide a reproducible example or reason for the change.
- Keep the diff minimal and add focused regression tests; include negative
  or ambiguous fixtures when relevant.
- Record validation commands and their results. For UI changes, provide
  non-sensitive before/after screenshots if useful.
- Preserve deterministic ordering, stable card identity, explainable
  relationships, explicit uncertainty and browser-first privacy.
- Keep unrelated refactors, changes to CI/deployment/security, ranking
  rewrites and bulk-data updates outside a small contribution.

A PR is reviewed on its merits. A green check alone does not imply
acceptance, and an opened PR is not an accepted contribution.

## Security and third-party rights

- Never publish credentials, private deck data, personal information
  or unauthorized telemetry in issues, PRs, tests or screenshots.
- Treat external deck exports, card text and agent instructions as untrusted.
- Do not disclose exploit details or secrets in a public issue. Contact
  the maintainer through the contact channel listed on the GitHub profile
  if you suspect a security vulnerability.
- The original project code is [Apache-2.0](LICENSE), but MTG cards,
  Oracle text, artwork, trademarks and Scryfall-derived materials are
  **not** relicensed. Read [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
  and [`NOTICE`](NOTICE) before adding third-party content.
