# Changelog

## v0.5.0 — Evidence-ready demo and review handoff

### Added

- A staged guided demo: core evidence is persisted before the evidence judge runs, with visible progress, elapsed time, and a safe retry path.
- Route-level duration limits and bounded provider calls for OCR, judge, discovery, regulatory search, visual comparison, and assessment paths.
- One-click evidence-report export in JSON and branded PDF formats.
- A typed report schema shared by both formats, including evidence IDs, provider provenance, score reasons, investigation trail, missing evidence, human review state, claim limits, and the legal disclaimer.
- A visible Investigation Trail that projects stored artifacts into ordered steps, missing evidence, suggested actions, and do-not-claim reasons.
- An in-product real/fallback/roadmap integration ledger and an explicit note that cost estimates are withheld until a verified rate card and durable usage ledger exist.
- A design-engineering audit based on Emil Kowalski’s interface and motion standards.

### Fixed

- Dashboard and status counts now consistently show the authoritative pilot fixture total instead of an ephemeral per-instance JSON count.
- Brands date rendering now uses Jakarta time deterministically, preventing server/client timezone hydration differences.
- New Listing labels are associated with controls through stable ids, names, and htmlFor attributes; the price error is announced through aria-describedby.
- The flagship visual signal now says roadmap/not run in demo when no inspectable reference pair exists rather than presenting a bare not_available result.
- Provider failures are compacted into safe messages instead of raw upstream errors.
- Mobile navigation no longer depends on a horizontally clipped strip, and the workflow trail uses a compact mobile pattern.

### Verification

- TypeScript typecheck passed.
- Vitest passed: 202/202 tests with BPOM_DISABLE_API=1.
- Production build passed.
- React Doctor v0.8.1 passed: 100/100.
- Five consecutive local demo runs completed under 1.4 seconds each with core evidence, mock judge fallback, JSON export, and PDF export all successful.

### Not included

- No deployment, merge, force-push, external report, marketplace submission, or enforcement action.
- No auth, database migration, tenant isolation, real visual embeddings, marketplace crawling, fourth LLM provider, or fabricated evaluation fixtures.
- Real OCR on the flagship listing remains conditional on a rights-cleared externally reachable image.
