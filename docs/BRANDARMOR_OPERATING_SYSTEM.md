# BrandArmor Operating System

This document turns the 12-factor agents guide, K-Dense scientific skills, Laws of Software Engineering, Antigravity workflow, OpenAI Codex guidance, and the two saved MHTML articles into a BrandArmor working system.

BrandArmor is not an AI demo. BrandArmor is an evidence operating system for marketplace risk review.

## First Principles

### 1. The Customer Problem

Brands do not need a model that sounds confident. They need a way to reduce the cost, latency, and error rate of finding suspicious listings and deciding what to do next.

The painful work is:

- collecting marketplace evidence
- comparing it to official product truth
- checking regulatory evidence
- deciding which cases deserve review
- avoiding false accusations
- preserving an audit trail
- measuring whether the review process improves

### 2. The Unit Of Truth

The core unit is not a chat answer, a score, or an LLM judgment.

The core unit is:

> a timestamped evidence record tied to a listing, product baseline, source, extraction method, confidence, and human decision path.

Everything else is derived from that.

### 3. The Product Claim

Say:

> BrandArmor routes suspicious marketplace listings for evidence-backed review.

Do not say:

> BrandArmor automatically proves counterfeits.

This constraint shapes product, ML, UX, legal risk, and agent architecture.

### 4. The Architecture Bias

Use deterministic software for control, storage, verification, retries, thresholds, audit trails, and permissions.

Use LLMs for bounded tasks:

- extracting structured signals from messy text
- summarizing evidence
- identifying missing proof
- proposing the next investigation step
- drafting reviewer-facing reports with citations

Never let an LLM be the system of record.

### 5. The ML Bias

Do not start with a grand model claim. Start with a labeled evidence dataset.

The ML path is:

1. collect reliable labels
2. measure deterministic baseline performance
3. add interpretable features
4. add vision/time-series/Bayesian models only where they beat the baseline
5. expose uncertainty and review burden
6. keep humans in the loop for high-stakes outcomes

## Source Lessons

### 12-Factor Agents

The 12-factor agents guide asks how to build LLM-powered software good enough for production customers. The key BrandArmor answer is: use agent patterns inside normal software, not a black-box agent framework.

BrandArmor mapping:

- Natural language to tool calls: reviewer intent becomes structured investigation actions.
- Own prompts: BrandArmor prompts live as versioned code and are tested.
- Own context: prompts receive compact evidence context packs, not raw chat history.
- Tools are structured outputs: LLMs emit typed action proposals; deterministic code executes or blocks them.
- Unify execution and business state: investigation events are both workflow state and audit history.
- Launch, pause, resume: investigations can wait for OCR, BPOM, visual jobs, or human review.
- Contact humans with tools: high-stakes actions become human approval requests.
- Own control flow: BrandArmor decides which actions run, retry, pause, or escalate.
- Compact errors: provider failures are summarized and logged, not dumped forever into context.
- Small focused agents: each step does one job.
- Trigger from anywhere: future inputs can come from UI, upload, marketplace search, webhook, Slack, or scheduled monitoring.
- Stateless reducer: next state is derived from prior state plus a new event.

### K-Dense Scientific Agent Skills

The relevant category is Machine Learning and AI: deep learning, reinforcement learning, time series analysis, model interpretability, Bayesian methods.

BrandArmor mapping:

- Deep learning: visual similarity and packaging anomaly detection after reference images exist.
- Transformers: OCR cleanup, evidence extraction, multilingual listing parsing, and report drafting.
- Reinforcement learning: do not use for enforcement. Use contextual bandits or active learning later for review prioritization and evidence-collection policy optimization.
- Time series: seller behavior, price drift, repeated listing patterns, marketplace bursts, and enforcement response tracking.
- Model interpretability: SHAP-style feature attribution for deterministic/ML risk models.
- Bayesian methods: uncertainty-aware risk, posterior belief updates as evidence arrives, and confidence intervals around accuracy claims.

### Laws Of Software Engineering

Most useful laws for BrandArmor:

