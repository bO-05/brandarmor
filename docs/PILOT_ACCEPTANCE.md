# BrandArmor Pilot Acceptance Checklist

PR #8 remains unmerged until every applicable item below is evidenced on the Preview deployment.

## Required environment readiness

- Clerk Preview keys and an active Organization are configured.
- Preview `DATABASE_URL` points to the Neon Preview branch.
- A private Vercel Blob store is connected to Preview.
- Inngest is connected and `/api/inngest` is synced.
- Provider keys are configured only when live provider execution is desired.

## Durable workflow

1. An admin creates a brand and baseline.
2. The admin creates a listing with a private screenshot.
3. The investigation reaches persisted intake, OCR, regulatory, visual, scoring, judge, review, and report stages.
4. Refreshing the browser retains the same stages, evidence, score, review, and report.
5. A member in the same Organization sees the same case and can save a review decision.
6. A provider outage creates a persisted partial result with a safe explanation.
7. No screenshot is exposed through a public Blob URL.
8. The report remains free of evaluation labels and ground-truth fields.
9. Missing evidence lowers completeness/confidence and does not create counterfeit risk by itself.

## Credibility data required before an accuracy claim

For each independently reviewed holdout case, import the following through the admin evaluation API:

- `datasetVersion`
- `externalCaseId`
- listing and optional baseline snapshots
- independently reviewed label
- reviewer evidence reference
- provenance record describing source rights and review method
- ambiguity flag
- review timestamp

Do not import evaluation labels into operational listing, evidence, scoring, judge, or report routes. Metrics remain withheld until at least 30 reviewed cases are imported.

## Rights-cleared demonstration cases

Prepare two cases with documented permission or lawful provenance:

- One flagship case with real listing content and privately uploaded images.
- One ambiguous case where the correct outcome is `needs_more_evidence` or another non-counterfeit conclusion.

Record source rights, collection date, and reviewer evidence reference for both.