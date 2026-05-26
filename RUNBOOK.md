# BrandArmor v4 Runbook

## Requirements

- Node.js 20.19.0 or newer is recommended because the current Vite/Vitest dependency chain warns on older Node 20 builds.
- npm.
- Optional `MISTRAL_API_KEY` for real OCR.
- Optional `ANTHROPIC_API_KEY` for Claude evidence judge.
- Optional `PERPLEXITY_API_KEY` for candidate discovery.

## Install

```powershell
npm install
```

## Environment

Copy `.env.example` to `.env.local` only on your machine. Do not commit `.env.local`.

Minimum local demo mode works without secrets:

```powershell
npm run dev
```

The default dev script listens on:

```text
http://localhost:3015/
```

Keep the terminal running while using the app. If you need port `3000` instead, run:

```powershell
npm run dev:3000
```

Real OCR requires:

```powershell
$env:MISTRAL_API_KEY="..."
npm run dev
```

For production-like local testing on `http://localhost:3000`, use:

```powershell
.\scripts\start-local.ps1
```

This script sets `VERCEL=1`, uses temp-backed persistence, and explicitly loads `.env.local` values so stale parent shell variables do not override fresh API keys.

## Verify

Run these before claiming the app works:

```powershell
npm run typecheck
$env:BPOM_DISABLE_API="1"
npm test
npm run build
```

Optional environment diagnostics:

```powershell
npm run verify:env
```

## Run The Demo

```powershell
npm run dev
```

Open:

```text
http://localhost:3015/
```

Use `Start` for workspace status, then click `Run Demo` / `Run Demo Pipeline` on `/demo`.

Expected result:

- The dashboard explains workspace status, evidence-backed review path, and provider readiness.
- Demo data is seeded if the local store is empty.
- A candidate listing is selected.
- OCR artifact is created.
- Regulatory and visual evidence records are created.
- A deterministic score is created.
- A judge assessment is created. Anthropic runs as a real structured-output tool call when configured; Mistral is the real fallback; mock is the final explicit fallback.
- Review and evaluation links are returned.
- The generated listing detail page shows a top next-action band, case brief, baseline-gated recommended evidence pipeline, inline review decision panel after a review item exists, a full evidence workspace disclosure for dense details, claim-safe action copy, and internal review language.
- The review queue shows total, pending, and labeled item counts.
- The evaluation page leads with reviewer workload and useful-review share before technical metrics.
- Manual listing intake groups related fields on desktop, and JSON import includes a `Load sample JSON` action with `productId` in the sample.

## Reset Local Demo Data

Stop the dev server, then delete `.brandarmor-data/` from this package directory. The next demo run will create a fresh local store.

Do not delete source files when resetting demo data.

## Common Blockers

- `MISTRAL_API_KEY` missing: real OCR is unavailable; demo can still use mock OCR for placeholder image URLs.
- OCR image URL blocked: Mistral can only process URLs it can fetch publicly.
- `ANTHROPIC_API_KEY` missing: judge falls back to Mistral if configured, otherwise mock judge.
- Anthropic key works in the console but the app shows auth failure: check for a stale parent `ANTHROPIC_API_KEY`; use `.\scripts\start-local.ps1` locally.
- Port `3015` busy: stop the existing process or change the dev script.
- `localhost` refuses connection: no dev server is listening. Run `npm run dev`, keep that terminal open, and verify with `netstat -ano | Select-String ':3015'`.
- Windows/Codex sandbox process issues: hidden/background server launches may die after the tool call, especially when the shell has duplicate `Path`/`PATH` environment keys. Start the server in a normal user terminal, or allow Codex to launch a persistent `cmd /d /c start ... npm run dev` process when asked.
- Windows sandbox `EPERM`: run the same command in a normal terminal if Codex shell cannot spawn child processes.

## Release Handoff Checklist

- `npm run typecheck` passes.
- `BPOM_DISABLE_API=1 npm test` passes.
- `npm run build` passes.
- Hydrated browser smoke checks pass for `/`, `/demo`, `/listings/new`, `/listings/import`, unlinked and linked listing detail pages, `/review`, and `/evaluation` when UI flows are changed. If no browser tool is available, use built-route HTTP smoke checks and clearly state that visual viewport inspection was skipped.
- `.env.local` is not present in Git.
- `.brandarmor-data/`, `.next/`, and `node_modules/` are not present in Git.
- `HANDOFF.md`, `ARCHITECTURE.md`, `RUNBOOK.md`, `KNOWN_LIMITS.md`, and `VERSION_HISTORY.md` are committed.