- First Principles Thinking: start from evidence, risk, review, and auditability.
- Gall's Law: evolve a simple working evidence system into a complex one.
- YAGNI: do not build crawlers, RL, graph ML, or enforcement automation before evidence quality exists.
- Goodhart's Law: when precision, recall, or risk score becomes the target, people will optimize the metric instead of truth.
- Testing Pyramid: many unit/domain tests, fewer integration tests, selected UI tests.
- The Map Is Not The Territory: score, OCR, and model judgment represent reality; they are not reality.
- Hyrum's Law: API fields and score behavior become contracts once users rely on them.
- Law of Leaky Abstractions: agent frameworks, OCR providers, and marketplace adapters will leak implementation details.
- Broken Windows: stale claims, mock badges, and untested integrations must be fixed quickly.
- Sunk Cost Fallacy: abandon approaches that do not improve evidence quality.

### Antigravity Workshop

The Antigravity workshop is useful as a role and gate model:

- Product Manager: writes product/technical specs and pauses for approval.
- Engineer: implements only the approved spec.
- QA: audits alignment, dependencies, logic, and security.
- DevOps: runs and deploys only after verification.

BrandArmor should adapt this into a lightweight internal workflow:

1. Spec the case or feature.
2. Implement the smallest testable change.
3. Audit claims, evidence, and edge cases.
4. Verify locally before demo or deploy.

### OpenAI Codex Guide And Saved Codex Article

Codex helps most when the work has durable context, explicit goals, tools, and verification. For BrandArmor, that means:

- keep `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, and `ERRORS.md` current
- make long-running threads and goals tied to concrete verification signals
- use side-panel/browser review for UI and artifact inspection
- use automations later for scheduled marketplace watch jobs
- use connectors only when they preserve evidence provenance

### Saved CLAUDE.md Article

The article's practical lesson is that agent performance improves when project context is written once and reused.

BrandArmor uses this through:

- `AGENTS.md`: project rules and default behavior
- `CLAUDE.md`: compatible Claude Code instructions
- `MEMORY.md`: durable decisions
- `ERRORS.md`: repeated failed approaches
- `docs/`: stable operating doctrine

## Layered System

BrandArmor should be built in layers:

1. Product truth layer: brands, products, official assets, BPOM/NIE, authorized sellers.
2. Evidence layer: listing fields, screenshots, OCR artifacts, search captures, regulatory checks, visual comparisons.
3. Investigation layer: durable events, context packs, pause/resume, missing evidence, reviewer tasks.
4. Scoring layer: transparent deterministic features and calibrated routing score.
5. Judge layer: LLM assessment with cited evidence IDs and insufficient-evidence fallback.
6. Review layer: human labels, decisions, notes, escalations.
7. Evaluation layer: precision, recall, false positive rate, false negative rate, precision at K, review burden, dataset size.
8. ML layer: vision, time-series, interpretability, Bayesian uncertainty, active learning.
9. Operations layer: auth, tenant isolation, durable database, object storage, audit logs, monitoring, CI/CD.

Do not skip lower layers to make upper layers look impressive.

## Decision Gates

### Evidence Gate

A listing cannot be treated as high-confidence without enough cited evidence. Missing evidence must be visible.

### Human Gate

Enforcement, public reporting, takedown drafts, or legal claims require human approval.

### ML Gate

No model can be called production-grade until it is evaluated on a labeled dataset with clear thresholds and failure analysis.

### Integration Gate

No provider or connector can be described as implemented unless there is a real route, adapter, error behavior, and test coverage.

### Claim Gate

Every product claim must be backed by current implementation and verification.

## Working Vocabulary

- Lead: a candidate listing worth looking at.
- Evidence: a stored observation with provenance.
- Signal: an extracted feature from evidence.
- Score: routing priority, not truth.
- Judge: bounded LLM reasoning over cited evidence.
- Review: human decision.
- Enforcement: downstream action requiring human approval.
- Dataset: labeled cases suitable for evaluation.
- Context pack: compact structured prompt input derived from evidence and events.

