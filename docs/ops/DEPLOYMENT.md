# Deployment Diagnostics

## Run (Windows PowerShell 7)
From the repo root:

```powershell
pwsh .\scripts\ops\deploy_diag.ps1
```

This writes a timestamped report file in the repo root:

```
OPS_DEPLOY_DIAG_YYYYMMDD_HHmm.txt
```

## What the script checks
- **HEAD** request to the analyzer page:
  - `https://mtgsynergy.com/es/analizador-de-mazos-mtg/`
- **HEAD** requests to cards index shards:
  - `https://mtgsynergy.com/data/cards_index/_meta.json`
  - `https://mtgsynergy.com/data/cards_index/l.json`
- Repo state:
  - `git status -sb`, `git branch -vv`, `git remote -v`
- Workflows:
  - Lists `.github/workflows/*.yml` and detects if they include `push` on `main`.

## How to interpret results
- **If cards index HEAD requests return 404**:
  - The cards index is not deployed. Tagging/feature inference in production will be unavailable and the analyzer will default to UTILITY.
  - Fix by ensuring the build pipeline runs the `prebuild` step and uploads generated files.
- **If analyzer page returns 200 but cards index is 404**:
  - UI is deployed but runtime lookups will fail; expect `TAGGING_UNAVAILABLE` in issues.

## Hosting provider hints (by headers)
Check the report headers for common markers:
- **Cloudflare Pages**: `server: cloudflare`, `cf-ray`, `cf-cache-status`
- **Vercel**: `x-vercel-id`, `server: Vercel`
- **Netlify**: `server: Netlify`, `x-nf-request-id`

Use these to confirm which platform is serving production.
