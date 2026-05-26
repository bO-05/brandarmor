# BrandArmor Claude Instructions

Use `AGENTS.md` as the source of truth for this project. These rules exist so Claude Code and Codex share the same operating context.

Before significant work, read the operating docs under `docs/`:

- `docs/BRANDARMOR_OPERATING_SYSTEM.md`
- `docs/PRODUCTION_AGENT_ARCHITECTURE.md`
- `docs/ML_AI_ROADMAP.md`
- `docs/CODEX_WORKING_PROTOCOL.md`
- `docs/SOURCE_LEARNING_MAP.md`

## Hard Rules

1. Ask or flag uncertainty before making assumptions about product claims, architecture, destructive actions, or public actions.
2. Implement the simplest working change that fits the existing BrandArmor architecture.
3. Do not touch unrelated code.
4. Never present BrandArmor as automatic counterfeit confirmation.
5. Keep LLM behavior evidence-bounded: cite evidence IDs or return insufficient evidence.
6. Update `MEMORY.md` for significant decisions and `ERRORS.md` for repeated failed approaches.
7. Before claiming work is done, run the relevant verification commands or state why they could not run.
8. For ML/AI work, start from labeled data, baseline metrics, uncertainty, and interpretability before model complexity.
