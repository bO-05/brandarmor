# BrandArmor Memory

## 2026-05-31 - Deployed Demo Reliability

What was decided:
The hackathon deployment must show the same full-featured seeded demo that local reviewers see. Vercel/serverless empty stores now auto-seed the demo dataset, and seeded IDs are deterministic so public listing deep links resolve across instances.

Why:
Vercel `/tmp` storage is ephemeral and per-instance. Without auto-seeding, judges could see an empty app. Without deterministic seed IDs, a listing link created on one serverless instance could intermittently fail on another instance with `Listing not found`.

What was rejected:
Calling `/tmp` persistence production storage, disabling demo seeding for the hackathon deployment, relying on protected Vercel project aliases as judge URLs, or claiming the app automatically proves counterfeits.

Next:
Use `https://brandarmor.asynchronope.my.id/` or `https://brandarmor.vercel.app/` for judging. Keep `/api/health/demo-readiness`, `/api/listings`, and `/listings/seed0000000060` in deployed smoke checks until production storage replaces JSON persistence.

## 2026-05-30 - React Doctor Quality Pass

What was decided:
BrandArmor should keep the Next.js App Router pages claim-safe while also satisfying React Doctor's current React/Next quality checks. Route pages now use server wrappers with metadata where needed and delegate interactive surfaces to `page-client.tsx` modules. Listing detail state is reducer-backed and the large listing workspace render was split into focused sections without changing product claims, persistence, scoring, provider behavior, or review semantics.

Why:
The app needed a clean `npx react-doctor@latest` result before further feature work. The initial scan reported 228 issues and an 83/100 score. The final scan reports `No issues found` and `100/100`, while `npm run typecheck`, `BPOM_DISABLE_API=1 npm test`, and `npm run build` all pass.

What was rejected:
Deleting reachable source files to satisfy `deslop/unused-file`, broad rule suppression, changing product doctrine, changing review labels, changing storage, adding new data libraries, or claiming production readiness. A narrow `react-doctor.config.json` override was used only for reachable app/test files that the analyzer misclassified as unused.

Next:
Keep route-level metadata in server `page.tsx` files and put interactive page logic in colocated `page-client.tsx` files. Run React Doctor with Node `20.19.0+` or the installed Node `22.22.0` path when checking this repo.

## 2026-05-24 - Straightforward Use UX Consolidation

What was decided:
BrandArmor should make the cold-user and reviewer next action unmistakable before showing dense evidence details. `/` remains the status/start surface, `/demo` is explicitly the guided pipeline action, sidebar/workflow status now uses a single consolidated status endpoint, listing detail starts with a next-action band, and detailed workflow metadata sits behind a full evidence workspace expansion. Review queue now frames total/pending/labeled work, evaluation leads with plain-language reviewer workload, manual intake is grouped for desktop, and JSON import offers a sample that includes `productId`.

Why:
Consolidated agent feedback showed the app was useful but still asked first-time users to infer too much: Dashboard vs Demo ambiguity, dense listing detail sections, no queue count framing, ML-heavy evaluation language, brittle JSON import, and long manual intake. The changes keep claim discipline while reducing the "what do I do next?" burden.

What was rejected:
Batch review shortcuts, a trust-this-session toggle, full mobile drawer navigation, schema changes, scoring changes, provider changes, persistence changes, production storage claims, external reporting, seller contact, enforcement actions, and automatic counterfeit conclusions.

Next:
If review volume becomes the next priority, design batch review controls and keyboard navigation as a separate Lane 5 task with explicit safety rules for lower-stakes vs terminal labels. Treat full mobile navigation drawer as a separate responsive navigation task.

## 2026-05-24 - Ambient Usability Status Pass

What was decided:
BrandArmor should surface cross-page next-action status instead of requiring users to inspect each page: sidebar badges now flag listing setup/evidence gaps, pending review count, and pilot evaluation limits; the workflow trail now summarizes the current next action; listing detail keeps technical score/evidence details collapsed by default; baseline linking shows the selected product context before running the pipeline; evaluation metrics display a stronger pilot-only warning below the 200-case roadmap floor.

