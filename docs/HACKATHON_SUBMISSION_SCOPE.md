# BrandArmor Hackathon Submission Scope

## Current phase: durable pilot workflow

BrandArmor’s current hackathon submission demonstrates a claim-safe, evidence-backed pilot workflow for suspicious cosmetics and marketplace listings.

### Delivered in PR #8

- Clerk-authenticated admin and reviewer pilot roles.
- Workspace-scoped Neon persistence for brands, baselines, listings, investigations, reviews, reports, audit events, and rate-limit buckets.
- Durable investigation state with persisted intake, OCR, regulatory, visual, scoring, judge, review, and report stages.
- Shared case state across authenticated workspace sessions.
- Separate risk score, evidence completeness, and confidence; missing evidence lowers certainty rather than creating risk.
- `priority_review` terminology rather than automated enforcement.
- Private case-asset upload/storage routes with retention metadata and authenticated delivery.
- Outcome-specific provider provenance and safe partial-provider results.
- Review revisions and versioned/deletable reports.
- Marketplace-domain-qualified discovery with confirmation before case creation.
- Evaluation-label isolation and an independently reviewed holdout-data import foundation.
- Production-readiness black-box QA playbook and acceptance criteria.

## Current-phase limitations, shown honestly in the app

- Visual comparison is explicitly unavailable until a production adapter is connected.
- OCR/judge can return a clearly labeled partial or mock fallback when provider capability is unavailable.
- Evaluation accuracy claims remain withheld until independently reviewed holdout cases are imported.
- Production promotion is not claimed until the black-box production-readiness gates pass.

## Next phase

The following are deliberate next-phase work, not current-phase claims:

1. Rights-cleared real flagship and ambiguous cases with documented provenance.
2. Independently reviewed holdout dataset with reviewer evidence references and expanded metrics.
3. Production visual-comparison adapter for private case assets.
4. Full per-stage Inngest checkpoint decomposition and provider retry operations.
5. Organization invitation/member-management workflow beyond the Clerk organization switcher.
6. Broader marketplace-provider coverage and discovery-quality evaluation.
7. Final production promotion after a clean deployed-app QA GO result.
