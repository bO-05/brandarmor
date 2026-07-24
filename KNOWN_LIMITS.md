# Known Limits

## Current Limits

- Not production-ready.
- Evidence-report downloads are generated on demand and are not retained in object storage or an audit-grade report archive.
- No authentication.
- No tenant isolation.
- No connected or migrated pilot database. A Neon/Drizzle schema and tracked migration exist, but runtime routes still use local JSON until the authenticated cutover is complete.
- No object storage for screenshots, OCR artifacts, or reports. Private Vercel Blob is planned but not configured.
- No CI/CD pipeline in this package yet.
- No monitoring or alerting.
- No robust marketplace crawler.
- No legal enforcement workflow.
- No validated large labeled dataset.

## OCR Limits

Real OCR depends on `MISTRAL_API_KEY` and a public image URL that Mistral can fetch. OCR output is evidence, not truth. OCR can misread packaging, miss context, or fail on blocked images.

## LLM Judge Limits

The LLM judge is a reasoning helper over cited evidence. It must not be treated as a final authority. Anthropic uses structured tool output and falls back to Mistral, then mock, but all judge outputs remain advisory. When evidence is weak, the correct behavior is to say evidence is insufficient. Provider calls are bounded so the app can preserve the available core evidence and show a labeled fallback rather than wait indefinitely.

## Visual Similarity Limits

The current visual-match path is an adapter/mock evidence shape. When the flagship demo has no inspectable suspect/reference image pair, BrandArmor labels it as roadmap/not run rather than displaying a fake score or a bare broken state. It is not yet a production SigLIP, DINOv2, CLIP, or embedding-backed image retrieval system.

## BPOM Limits

BPOM/NIE search can query `cekbpom.pom.go.id` when the endpoint is reachable. Treat the result as strong registry evidence, but keep source URLs and human review in the evidence trail because public endpoints can change or temporarily fail.

## Demo Data Limits

The default product baselines include real Somethinc and Gloglowing BPOM cosmetics records. The suspect listings and mock OCR screenshots are synthetic demo evidence used to exercise the pipeline and are labeled through mock/real badges in the demo output.

On Vercel/serverless, the demo uses `/tmp` JSON persistence. Empty serverless stores are auto-seeded with deterministic IDs so judges see the same seeded workspace and deep links across instances. This improves demo reliability, but it is still ephemeral demo storage: manually added or changed data can disappear when the serverless instance recycles.

During remediation, set `BRANDARMOR_RUNTIME_MODE=controlled_demo` on the hosted deployment. This keeps seeded read paths available but blocks API mutations and provider-backed runs. Do not treat this guard as authentication, tenant isolation, or a production authorization model.

## Integration Env Limits

`MISTRAL_API_KEY`, `ANTHROPIC_API_KEY`, and `PERPLEXITY_API_KEY` are used by current app routes. `BROWSER_USE_ENDPOINT` and `HF_API_TOKEN` are intentionally reported as roadmap integrations by `/api/health/integrations`; do not claim Browser-Use or Hugging Face vision is implemented in v0.5.0.

Local shells can contain stale provider keys that override `.env.local`. Use `scripts/start-local.ps1` for production-like local runs because it explicitly reloads `.env.local`.

## Marketplace Limits

Discovery output is a candidate lead source. It is not guaranteed to represent complete or authoritative marketplace coverage. User-guided capture and imports are safer demo foundations than pretending full marketplace crawling is solved.

## Accuracy Limits

The current 50 authored fixtures are regression diagnostics, not a pilot validation set. Evaluation labels are kept outside operational listing, evidence, judge, and report paths; the operational evaluation response exposes diagnostic metadata and aggregate calculations only. Do not present precision, recall, F1, or a threshold as operational accuracy until a separately governed, provenance-documented holdout set exists.

## Correct Claim Discipline

Say:

> BrandArmor routes suspicious listings for evidence-backed review.

Do not say:

> BrandArmor confirms counterfeit products automatically.