Why:
Two usability reviews agreed the guided demo path is clear, but cold users and returning reviewers still needed more ambient "what should I do next?" cues. The improvement keeps the evidence-backed review claim intact while making gaps visible sooner.

What was rejected:
Keyboard shortcuts, backend persistence changes, schema changes, scoring changes, new ML/vision claims, automatic enforcement, marketplace reports, seller contact, legal conclusions, and a broad visual redesign.

Next:
If review volume becomes the priority, revisit keyboard shortcuts and denser batch-review controls as a separate Lane 5 task.

## 2026-05-24 - Manual Path Usability And Recovery Pass

What was decided:
BrandArmor should keep the guided demo reachable from the primary sidebar while making manual listing intake and JSON import less brittle for cold users. Returning workspaces should show one dominant continue path, manual listings should explain that a product baseline is optional for intake but required for the evidence pipeline, price entry should validate IDR input client-side, and JSON import should catch syntax errors before submitting to the API. Listing workspaces should show reviewer-readable source, source-confidence, pilot-label, and visual-comparison language instead of raw storage terms.

Why:
The guided demo path was already clear, but users who left that path could still hit dead ends: no sidebar route back to `/demo`, competing dashboard calls to action, baseline-gated pipeline buttons without enough setup recovery, silent invalid price parsing, and server-only JSON syntax feedback.

What was rejected:
Changing domain schemas, scoring behavior, review status values, provider contracts, persistence, production storage claims, automatic counterfeit confirmation, external reporting, enforcement actions, or adding a mobile drawer in this pass.

Next:
Future UX work can revisit mobile navigation as a separate scoped task. Keep manual/import flows claim-safe and continue validating user input before network requests where practical.

## 2026-05-24 - Reviewer Cockpit Usability Pass

What was decided:
BrandArmor should let reviewers apply internal labels from the listing workspace once a review item exists, while keeping the review queue for batch work. Review labels now require an explicit confirmation step and shared claim-safe copy before saving. The primary navigation starts from the dashboard rather than treating `/demo` as a second top-level entry, and glossary help must work on touch devices instead of relying on hover-only title tooltips.

Why:
The prior guided path was clear for demos, but users still had to leave the evidence workspace to label a case, mobile term help was easy to miss, and review labels applied too quickly for a high-stakes domain. The better workflow is a reviewer cockpit: case brief, media, evidence progress, and internal decision close together.

What was rejected:
Changing review status schemas, score logic, provider behavior, persistence, production storage claims, automatic counterfeit confirmation, external reporting, seller contact, marketplace submission, or enforcement actions.

Next:
Future report export should reuse the same explicit confirmation and claim-safe internal-review language before any external use.

## 2026-05-24 - Cold-User Visual And Review Guidance Polish

What was decided:
BrandArmor's listing workspace should show a claim-safe visual anchor near the case brief, even when demo data only has placeholder media URLs. Product baseline linking now explains that a baseline is official product truth used for comparison, not a change to the source listing or proof of counterfeiting. Review labels should use cold-user-readable wording while preserving the existing internal `ReviewStatus` values, and successful review actions should offer clear next steps without implying external reports or enforcement.

Why:
The previous cold-user pass made the happy path clear, but the core workspace still lacked visual anchoring, baseline linking was too conceptual, and the review queue stopped at a toast after labels were applied. Mobile rendering also needed a responsive app shell so the listing workspace was usable at small widths.

What was rejected:
Changing persistence, review status schemas, provider contracts, scoring behavior, production image retrieval claims, or real vision-model claims.

Next:
Future media work should use real user-provided or provenance-backed images when available and keep demo placeholders visibly labeled. Report export should reuse the same internal-review, evidence-citation, and human-approval language.

## 2026-05-23 - Cold-User Friction Reduction

What was decided:
BrandArmor's demo path should show fewer top-level doors and make the next action unmistakable. The sidebar now prioritizes Demo, Listings, Review Queue, and Evaluation, while Dashboard, Brands, and Discovery sit under setup tools. Listing detail should block the evidence pipeline until a product baseline is linked, then show workflow status before technical evidence.

