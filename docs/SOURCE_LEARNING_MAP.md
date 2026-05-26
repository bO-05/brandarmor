# Source Learning Map

This is the audit trail from source material to BrandArmor decisions.

## Sources

1. `https://github.com/humanlayer/12-factor-agents`
2. `https://github.com/K-Dense-AI/scientific-agent-skills`
3. `https://lawsofsoftwareengineering.com/`
4. `https://raw.githubusercontent.com/estherirawati/antigravity/refs/heads/main/workshop-antigravity.md`
5. `https://openai.com/business/guides-and-resources/how-openai-uses-codex/`
6. `C:/Users/user/Downloads/Getting the most out of Codex - jxnlco.mhtml`
7. `C:/Users/user/Downloads/Dep on X_ _Karpathy's CLAUDE.md hit #1 on GitHub with 82,000 stars. Most devs still haven't read it._ _ X.mhtml`

## 12-Factor Agents To BrandArmor

| Factor | BrandArmor Interpretation | Repo/Process Decision |
| --- | --- | --- |
| Natural language to tool calls | Reviewer or brand intent becomes a typed investigation action. | Add action schemas before letting models execute anything. |
| Own your prompts | Prompts are product code, not framework magic. | Future judge/extraction prompts should be versioned and tested. |
| Own your context window | LLMs receive compact evidence context packs. | `src/domain/investigation.ts` and context pack docs. |
| Tools are structured outputs | Tool calls are typed proposals. | Deterministic code validates and executes or blocks. |
| Unify execution and business state | Investigation history is both workflow state and audit trail. | Use investigation events instead of hidden orchestration state. |
| Launch/pause/resume | OCR, BPOM, visual jobs, and human review can pause a run. | Model `waiting_for_human` and future resumable events. |
| Contact humans with tool calls | Human review is a first-class structured action. | High-stakes actions require current-session approval. |
| Own control flow | BrandArmor owns retries, fallbacks, pauses, approvals. | Do not hand control flow to an agent framework. |
| Compact errors | Provider failures become short safe summaries in context. | Log raw failures separately where needed. |
| Small focused agents | Each agent step has one responsibility. | Discovery, OCR, regulatory, visual, scoring, judge, review, report units. |
| Trigger from anywhere | Future workflows may start from UI, imports, cron, Slack, or webhook. | Require provenance and source confidence for every trigger. |
| Stateless reducer | New state is derived from old run plus new event. | Treat investigation events as reducer inputs. |
| Pre-fetch context | Gather product baseline, listing, evidence, and prior decisions before prompting. | Context packs should be assembled before LLM calls. |

## K-Dense Machine Learning And AI To BrandArmor

| Area | BrandArmor Use | Guardrail |
| --- | --- | --- |
| Deep learning | Visual package similarity and anomaly detection. | Only after official reference and suspect image datasets exist. |
| Transformers | Listing/OCR extraction, multilingual evidence parsing, report drafting. | Structured output, evidence IDs, reviewer correction tracking. |
| Reinforcement learning | Later active learning or evidence-collection policy. | Never optimize enforcement or accusations. |
| Time series | Seller behavior, price drift, listing bursts, repeat offenders. | Start with simple rolling/statistical baselines. |
| Model interpretability | Feature attribution and reviewer explanations. | Every risk lift must trace back to evidence. |
| Bayesian methods | Uncertainty-aware posterior risk and metric confidence intervals. | Use "needs more evidence" when uncertainty is high. |
| Optimization | Review queue and provider-call budget. | Optimize review utility, not takedown count. |
| Graph ML | Seller/product/listing relationship analysis later. | Avoid until entity resolution is reliable. |

## Laws Of Software Engineering To BrandArmor

| Law | BrandArmor Decision |
| --- | --- |
| First Principles Thinking | Build from evidence, review, uncertainty, auditability. |
| Gall's Law | Evolve a simple working evidence system before complex agent/ML automation. |
| YAGNI | Do not build crawlers, RL, graph ML, or enforcement automation before needed. |
| Goodhart's Law | Do not optimize for takedowns or high-risk labels. |
| Testing Pyramid | Domain tests first, integration tests second, UI tests for critical flows. |
| Map Is Not The Territory | OCR, score, visual match, and LLM judge are representations, not reality. |
| Hyrum's Law | Treat score fields, evidence fields, and API outputs as contracts. |
| Leaky Abstractions | Provider and framework details will leak; expose provenance and fallback status. |
| Broken Windows | Wrong claims and fake real/mock badges are quality defects. |
| Sunk Cost Fallacy | Retire approaches that do not improve evidence quality or review outcomes. |
| Principle of Least Astonishment | Reviewers must always see why a case was routed and what is missing. |
| CAP/Fallacies of Distributed Computing | Future production persistence must handle concurrency, retries, and partial failure. |

## Antigravity To BrandArmor

| Workshop Role | BrandArmor Adaptation |
| --- | --- |
| Product Manager | Write specs for durable product/architecture changes; define non-goals and claim boundaries. |
| Full-Stack Engineer | Implement smallest typed/tested change aligned to approved architecture. |
| QA Engineer | Audit evidence claims, provider failures, tests, mock/real labeling, and edge cases. |
| DevOps Master | Run local verification and deployment checks; never skip env/persistence assumptions. |

Antigravity's useful pattern is role separation and approval gates. BrandArmor should not copy the `app_build/` workflow directly because this is an existing repo with established structure.

## OpenAI Codex And Saved Codex Article To BrandArmor

| Codex Idea | BrandArmor Adaptation |
| --- | --- |
| Durable threads | Preserve decisions in repo files, not just chat. |
| Goals | Use explicit finish lines: tests pass, build passes, demo scenario works, metrics update. |
| Steering | User corrections during long tasks should update plan and memory when durable. |
| Queuing | Future tasks should be captured as next priorities, not half-implemented. |
| Browser/side panel | Use rendered UI review for demo/review/report pages. |
| Automations | Later: scheduled marketplace watch and evaluation refresh. |
| Shared memory | `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, `ERRORS.md`, and `docs/` are the project memory. |
| Connectors | Use only when provenance and approval gates survive. |

## Saved CLAUDE.md Article To BrandArmor

| Article Idea | BrandArmor Adaptation |
| --- | --- |
| Kill filler | Agent responses should be direct and implementation-oriented. |
| Match length to task | Small fixes get concise responses; architecture gets full scaffolds. |
| Show options before big changes | Strategic changes need approaches and tradeoffs. |
| Admit uncertainty | Unknown provider behavior, laws, or model claims must be flagged. |
| Stay in scope | Do not refactor unrelated code. |
| Ask before destructive actions | Applies to deletes, dependency removal, external sends, deployment. |
| Maintain memory | Durable decisions live in `MEMORY.md`. |
| Maintain error log | Repeated failed approaches live in `ERRORS.md`. |
| Lock tech stack | Next.js, TypeScript, Tailwind, Zod, Vitest unless explicitly changed. |

## Resulting BrandArmor Work Standard

Before work:

1. Read project memory and operating docs.
2. Identify work lane.
3. State assumptions.
4. Use the smallest approach that preserves evidence and claim discipline.

During work:

1. Keep state/event/provenance explicit.
2. Validate model outputs.
3. Pause for humans on high-stakes actions.
4. Keep mocks and real provider outputs labeled.

After work:

1. Update durable docs or memory if product doctrine changed.
2. Run relevant verification.
3. Report files changed, checks run, and remaining gaps.

