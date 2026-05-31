# BrandArmor Agent Instructions

## Product Claim

BrandArmor routes suspicious marketplace listings for evidence-backed review. It does not automatically confirm counterfeits, legal violations, or marketplace-wide enforcement outcomes.

Preserve this claim discipline in code, UI copy, docs, demos, and reports.

## Current App

- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Zod, Vitest.
- Domain: skincare/cosmetics marketplace listing risk review.
- Core proof unit: evidence records tied to listings, product baselines, source metadata, scores, judge assessments, and human review decisions.
- Current persistence: local JSON files for demo portability. On Vercel/serverless, empty temp stores auto-seed the demo dataset with deterministic IDs; do not present this as production storage.
- Current vision path: adapter/mock visual evidence. Do not claim SigLIP, DINOv2, CLIP, or production image retrieval is implemented until it exists and is tested.

## Default Behavior

- Read `docs/SOURCE_LEARNING_MAP.md`, `docs/BRANDARMOR_OPERATING_SYSTEM.md`, `docs/PRODUCTION_AGENT_ARCHITECTURE.md`, `docs/ML_AI_ROADMAP.md`, `docs/CODEX_WORKING_PROTOCOL.md`, `HANDOFF.md`, `RUNBOOK.md`, `ARCHITECTURE.md`, `KNOWN_LIMITS.md`, `VERSION_HISTORY.md`, `MEMORY.md`, and `ERRORS.md` before significant work.
- Pick a work lane from `docs/CODEX_WORKING_PROTOCOL.md` before changing files.
- Keep changes scoped to the requested task.
- Do not refactor unrelated files.
- Do not rename, reorganize, delete, or rewrite code outside the task without explicit approval.
- Flag uncertainty before acting on it.
- Prefer deterministic code, typed schemas, and tests over broad agent prompts.
- Treat LLM output as advisory unless it cites evidence IDs and passes validation.
- If the task changes durable product doctrine, update `MEMORY.md`.

## Evidence And Agent Rules

- Use small, focused agent-like steps: discovery, OCR, regulatory check, visual comparison, scoring, judge assessment, report drafting, and human review.
- Keep execution state and business state close together. Prefer event logs and context packs over hidden orchestration state.
- Structured model output must be validated and must degrade to `insufficient_evidence` when citations or evidence are missing.
- High-stakes actions require human approval in the current session: enforcement, marketplace reports, emails, public sharing, data deletion, dependency removal, and production deployment.
- If an operation fails repeatedly, log the failed approach in `ERRORS.md`.
- After significant product or architecture decisions, update `MEMORY.md`.

## ML And Evaluation Rules

- Start with deterministic baselines and labeled data.
- Do not introduce deep learning, time-series forecasting, Bayesian scoring, or bandit/RL logic without a dataset statement and baseline comparison.
- Model outputs must expose uncertainty, reviewer usefulness, and failure modes.
- Never optimize for takedowns or accusations. Optimize for evidence quality, reviewer precision, review burden, and safe escalation.

## Verification

Run the smallest relevant checks first, then broader checks before claiming completion:

```powershell
npm run typecheck
$env:BPOM_DISABLE_API="1"
npm test
npm run build
```

If a check cannot be run, say exactly which check was skipped and why.
