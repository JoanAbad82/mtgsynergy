# MTGSynergy

Explainable **Magic: The Gathering** deck and card-synergy analysis built around deterministic rules, Oracle-text interpretation, structural signals, and local-first execution.

**Live site:** https://mtgsynergy.com/

MTGSynergy is designed to make deck relationships easier to inspect rather than hiding them behind a single opaque score. The project combines a production structural analyzer with an evolving semantic engine and a public synergy-explorer beta.

## What you can use today

### Structural deck analyzer

Live: https://mtgsynergy.com/es/analizador-de-mazos-mtg/

Paste an **MTG Arena deck export** and analyze it directly in the browser.

Current capabilities include:

- deck parsing and normalization;
- structural role analysis;
- relationship/edge generation between cards;
- structural summary metrics;
- Structural Power Score (SPS) as a comparative structural signal;
- role-graph views;
- semantic-overlay analysis;
- deck-context analysis;
- optional deterministic Monte Carlo analysis;
- actionable diagnostic output;
- shareable URLs and JSON fallback export/import.

The analyzer is deliberately explanatory. Metrics are surfaced with context and guidance rather than presented as a claim about absolute competitive power.

### Synergy Explorer — public beta

Live: https://mtgsynergy.com/es/explorador-de-sinergias-mtg/

The explorer is an **iterative beta** for discovering cards connected to one or two seed cards.

The current public surface works from a local card index and exposes an evolving candidate/ranking workflow. Internally, the repository already contains contracts and modules for seed resolution, candidate pools, normalization, ranking-related work, semantic signals, and explainable candidate output.

This surface should be treated as experimental. It is not yet a final recommendation engine.

## Design principles

MTGSynergy favors:

- **Explainability** — show why two cards appear related.
- **Determinism** — prefer reproducible rules and stable contracts over opaque outputs.
- **Local-first execution** — analysis runs in the browser where practical.
- **Explicit uncertainty** — experimental metrics and incomplete coverage are identified as such.
- **Semantic structure** — model actions, roles, targets, costs, events, and card relationships instead of relying only on keywords.
- **Testable evolution** — new semantic behavior is introduced through contracts, fixtures, regression tests, and bounded changes.

## Privacy model

The main analyzer is designed to run **without accounts and without a server-side deck-analysis backend**.

For the structural analyzer:

1. paste an MTG Arena deck export;
2. analysis runs in the browser;
3. the deck is not sent to an application server for analysis;
4. sharing can be encoded into a URL or exported as JSON.

The application itself states this directly in its public FAQ: deck analysis is executed in the browser and does not require registration.

## Semantic engine

A substantial part of the repository is dedicated to semantic interpretation of card text.

The engine includes work around:

- Oracle-text parsing;
- semantic normalization;
- intermediate ability representations;
- event/action relationships;
- costs and target legality;
- zones and last-known-information semantics;
- local semantic bridges such as draw, damage, life gain, counters, tokens, sacrifice, attacks, mana production, mill, and discard;
- semantic coverage reporting;
- explainable semantic edges;
- deck-context compatibility;
- comparison of semantic-analysis results.

The semantic layer is intentionally incremental: unsupported or ambiguous cases should degrade visibly rather than silently inventing certainty.

## Card data

The runtime uses a **prebuilt local card index**.

Build tooling generates and verifies static card-index artifacts before deployment. The current card-index workflow is sourced from Scryfall bulk data during the build/preparation process; the browser runtime consumes generated static assets rather than downloading the bulk dataset on every analysis.

Relevant commands:

```bash
npm run cards:index:build
npm run cards:index:verify
```

The integrity check verifies the generated compressed index against its manifest, including SHA-256 and record count.

## Architecture

```text
MTG Arena deck export
        |
        v
Parser / normalization
        |
        +--> structural roles and summaries
        |
        +--> card relationship edges
        |
        +--> semantic parser / normalization / contracts
        |         |
        |         +--> semantic overlay
        |         +--> coverage / diagnostics
        |         +--> cost & target legality services
        |
        +--> deck-context analysis
        |
        +--> optional deterministic Monte Carlo
        |
        v
Explainable UI output
```

