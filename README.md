# BrandArmor v4

Evidence-first suspicious listing review app for skincare/cosmetics marketplaces. V4 routes listings for evidence-backed review: capture listing evidence, run optional Mistral OCR, compare against an official product baseline, check BPOM/NIE evidence through the BPOM adapter, run visual comparison in an adapter/mock shape, score with transparent reasons, use Claude/Mistral as an optional evidence judge, collect internal human labels, and report pilot evaluation metrics.

> **PIDI Digdaya × Hackathon 2026 (Bank Indonesia) — Team P1005.**
> Problem Statement: Percepatan Layanan Publik, Ekonomi Kreatif, dan Ekspor Jasa Digital → Digitalisasi Ekonomi Kreatif → **IP Protection (brand-side, anti-counterfeit)** + **Market Insight Industri Kreatif**.
> Live demo: https://brandarmor.asynchronope.my.id (mirror: https://brandarmor.vercel.app). This is decision-support for prioritized review — not automatic counterfeit detection, authenticity verification, or enforcement.

## Agent Handoff

If you are a coding agent taking over this app, read `HANDOFF.md` first, then `RUNBOOK.md`, `ARCHITECTURE.md`, `KNOWN_LIMITS.md`, and `VERSION_HISTORY.md`.

Also read `AGENTS.md`, `MEMORY.md`, and `ERRORS.md` before significant changes. They preserve the evidence-first agent operating model, durable decisions, and repeated failed approaches.

For the full operating scaffold, read:

- `docs/BRANDARMOR_OPERATING_SYSTEM.md`
- `docs/PRODUCTION_AGENT_ARCHITECTURE.md`
- `docs/ML_AI_ROADMAP.md`
- `docs/CODEX_WORKING_PROTOCOL.md`
- `docs/SOURCE_LEARNING_MAP.md`

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3015/`, use `Start` for workspace status, then click `Run Demo` / `Run Demo Pipeline` for one guided evidence path.

The default dev port is `3015` to avoid stale local Next cache conflicts on `3000`. Use `npm run dev:3000` only if you specifically need port `3000`.

For a production-like local run that simulates Vercel and loads `.env.local` without inheriting stale parent shell keys, use:

```powershell
.\scripts\start-local.ps1
```

That starts `npm run start` with `VERCEL=1` and explicit `.env.local` values.

## Provider Keys

`MISTRAL_API_KEY` enables OCR and the Mistral judge fallback. `ANTHROPIC_API_KEY` enables the Claude evidence judge. The Anthropic judge uses forced tool-use structured output so malformed free-text JSON does not crash the demo. If Anthropic is unavailable, the app falls back to Mistral LLM when `MISTRAL_API_KEY` is present, then to a mock judge. Invalid Anthropic/Mistral judge credentials are converted to explicit fallback output so provider auth errors are not exposed as product evidence.

```bash
MISTRAL_API_KEY=... npm run dev
```

The app uses Mistral OCR to extract text from listing screenshots/product images. OCR output is stored as evidence; it is not treated as final truth.

## Core Flow

1. Start from the status dashboard or run the guided demo path; product truth can also be registered manually with official URLs/images, MSRP, authorized sellers, BPOM/NIE, size, ingredients highlights, and packaging/label notes.
2. Discover, add, or import candidate listings through search, browser-capture style evidence, manual entry, or JSON import.
3. Open the listing workspace, follow the top next-action band, link the product baseline first when prompted, then run the recommended pipeline.
4. Run OCR, parse BPOM/NIE, size, expiry, batch/lot, ingredients, claims, seller, and price evidence.
5. Compare text, regulatory, price/seller, and visual evidence against the baseline. The seeded demo baselines use real BPOM records for Somethinc Calm Down PHA 3% Soothing Everyday Toner and Gloglowing Baby Glow Lip Serum.
6. Compute calibrated risk from deterministic features.
7. Run the LLM evidence judge; it must cite evidence IDs and say insufficient evidence when proof is weak.
8. Apply an internal human review label.
9. Review pilot precision, recall, false-positive rate, false-negative rate, precision@K, and review burden on the Evaluation page.

## Agent Operating Model

BrandArmor uses small, focused agent-like workflow steps rather than a monolithic autonomous agent. `src/domain/investigation.ts` defines durable investigation runs, event appends, and compact context packs so future OCR, BPOM, visual, scoring, judge, report, and human-review flows can pause, resume, cite evidence, and expose missing proof.

## BPOM Search

Use `GET /api/regulatory/search?brand=Somethinc` to query the official BPOM cosmetics adapter directly. It accepts `brand`, `nie`, `productName`, and `length`, returns `source: "bpom_api"`, and uses `Cache-Control: no-store`.

The current demo seed includes two real BPOM-backed baselines:

- Somethinc: Calm Down PHA 3% Soothing Everyday Toner, `NA18261203080`, `Berlaku`.
- Gloglowing Skin Care: Baby Glow Lip Serum, `NA18251303192`, `Berlaku`.

## Integration Readiness

Use `GET /api/health/integrations` to see which env-backed integrations are configured and which are actually implemented in this MVP. `MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, and BPOM search have app paths. `BROWSER_USE_ENDPOINT` and `HF_API_TOKEN` are reported as roadmap/not implemented so proposal claims stay honest.

