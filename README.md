# BrandArmor v0.5.0 — Durable Pilot

Evidence-first suspicious-listing review workflow for skincare/cosmetics marketplaces. BrandArmor helps a brand create a product baseline, capture a listing case, preserve private evidence, run durable evidence stages, prioritize human review, and export a claim-safe **JSON** evidence report.

> **PIDI Digdaya × Hackathon 2026 (Bank Indonesia) — Team P1005 / Vultur.**
> Problem Statement: Percepatan Layanan Publik, Ekonomi Kreatif, dan Ekspor Jasa Digital → Digitalisasi Ekonomi Kreatif → **IP Protection (brand-side, anti-counterfeit)** + **Market Insight Industri Kreatif**.
> Live pilot: https://brandarmor.asynchronope.my.id

## Current hackathon phase

PR #8 introduced the durable pilot path:

- Clerk Organization-based admin/member workspace access.
- Neon persistence for brands, baselines, listings, investigations, review revisions, reports, audit events, and rate limits.
- Private case-asset routes, durable investigation stages, safe provider partial outcomes, and outcome-specific provenance.
- Separate risk score, evidence completeness, and confidence; missing evidence lowers certainty rather than becoming counterfeit risk.
- Human-in-the-loop review and versioned JSON reports.
- Marketplace-domain-qualified discovery with confirmation before case creation.
- Evaluation-label isolation and reviewed-holdout import foundation.

BrandArmor is **decision support for prioritized human review**. It is not automatic counterfeit detection, product-authenticity verification, legal advice, enforcement, or marketplace takedown automation.

## Current phase versus next phase

Read `docs/HACKATHON_SUBMISSION_SCOPE.md` before making product or submission claims. It separates pilot-delivered capabilities from explicitly deferred work, including rights-cleared flagship sourcing, independently reviewed holdout collection, production visual comparison, and expanded marketplace coverage.

## Agent handoff

For a production/hackathon handoff, read:

- `docs/HACKATHON_SUBMISSION_SCOPE.md`
- `docs/PILOT_ACCEPTANCE.md`
- `docs/PRODUCTION_NEON_SCHEMA_HOTFIX.sql`
- `HANDOFF.md`, `RUNBOOK.md`, `ARCHITECTURE.md`, `KNOWN_LIMITS.md`, `CHANGELOG.md`, and `VERSION_HISTORY.md`.

Do not treat stale seeded-demo/JSON architecture notes elsewhere in older documents as the pilot production architecture without reconciling them against the scope document.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3015/`, sign in to a pilot workspace, create a product baseline, then create a listing case. In pilot mode, `/demo` is a durable-workflow guide rather than the legacy seeded demo runner.

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

## Durable pilot flow

1. Sign in to a Clerk Organization workspace as an admin or member.
2. Register product truth: official sources/images, MSRP, seller information, keywords, and optional BPOM/NIE.
3. Create a listing from pasted text, a marketplace URL, or private screenshot intake.
4. Open the durable case workspace directly after save.
5. Start or resume the investigation. Intake, OCR, regulatory, visual, scoring, judge, review, and report stages persist independently.
6. Treat unavailable providers as explicit partial outcomes. Do not treat missing evidence as counterfeit evidence.
7. Reviewers update internal labels in the durable case; revisions persist across workspace members.
8. Download the current JSON evidence report when needed for internal review/handoff.
9. Use Evaluation only for reviewed holdout data. Accuracy metrics remain withheld until independently reviewed provenance-backed cases exist.

The legacy seeded demo remains available only for controlled/demo contexts. It is not the pilot production workflow.

## Agent Operating Model

BrandArmor uses small, focused agent-like workflow steps rather than a monolithic autonomous agent. `src/domain/investigation.ts` defines durable investigation runs, event appends, and compact context packs so future OCR, BPOM, visual, scoring, judge, report, and human-review flows can pause, resume, cite evidence, and expose missing proof.

## BPOM Search

Use `GET /api/regulatory/search?brand=Somethinc` to query the official BPOM cosmetics adapter directly. It accepts `brand`, `nie`, `productName`, and `length`, returns `source: "bpom_api"`, and uses `Cache-Control: no-store`.

The current demo seed includes two real BPOM-backed baselines:

- Somethinc: Calm Down PHA 3% Soothing Everyday Toner, `NA18261203080`, `Berlaku`.
- Gloglowing Skin Care: Baby Glow Lip Serum, `NA18251303192`, `Berlaku`.

## Integration Readiness

Use `GET /api/health/integrations` to see which env-backed integrations are configured and which are actually implemented in this MVP. `MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, and BPOM search have app paths. `BROWSER_USE_ENDPOINT` and `HF_API_TOKEN` are reported as roadmap/not implemented so proposal claims stay honest.