The public site is generated as a static Astro application.

## Technology

- **Astro 5**
- **TypeScript**
- **Preact**
- **Vitest**
- MDX content
- static-site output
- client-side analysis
- generated local card-index assets

No application database is required for the public analyzer.

## Local development

Requirements:

- Node.js 20 or compatible current LTS
- npm

Install and start the development server:

```bash
npm ci
npm run dev
```

Run the test suite:

```bash
npm test -- --run
```

Build the production site:

```bash
npm run build
```

Preview the generated build:

```bash
npm run preview
```

The normal production build runs the card-index verification step automatically through `prebuild`.

## Validation and CI

GitHub Actions validates pushes and pull requests by running:

```bash
npm ci
npm test -- --run
npm run build
```

The repository also contains focused regression suites for:

- parser behavior;
- structural analysis;
- role and edge generation;
- semantic contracts;
- semantic overlays;
- card-index integrity;
- deck-context ranking;
- recommendations;
- Monte Carlo behavior;
- cost/target legality;
- share-state behavior;
- UI analyzer panels.

Some mature semantic areas also have dedicated stable-ring regression scripts.

## Repository structure

```text
src/
  components/          analyzer UI and public-facing panels
  engine/              structural, semantic, ranking and simulation logic
  content/             site content
  pages/               Astro routes
  layouts/             page layouts
  lib/                 shared helpers

scripts/
  qa/                  validation and smoke tooling
  ops/                 deployment diagnostics
  build_cards_index.mjs
  verify_cards_index.mjs

docs/                  operational and data-index documentation
maestros/              historical design/closure records
review/                 repository audits and provenance material
public/                 static production assets
.github/workflows/      CI and health checks
```

The `maestros/` area preserves a long-running engineering record of semantic-engine iterations, contracts, audits, and closure documents. It is historical/technical material rather than the recommended entry point for new users.

## Current status

The repository contains two different maturity levels:

| Area | Status |
| --- | --- |
| Structural deck analyzer | Public and operational |
| Semantic overlay | Integrated and under continued refinement |
| Deck-context analysis | Integrated, evolving |
| Monte Carlo structural analysis | Available as an optional deterministic mode |
| Synergy Explorer | Public beta / iterative |
| Final card recommendation engine | Not presented as complete |

This distinction is intentional: experimental work should not be presented as production certainty.

## Important limitations

MTGSynergy is an analysis aid, not an authoritative rules judge or a guarantee of deck performance.

In particular:

- SPS is a structural signal, not a competitive-power rating;
- semantic coverage is incomplete and evolves over time;
- card-text interpretation can have unsupported or ambiguous cases;
- a detected relationship does not automatically mean a card belongs in a deck;
- metagame, pilot skill, sideboarding, matchup distribution, and tournament context are outside the scope of a purely structural score;
- the public Synergy Explorer remains a beta surface.

## Deployment

The site is built as static output and served publicly at:

https://mtgsynergy.com/

Operational diagnostics in the repository verify the analyzer route and deployed card-index assets.

## Project philosophy

The goal is not to answer *“Is this deck good?”* with a black-box number.

The goal is to make questions such as these easier to inspect:

- What roles does this deck actually contain?
- Which cards are structurally connected?
- Which interactions are supported by card text?
- Where is semantic coverage strong or weak?
- Which relationships survive controlled perturbation?
- Why is a candidate card considered related to another card?

That emphasis on **inspectable reasoning** is the core of MTGSynergy.

## License

Original MTGSynergy software source code is licensed under the
[Apache License 2.0](LICENSE), unless otherwise indicated.

Magic: The Gathering card text, images, artwork, trademarks, Scryfall-derived
card data, and other third-party materials are **not** relicensed under
Apache-2.0. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for scope and
attribution details.
