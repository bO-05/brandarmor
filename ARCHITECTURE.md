# BrandArmor v4 Architecture

## Product Shape

BrandArmor v4 is an evidence-first counterfeit risk review system. It does not try to prove counterfeiting automatically. It collects listing evidence, extracts signals, scores risk, asks a judge model to reason over cited evidence, and routes suspicious cases to human review.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Zod
- Vitest
- Local JSON-file persistence
- BPOM cosmetics search/check adapter
- Optional Mistral OCR
- Optional Anthropic or Mistral LLM judge

## Directory Map

- `src/app/`: pages and route handlers.
- `src/domain/`: core types, schemas, scoring, review transitions, imports.
- `src/domain/investigation.ts`: durable investigation event state and compact context packs for agent-style workflows.
- `src/persistence/store.ts`: local JSON-file store and demo seed data.
- `src/lib/mistral-ocr.ts`: OCR adapter and parsed packaging fields.
- `src/lib/regulatory-check.ts`: BPOM/NIE and regulatory signal inference.
- `src/app/api/regulatory/search/route.ts`: direct BPOM cosmetics search endpoint for brand/NIE/product-name queries.
- `src/lib/visual-compare.ts`: visual similarity adapter placeholder.
- `src/lib/llm-judge.ts`: evidence judge adapter; Anthropic uses forced tool-use structured output, then falls back to Mistral, then mock.
- `src/lib/demo-signals.ts`: mock/real provenance labels for one-click demo output.
- `src/lib/discovery-defaults.ts`: Gloglowing marketplace watch query defaults for candidate discovery.
- `src/lib/env.ts`: trims and normalizes env values so quoted `.env.local` values do not break provider calls.
- `src/evaluation/`: metrics and fixtures.
- `tests/`: Vitest and direct workflow verification tests.
- `scripts/`: local environment and Next trace helpers, including `start-local.ps1` for production-like local runs.

## Core Flow

1. Register or seed a brand and product baseline.
2. Add or import candidate listings.
3. Store raw listing fields as evidence records.
4. Run OCR on a listing image or screenshot when available.
5. Parse packaging fields such as BPOM/NIE, size, ingredients, and claims.
6. Infer regulatory and visual-match signals.
7. Compute deterministic risk score with traceable rule reasons.
8. Run the LLM evidence judge over the listing, product, score, OCR, and evidence.
9. Create or update a human review decision.
10. Show evaluation metrics from labeled fixtures.

## Persistence

The app writes JSON files under `.brandarmor-data/` by default. Tests use isolated temporary data directories.

When `VERCEL=1` or an AWS Lambda marker is present, relative `BRANDARMOR_DATA_DIR` values are ignored and the app writes under the platform temp directory (`/tmp/.brandarmor-data` on Vercel). This avoids serverless read-only filesystem failures.

This is intentional for demo portability. It should be replaced for production because it does not support concurrent writers, tenant isolation, query performance, backups, or audit-grade retention.

## Scoring And Evidence

The score is a routing signal from `src/domain/scoring.ts`. It should be presented as prioritization, not a legal conclusion.

Evidence traceability is preserved through evidence IDs. The judge should cite available evidence and say when evidence is insufficient.

## Agent Operating Model

BrandArmor should use small, focused agent-like workflow steps rather than a monolithic autonomous agent. Discovery, OCR, regulatory checks, visual comparison, scoring, judge assessment, report drafting, and human review should remain separate units with typed inputs, typed outputs, explicit provenance, and tests.

`src/domain/investigation.ts` provides the durable state shape for this direction. An `InvestigationRun` is an immutable event log for a listing review. `appendInvestigationEvent` records what happened, who or what produced it, which evidence IDs were involved, and whether the run should pause for human input. `buildInvestigationContextPack` creates a compact, evidence-aware context object for LLM prompts, reports, review screens, or automations.

The rule for any LLM-facing workflow is:

> cite evidence IDs, return missing-evidence gaps, and avoid final counterfeit claims without human review.

## Integration Policy

External services must be optional or fail clearly:

- Missing OCR key should not silently pretend to be real OCR for non-demo paths.
- Missing or invalid Anthropic judge credentials fall back to Mistral when configured, then to a mock judge only when the UI/report makes that clear.
- Anthropic judge output uses forced tool use; malformed text output still degrades to deterministic evidence fallback instead of a 500.
- BPOM API results should be labeled as real adapter hits; manual/linkout results should remain labeled as non-API evidence.
- Search/discovery output is candidate evidence, not verified marketplace truth.
- Env-backed integration readiness is exposed through `/api/health/integrations`; configured env does not imply a production integration unless `implemented: true`.

## Production Migration Path

1. Move persistence from local JSON to Postgres.
2. Add object storage for screenshots, OCR artifacts, and report exports.
3. Add authentication and tenant isolation.
4. Add audit logs for evidence and review decisions.
5. Add CI for typecheck, tests, lint, and build.
6. Add rate limits and monitoring.
7. Add real image embeddings only after a useful reference image set exists.
8. Build a labeled dataset before making accuracy claims.
