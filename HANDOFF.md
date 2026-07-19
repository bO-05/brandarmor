# BrandArmor v0.5.0 Handoff

## Read This First

This directory is the clean handoff package for the current best BrandArmor app. It is meant to be pushed to GitHub or handed to another coding agent without the messy historical workspace.

Start here:

1. `AGENTS.md` for project-specific coding-agent rules.
2. `MEMORY.md` and `ERRORS.md` for durable decisions and repeated failed approaches.
3. `docs/SOURCE_LEARNING_MAP.md` for the source-to-decision audit trail.
4. `docs/BRANDARMOR_OPERATING_SYSTEM.md` for first principles and source-to-product mapping.
5. `docs/PRODUCTION_AGENT_ARCHITECTURE.md` for the 12-factor agent architecture.
6. `docs/ML_AI_ROADMAP.md` for the scientific ML/AI path.
7. `docs/CODEX_WORKING_PROTOCOL.md` for how agents should work in this repo.
8. `README.md` for the short product overview.
9. `RUNBOOK.md` for install, test, and demo commands.
10. `ARCHITECTURE.md` for the code map, pipeline, and agent operating model.
11. `KNOWN_LIMITS.md` before making claims about production readiness.
12. `VERSION_HISTORY.md` only when context from v1-v4 is needed.

## Honest Current State

BrandArmor v0.5.0 is a demo-grade evidence-first suspicious listing review app for marketplace listings. It includes a guided cold-user dashboard path, a staged evidence demo, a listing evidence workspace, evidence records, deterministic scoring, OCR artifacts, regulatory/BPOM-NIE signals, explicit visual roadmap states, structured LLM evidence judge output, internal human review decisions, projected investigation trails, JSON/PDF evidence reports, and evaluation metrics.

The current deployed demo is no longer supposed to open as an empty workspace on public Vercel domains. Serverless temp stores auto-seed the demo dataset when empty, and the seeded IDs are deterministic so deep links resolve across instances.

It is not production-ready. It does not yet have authentication, tenant isolation, production database storage, object storage, CI/CD, monitoring, robust marketplace crawling, or a validated real-world labeled dataset.

## Main Claim To Preserve

Use this claim:

> BrandArmor prioritizes suspicious marketplace listings using auditable product evidence, OCR-visible signals, transparent scoring, human review labels, and measurable evaluation metrics.

Do not claim:

> Fully automatic counterfeit detection, guaranteed authenticity verification, legal proof of counterfeiting, marketplace-wide enforcement, or production readiness.

## What Is Real

- Next.js 15 App Router app.
- Local JSON-file persistence with atomic writes.
- Product and listing intake.
- Evidence records tied to listings.
- Durable investigation event/context model in `src/domain/investigation.ts`.
- OCR integration path through Mistral.
- Deterministic risk scoring with traceable reasons.
- Regulatory/BPOM-NIE inference checks.
- LLM evidence judge integration path through Anthropic or Mistral.
- Human review decisions.
- Guided dashboard/status start, single guided demo action, consolidated ambient status endpoint, task-oriented empty states, action-first listing workspace, baseline-gated listing pipeline, case brief, claim-safe media preview, baseline explanation copy, inline review decision panel on listing detail, confirmation-based internal label saves, post-review next-step guidance, responsive app shell, internal review queue counts, touch-accessible glossary help, plain-language evaluation readout, grouped manual intake, and sample-assisted JSON import.
- Route pages use server `page.tsx` wrappers for metadata and colocated `page-client.tsx` files for interactive UI where needed.
- React Doctor v0.8.1 reports `No issues found` and `100/100` in the current local verification.
- Evaluation metrics and test coverage.
- `200/200` automated tests passing in the v0.5.0 local verification, plus a successful JSON/PDF report route test and five local staged-demo/report runs.
- Real BPOM-backed Somethinc and Gloglowing product baselines in demo seed data.
- Vercel/serverless demo auto-seeding for empty `/tmp` stores.
- Deterministic seeded demo IDs, including stable listing deep links such as `/listings/seed0000000060`.

## What Is Mock Or Demo-Safe

- The one-click demo can use mock OCR when no `MISTRAL_API_KEY` is present or when the image URL is an `example.com` placeholder.
- Visual similarity is an adapter/mock evidence shape, not a real embedding-backed vision model.
- Discovery is candidate lead generation, not authoritative marketplace crawling.
- Local JSON persistence is demo-safe, not multi-user production storage.
- Vercel/serverless `/tmp` persistence is auto-seeded for demo reliability, but remains ephemeral and not production storage.
- Browser-Use and Hugging Face env entries are roadmap markers, not implemented app paths in v0.5.0.

## What The Next Agent Should Do First

1. Run `npm install`.
2. Run `npm run typecheck`.
3. Run tests with `BPOM_DISABLE_API=1`.
4. Run `npm run build`.
5. Run `npx react-doctor@latest --verbose` with Node `20.19.0+` and confirm `100/100`.
6. Start with `npm run dev`.
7. Open `http://localhost:3015/`.
8. Use `Start` for workspace status, then click `Run Demo` / `Run Demo Pipeline`.
9. Open the generated listing and confirm the top next-action band, case brief, PDF/JSON report controls, investigation trail, media preview, baseline-gated pipeline, inline review decision panel, full evidence workspace disclosure, internal review queue counts, and evaluation summary still use evidence-backed review language.
10. For production-like local testing on port 3000, run `.\scripts\start-local.ps1`; this reads `.env.local` explicitly and avoids stale parent shell API keys.
11. For deployed verification, use `https://brandarmor.asynchronope.my.id/` or `https://brandarmor.vercel.app/`, confirm `/api/health/demo-readiness` has `demoReady: true`, and open `/listings/seed0000000060`.
12. Do not use protected Vercel project aliases as judge links; they can show Vercel auth instead of the app.
13. Record any blocker in a new issue or handoff note instead of silently changing claims.

## Suggested Next Implementation Priority

1. Review and deploy v0.5.0 only after the pull request is approved; repeat public smoke checks after deployment.
2. Collect a rights-cleared, externally reachable flagship image before enabling real OCR for the recorded demo.
3. Add provenance-documented harder evaluation cases only after the source records and labels are reviewable; do not fabricate cases to reach a numeric target.
4. Replace JSON persistence with Postgres or a similarly durable store.
5. Add auth and tenant isolation.
6. Add real image similarity only after official reference images and a labeled visual dataset exist.