## Demo seed versus pilot data

Legacy seeded data may still support controlled/local demo contexts. It is not the durable pilot data plane. In `pilot` runtime, user-created brands, baselines, cases, reviews, reports, and private assets use Neon workspace persistence instead of `/tmp` JSON.

Do not use seeded demo records as evidence of production readiness or model accuracy.

## Current Verification

- App version: `0.5.0`.
- Automated tests: `222/222` passing on the latest PR #8 development branch at the time of documentation update.
- Core workflow verifier: `145/0` passing.
- Typecheck and production build pass.
- Production dependency audit: zero known production vulnerabilities.
- Browser black-box QA verified durable brand/baseline/listing/review/report behavior, private route denial while signed out, conservative scoring semantics, outcome-specific provider provenance, and no operational `groundTruth` leakage.
- The current hackathon pilot report format is JSON. Legacy PDF output should not be presented as a guaranteed pilot deliverable.
- Current production data is intentionally separate from Preview QA data and may begin with a different number of brands, listings, and review cases.

## Production database migration

Before enabling `BRANDARMOR_RUNTIME_MODE=pilot` on a new Production database, apply `docs/PRODUCTION_NEON_SCHEMA_HOTFIX.sql` to the Neon Production branch selected by `DATABASE_URL`. Missing these PR #8 tables causes brand, discovery, evaluation, and rate-limit routes to fail.


## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local app on `http://localhost:3015` |
| `npm run dev:3000` | Start local app on port 3000 |
| `npm run typecheck` | TypeScript verification |
| `BPOM_DISABLE_API=1 npm test` | Deterministic Vitest run without live BPOM dependency |
| `npm run build` | Production build |
| `npm run verify:env` | Environment diagnostics |

## Known limits and honest boundaries

- No claim of 100% counterfeit detection, product authenticity verification, legal conclusion, or automated enforcement.
- Search results are candidate leads and require user confirmation plus a product baseline.
- Private screenshot/provider paths can return a durable partial outcome when a provider is unavailable.
- Visual comparison remains explicitly unavailable until a production adapter is connected.
- BPOM/NIE results may require manual confirmation/link-out depending on available evidence/provider outcome.
- Accuracy claims are withheld until independently reviewed, provenance-documented holdout cases exist.
- Current pilot supports Clerk Organization workspace access, but broader organization onboarding/operational workflows remain next phase.
- Rights-cleared flagship cases and independent holdout collection are required before making real-world performance claims.

## Accuracy Evidence

The scoring output is a transparent routing signal, not a legal conclusion. Evaluation displays no operational accuracy claim until independently reviewed holdout data is imported. See `docs/PILOT_ACCEPTANCE.md` and `docs/HACKATHON_SUBMISSION_SCOPE.md`.

## Deployment Status

- Live pilot: https://brandarmor.asynchronope.my.id/
- GitHub: https://github.com/bO-05/brandarmor
- PR #8 introduced the durable pilot architecture and should be accompanied by the production schema hotfix before Production pilot runtime is enabled.
- Use a Vercel Shareable Link for browser-cloud QA of protected Preview deployments. Do not publish that tokenized URL.
- Production and Preview use separate data; do not expect Preview QA cases to appear automatically in Production.
- If Production shows missing-table errors such as `rate_limit_buckets` or `evaluation_cases`, apply `docs/PRODUCTION_NEON_SCHEMA_HOTFIX.sql` to the Neon Production branch, then redeploy.

## Quick Vercel Redeploy

If the live site shows stale code:
1. Go to https://vercel.com/dashboard
2. Open the `brandarmor` project
3. Deployments tab -> ... menu on latest commit -> "Redeploy"
4. Or: Settings -> Git -> Connected Git Repository -> ensure auto-deploy is on
