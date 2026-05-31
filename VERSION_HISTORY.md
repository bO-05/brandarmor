# Version History For Agents

## v1

The original deployed MVP lived under `app-v1/brandarmor-ai-replit`. It used Next.js with Browser-Use, Exa, Mistral, Neon, and Upstash patterns. It proved the product concept: scan listings, score risk, and show potential violations.

Do not use v1 as the active app. Use it only as historical reference for product logic, copy, and integration direction.

## v2

v2 produced the PIDI/Digdaya-aligned proposal and a demo scaffold. It clarified the Indonesian creative economy/IP protection framing and created a mockable Next.js app foundation.

Do not use v2 as the active app unless you are specifically comparing proposal/demo scaffold decisions.

## v3

v3 shifted the app toward evidence-driven review. It added local durable JSON data, manual/import intake, evidence records, deterministic scoring, review states, and evaluation metrics.

v3 is architecturally important because it moved away from fragile scraping as the entire foundation.

## v4

v4 is the current best app. It extends the evidence system with OCR, regulatory/BPOM-NIE signal extraction, calibrated scoring, LLM evidence judge output, human review, and evaluation workflow.

Use this clean package as the working codebase.

## v4.2

v4.2 replaces the fictional demo seed with Somethinc and Gloglowing BPOM-backed baselines, adds `GET /api/regulatory/search` for live BPOM cosmetics queries, shows mock/real provenance badges in the one-click demo, and sanitizes provider failures into explicit fallback output.

The local working copy also adds `/api/health/integrations`, a Gloglowing discovery default query, configurable OCR model routing, quote-safe env parsing, Anthropic structured tool-use judge output, real Mistral judge fallback, and deterministic mock fallback only as the final fallback.

It also hardens persistence for Vercel/AWS-style serverless runtime: relative `BRANDARMOR_DATA_DIR` values copied from local `.env` files are ignored under `VERCEL=1`, so production writes stay under the platform temp directory (`/tmp/.brandarmor-data` on Vercel).

That v4.2 checkpoint had `137/137` automated tests passing. `scripts/start-local.ps1` was added for production-like local runs that explicitly load `.env.local` and avoid stale parent shell API keys.

## v4.3 Direction

v4.3 starts the evidence-first agent operating model. It adds project-level agent instructions, durable decision/error memory files, and `src/domain/investigation.ts` for immutable investigation events and compact context packs.

The goal is not a monolithic autonomous agent. The goal is a typed, testable foundation where discovery, OCR, BPOM checks, visual comparison, scoring, LLM judge output, report drafting, and human review can be paused, resumed, audited, and evaluated independently.

## v4.3 UX Upgrade

The local app now prioritizes cold-user usability without changing the persistence model or provider contracts. The dashboard separates empty-workspace onboarding from returning-user review, `/demo` leads with the one-click pipeline path, listing detail is case-brief first with a required-action baseline gate, review queue uses one suggested-label action plus an alternate-label picker, and evaluation is summary-first before the raw threshold table.

The UI copy was tightened around the product claim: scores route cases for review, visual comparison remains adapter/mock, raw `enforce` actions are presented as approval escalation, and no screen should imply automatic counterfeit proof or marketplace enforcement.

The latest cold-user polish adds a claim-safe media preview, baseline explanation panel, friendlier internal review labels, post-review next-step guidance, improved empty/recovery actions, clearer setup navigation, and a responsive app shell for mobile listing review.

The reviewer cockpit pass makes the listing workspace actionable after evidence is ready: reviewers can apply an internal label from the listing page through a shared confirmation-based review panel, while `/review` remains the batch queue. The primary navigation now starts at the dashboard (`Start`) instead of treating `/demo` as a second top-level door, glossary help works through click/focus instead of hover-only `title` text, and review/evaluation empty states explain which prerequisite is missing.

The straightforward-use consolidation pass clarifies `/` as the workspace status/start surface and `/demo` as the guided pipeline action. Sidebar and workflow trail status now use a single `/api/status` endpoint. Listing detail starts with a top next-action band and moves dense progress/metadata/provider rerun/evidence records behind a full evidence workspace disclosure. Review queue now shows total, pending, and labeled counts; evaluation leads with reviewer workload and useful-review share; manual intake groups related fields on desktop; JSON import includes a `Load sample JSON` action with `productId`; and the mobile sidebar strip is hardened against overflow while a full drawer remains future work.

The latest local verification has `181/181` automated tests passing, `npm run typecheck` passing, `npm run build` passing, and HTTP smoke checks returning 200 for `/`, `/demo`, `/listings/new`, `/listings/import`, a linked listing detail page, `/review`, and `/evaluation`.

## v4.3 React Doctor Quality Pass

The local app now has a clean `npx react-doctor@latest` scan: `No issues found` and `100/100` on `react-doctor` v0.2.14. The pass added route-level metadata through server `page.tsx` wrappers, moved interactive route bodies into colocated `page-client.tsx` modules, replaced remaining mount-time page data fetches with server-provided initial data where practical, added reducer-backed state for clustered review/evaluation/listing workflows, improved control labels and button types, and split listing detail into focused render sections.

The pass intentionally did not change product claims, scoring logic, review status semantics, provider contracts, persistence, or mock/real integration labeling. `react-doctor.config.json` contains narrow `deslop/unused-file` overrides for reachable app/test modules that the analyzer classified incorrectly.

Verification for this checkpoint:

- `npx react-doctor@latest --verbose`: `No issues found`, `100/100`.
- `npm run typecheck`: passing.
- `BPOM_DISABLE_API=1 npm test`: `181/181` tests passing.
- `npm run build`: passing.

## v4.3 Deployed Demo Reliability Pass

PR #1 (`cecadf2`) added serverless demo auto-seeding so empty Vercel `/tmp` stores repopulate before hackathon judges see an empty workspace. PR #2 (`c5059bd`) made seeded demo IDs deterministic so seeded deep links resolve across serverless instances instead of intermittently showing `Listing not found`.

The public judge-safe domains are:

- `https://brandarmor.asynchronope.my.id/`
- `https://brandarmor.vercel.app/`

The protected Vercel project/preview aliases should not be used as judge links because they can show Vercel authentication instead of the app.

Verification for this checkpoint:

- `npm run typecheck`: passing.
- `BPOM_DISABLE_API=1 npm test`: `181/181` tests passing.
- `npm run build`: passing.
- Public `/api/health/demo-readiness`: `demoReady: true`, 2 brands, 2 products, 7 listings.
- Public `/api/listings`: stable deterministic seeded IDs, including `seed0000000060`.
- Public `/listings/seed0000000060`: hydrated listing workspace loads without `Listing not found`.

## Strategic Learning

The strongest product thesis is not "AI proves counterfeits." The stronger thesis is:

> BrandArmor helps brands prioritize suspicious listings using auditable evidence and measurable review workflows.

Keep BrandArmor broad enough for Indonesian creative IP protection, but use cosmetics/skincare packaging evidence as the strongest proof-of-concept vertical.
