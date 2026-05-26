# BrandArmor Codex Working Protocol

This document defines how Codex, Claude Code, and future coding agents should work on BrandArmor with less repeated explanation.

It combines the OpenAI Codex guide, saved Codex article, saved CLAUDE.md article, Antigravity workflow, and BrandArmor project constraints.

## Persistent Context Files

Read before significant work:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `MEMORY.md`
4. `ERRORS.md`
5. `HANDOFF.md`
6. `RUNBOOK.md`
7. `ARCHITECTURE.md`
8. `KNOWN_LIMITS.md`
9. `VERSION_HISTORY.md`
10. `docs/BRANDARMOR_OPERATING_SYSTEM.md`
11. `docs/PRODUCTION_AGENT_ARCHITECTURE.md`
12. `docs/ML_AI_ROADMAP.md`

## Work Lanes

Every task should fit one lane.

### Lane 1: Product Doctrine

Changes to claims, positioning, product workflow, review process, or stakeholder-facing docs.

Required:

- update `MEMORY.md` for significant decisions
- preserve claim discipline
- check `KNOWN_LIMITS.md`

### Lane 2: Domain Logic

Changes to scoring, review states, investigation events, evidence, imports, or metrics.

Required:

- test first for new behavior
- update types and schemas together
- keep deterministic behavior clear

### Lane 3: Integration

Changes to OCR, BPOM, visual providers, LLM providers, discovery, or external APIs.

Required:

- provider unavailable state
- explicit fallback behavior
- no fake "real" badges
- tests for missing/invalid credentials where practical

### Lane 4: ML/AI

Changes to embeddings, models, datasets, interpretability, Bayesian logic, or active learning.

Required:

- dataset statement
- baseline comparison
- metrics and failure analysis
- no production claims without evaluation

### Lane 5: UI/UX

Changes to pages, review screens, demo flows, dashboards, or reports.

Required:

- visible provenance
- visible missing evidence
- visible limitations
- no misleading certainty

### Lane 6: Ops

Changes to persistence, auth, tenants, CI/CD, monitoring, deployment, or storage.

Required:

- migration/rollback note
- security and privacy check
- verification commands

## Antigravity-Style Role Gates

Use these roles as checkpoints, not theater.

### PM Gate

Before large changes:

- define user problem
- define success criteria
- define non-goals
- define risks

### Engineer Gate

During implementation:

- smallest coherent change
- tests close to behavior
- no unrelated refactors
- typed inputs and outputs

### QA Gate

Before completion:

- check edge cases
- check mock/real labeling
- check failure behavior
- check docs and claims

### DevOps Gate

Before deployment or demo:

- run verification
- check env assumptions
- check persistence assumptions
- check public URLs and secrets

## Codex Usage

Use Codex for:

- repo reading and mapping
- tests and refactors
- durable goals with verification signals
- browser review for UI
- scheduled monitoring tasks later
- maintaining project memory

Avoid using Codex for:

- unsupervised enforcement
- sending external reports without approval
- large rewrites without spec
- replacing labeled evaluation with intuition

## Session End Protocol

When wrapping up significant work, update `MEMORY.md` with:

- worked on
- completed
- decisions made
- rejected approaches
- next priorities

If an approach failed more than twice, update `ERRORS.md`.

## Verification Protocol

Default commands:

```powershell
npm run typecheck
$env:BPOM_DISABLE_API="1"
npm test
npm run build
```

Run narrower checks while working. Run broader checks before claiming completion.

## No Back-And-Forth Scaffold

To reduce repeated clarification:

1. Start from the persistent context files.
2. Pick the work lane.
3. State assumptions briefly.
4. Implement the smallest complete step.
5. Update doctrine/memory if the decision is durable.
6. Verify.
7. Report files changed, checks run, and remaining gaps.

Ask the user only when:

- a destructive action is needed
- a public/external action is needed
- product claims would change
- multiple strategic choices have materially different consequences
- local context cannot answer the question safely