Why:
The previous stakeholder UX still exposed too much at once: a dense listing workspace, a baseline gate that could be missed, terminal startup copy inside the running app, and a wall of alternate review labels. Cold users need a guided path before expert controls.

What was rejected:
Removing power-user routes, changing provider/scoring behavior, adding production claims, and using score output to suggest confirmed counterfeit labels.

Next:
Future UX work should keep advanced evidence records, raw threshold tables, and setup tools available through progressive disclosure. Report export should follow the same action-first, claim-safe pattern.

## 2026-05-23 - Focused Stakeholder UX Pass

What was decided:
BrandArmor's next usability layer should optimize the first stakeholder demo path: Start/Demo, listing case brief, guided internal label, and plain-language evaluation. The app now leads with advisory summaries before technical tables or advanced evidence controls.

Why:
The previous workflow was usable for someone who already understood BrandArmor, but a first-time stakeholder needed stronger scaffolding around why a listing was routed, what evidence is missing, and which internal action is safest.

What was rejected:
A full visual redesign, production storage/provider changes, automatic enforcement language, and score-driven "confirmed" labels.

Next:
Use the case brief and guided review label as the pattern for future report export or reviewer workflow work. Keep raw evidence and technical metrics available, but behind progressive disclosure when the audience is not tuning thresholds.

## 2026-05-23 - Cold-User UX Upgrade

What was decided:
BrandArmor's first screen should guide a cold user into one complete evidence review before exposing the rest of the app. The dashboard is now the start-here hub, `/demo` remains the guided pipeline runner, listing detail is the evidence workspace with one recommended pipeline and advanced rerun controls, review actions are internal human labels, and evaluation leads with a readable pilot summary before the raw metrics table.

Why:
The app was functional for users who already understood the system, but the first-time experience did not explain the Brand -> Product -> Listing -> Evidence -> Score -> Judge -> Review chain clearly enough. The stronger product path is to make the evidence workflow obvious while preserving claim discipline.

What was rejected:
A full backend/provider redesign, a heavy wizard that would hide the evidence workspace, and UI language that implies automatic counterfeit proof, production image retrieval, external reporting, or enforcement.

Next:
Keep future UI work anchored to the guided evidence workflow. If report export is added, it should preserve the same internal-review language, cite evidence IDs, show missing evidence, and require explicit human approval before any external use.

## 2026-05-22 - Agent Operating Model

What was decided:
BrandArmor should adopt an evidence-first, small-agent operating model. The app should use durable investigation events and compact context packs rather than a monolithic autonomous agent.

Why:
The product needs auditability, measurable review quality, and claim discipline. A single broad agent would make it harder to test, debug, pause for human review, and explain why a listing was routed.

What was rejected:
Fully automatic counterfeit detection, automatic enforcement, unbounded marketplace crawling, and production claims based only on LLM judgment.

Next:
Use the investigation event/context model as the durable state foundation for future OCR, BPOM, visual, score, judge, report, and human review workflows.

## 2026-05-22 - BrandArmor Operating System Scaffold

What was decided:
BrandArmor needs a durable operating scaffold, not just a few agent files. The scaffold now lives in:

- `docs/BRANDARMOR_OPERATING_SYSTEM.md`
- `docs/PRODUCTION_AGENT_ARCHITECTURE.md`
- `docs/ML_AI_ROADMAP.md`
- `docs/CODEX_WORKING_PROTOCOL.md`
- `docs/SOURCE_LEARNING_MAP.md`

Why:
The source material points to the same conclusion from different angles. Production LLM software needs owned prompts, owned context, small focused agents, pause/resume, human approval gates, scientific evaluation, software-law discipline, and persistent project memory.

What was rejected:
Treating BrandArmor as a single autonomous agent, jumping directly to deep learning without labeled evidence, optimizing for takedowns, and relying on chat memory instead of repo-level doctrine.

Next:
Future feature work should identify its work lane, preserve claim discipline, and update memory when it changes durable product or architecture decisions.
