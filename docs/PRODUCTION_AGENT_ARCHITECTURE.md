# BrandArmor Production Agent Architecture

This document maps 12-factor agent principles to concrete BrandArmor design.

The goal is production-grade LLM-powered software, not a free-running autonomous agent.

## Core Rule

Agents propose. BrandArmor disposes.

The model may propose structured next steps, extract evidence, summarize uncertainty, or draft a report. Deterministic code owns validation, state transitions, permissions, retries, and persistence.

## Agent Units

### 1. Discovery Agent

Purpose:
Find candidate marketplace listings.

Inputs:
Product baseline, marketplace, query defaults, optional brand watch settings.

Outputs:
Candidate listings with source confidence and limitations.

Must not:
Claim that search results are exhaustive or authoritative.

### 2. Evidence Capture Agent

Purpose:
Normalize listing URL, title, price, seller, screenshots, image URLs, and raw source metadata.

Outputs:
Evidence records and listing metadata.

Must not:
Overwrite source data without preserving raw values.

### 3. OCR Extraction Agent

Purpose:
Run OCR and parse packaging fields.

Outputs:
OCR artifact, parsed BPOM/NIE, size, expiry, batch, ingredients, claims, suspicious terms.

Must not:
Treat OCR as truth.

### 4. Regulatory Agent

Purpose:
Check BPOM/NIE against official evidence.

Outputs:
Regulatory check with provider, source URL, status, matched brand/product, duration, and notes.

Must not:
Hide provider failures or claim registry certainty when only manual link-out exists.

### 5. Visual Comparison Agent

Purpose:
Compare suspect image evidence against official product references.

Outputs:
Visual match evidence with provider, reference set, similarity score, status, and summary.

Must not:
Claim real embedding retrieval while using mock or token fallback logic.

### 6. Scoring Agent

Purpose:
Compute deterministic routing score and transparent reasons.

Outputs:
Score, confidence band, triggered rules, calibrated features.

Must not:
Convert score into legal truth.

### 7. Evidence Judge Agent

Purpose:
Assess the evidence bundle and identify supported reasons, contradictions, missing evidence, and next action.

Outputs:
Structured judge assessment.

Must cite:
Evidence IDs.

Must return:
`insufficient_evidence` when citations or proof are weak.

### 8. Review Agent

Purpose:
Prepare the case for human review, collect reviewer status, and preserve reviewer notes.

Outputs:
Review decision.

Must not:
Finalize high-stakes actions without human confirmation.

### 9. Report Agent

Purpose:
Draft an evidence report for internal review.

Outputs:
Report draft with citations, limitations, and do-not-claim section.

Must not:
Send, publish, or submit the report automatically.

## Control Flow

BrandArmor should use explicit state transitions:

```text
candidate_created
  -> evidence_collected
  -> ocr_completed | ocr_failed
  -> regulatory_checked | regulatory_unavailable
  -> visual_compared | visual_unavailable
  -> score_computed
  -> judge_assessed
  -> human_input_requested
  -> human_reviewed
  -> report_drafted
```

These are investigation events, not hidden worker state.

## Context Packs

LLM prompts should receive compact context packs:

```text
case_goal
product_baseline_summary
listing_summary
evidence_ids
regulatory_status
visual_status
score_summary
recent_events
missing_evidence
allowed_actions
do_not_claim_reasons
```

Do not pass entire raw histories unless needed. Context must be dense, relevant, and safe.

## Prompt Ownership

Prompts should be treated as code:

- versioned in the repo
- named by task
- typed input and output
- tested with fixtures
- evaluated after real reviewer feedback

Avoid framework-owned invisible prompts for core product decisions.

## Tool Calls As Structured Outputs

Every LLM action proposal should be a typed object:

```ts
type InvestigationAction =
  | { intent: "run_ocr"; listingId: string; imageUrl: string }
  | { intent: "check_regulatory"; listingId: string; extractedNie: string | null }
  | { intent: "request_human_input"; question: string; urgency: "low" | "medium" | "high" }
  | { intent: "draft_report"; listingId: string; evidenceIds: string[] }
  | { intent: "done_for_now"; reason: string };
```

The output is not execution. Deterministic code decides whether to execute, pause, reject, or request approval.

## Pause And Resume

Pause when:

- provider jobs are long-running
- evidence is missing
- a high-stakes action is proposed
- repeated provider failures occur
- reviewer input is required

Resume from:

- human response
- OCR result
- BPOM result
- visual job result
- scheduled watch event
- corrected imported data

## Error Compaction

Provider and model errors should be summarized:

```text
provider: mistral_ocr
operation: process_image_url
attempts: 2
failure_class: blocked_image_url
safe_summary: Provider could not fetch the image URL.
next_action: request public screenshot upload or manual evidence.
```

Avoid dumping long stack traces into LLM context. Preserve raw errors in logs where appropriate.

## Production Readiness Checklist

- Each agent unit has typed input and output.
- Each unit can run independently in tests.
- Each unit records evidence or an explicit unavailable status.
- Each LLM output is validated.
- Each high-stakes action has a human approval gate.
- Each provider failure has explicit fallback behavior.
- Context packs are reproducible from persisted state.
- Metrics report dataset size and threshold behavior.
- Mock, adapter, and real provider outputs are labeled.