## Demo Data Auto-Seed

On Vercel the data dir (`/tmp`) is ephemeral and per-instance, so a fresh instance starts empty. To keep the public demo from ever showing an empty workspace:

- `ensureDemoSeeded()` (see `src/persistence/auto-seed.ts`) repopulates the idempotent demo dataset whenever the store is empty, wired into a cold-start `src/instrumentation.ts` hook and the dashboard page.
- Seeded ids are **deterministic** (`beginDeterministicIds()` in `src/lib/utils.ts`), so every instance seeds identical ids and listing deep-links (`/listings/<id>`) resolve no matter which instance serves the request.
- Auto-on for serverless; set `BRANDARMOR_AUTO_SEED=0` to disable for a real production tenant, or `=1` to force on locally.

## Current Verification

- App version: `0.4.2`.
- Automated tests: `181/181` passing.
- Build: `npm run build` passes with 21 API routes and 34 generated pages.
- Public deployed demo verification: `brandarmor.asynchronope.my.id` and `brandarmor.vercel.app` return seeded demo data, stable seeded listing IDs, and working listing detail hydration.
- Guided demo currently shows OCR/mock for placeholder screenshots, BPOM/real, visual/mock adapter, and judge/real when Anthropic or Mistral is configured.
- The dashboard, listing workspace, review queue, evaluation page, manual intake, and JSON import now prioritize cold-user guidance, consolidated ambient status, action-first listing review, baseline-gated actions, claim-safe media previews, internal review language, visible queue counts, plain-language pilot evaluation, and claim-safe action labels.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local app on `http://localhost:3015` |
| `npm run dev:3000` | Start local app on port 3000 |
| `npm run typecheck` | TypeScript verification |
| `BPOM_DISABLE_API=1 npm test` | Deterministic Vitest run without live BPOM dependency |
| `npm run build` | Production build |
| `npm run verify:env` | Environment diagnostics |

## Known Limits

- No promise of 100% counterfeit detection.
- No production auth or multi-tenant controls yet.
- Search results are candidate leads, not authoritative marketplace records.
- Browser capture is intended for user-guided evidence collection, not bulk marketplace crawling.
- Image similarity currently uses an adapter/mock evidence shape; replace with SigLIP/DINOv2 embeddings after a labeled/reference image set exists.
- BPOM/NIE verification can query the official `cekbpom.pom.go.id` cosmetics endpoint when network access is available; link-out/manual confirmation remains appropriate for final evidence review.
- Local JSON persistence is demo-portable, not production storage; it does not support concurrent writers, tenant isolation, or audit-grade retention. The serverless demo relies on cold-start auto-seed (see above) rather than durable storage.
- Gloglowing marketplace leads are currently candidate discovery/manual evidence records, not automated proof of live marketplace fraud.

## Accuracy Evidence

The scoring output is a calibrated routing score, not a legal conclusion. V4 must grow a labeled skincare/cosmetics dataset before claiming high accuracy. The dashboard and evaluation page should always expose dataset size and threshold behavior.

## Deployment Status

- Live demo: https://brandarmor.asynchronope.my.id/
- Vercel alias: https://brandarmor.vercel.app/
- GitHub: https://github.com/bO-05/brandarmor
- Last local verification: `npm run typecheck`, `BPOM_DISABLE_API=1 npm test` (`181/181`), `npm run build`, and HTTP smoke checks for `/`, `/demo`, `/listings/new`, `/listings/import`, `/review`, `/evaluation`, and a linked listing detail page.
- Last deployed verification: public domains returned `demoReady: true`, 2 brands, 2 products, 7 listings, stable seeded IDs including `seed0000000060`, and hydrated listing detail pages without `Listing not found`.
- Do not set `BRANDARMOR_DATA_DIR=.brandarmor-data/` in Vercel. The app now ignores relative data-dir overrides in serverless mode and writes to the platform temp directory (`/tmp/.brandarmor-data` on Vercel).
- Serverless empty stores auto-seed deterministic demo data for hackathon reliability. This is still ephemeral demo storage, not production persistence.
- Do not send protected Vercel project or preview aliases to judges; use the live demo or Vercel alias above.

## Quick Vercel Redeploy

If the live site shows stale code:
1. Go to https://vercel.com/dashboard
2. Open the `brandarmor` project
3. Deployments tab -> ... menu on latest commit -> "Redeploy"
4. Or: Settings -> Git -> Connected Git Repository -> ensure auto-deploy is on
