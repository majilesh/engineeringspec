# Coding-agent integrations

EngineeringSpec uses one repository contract and one CLI across agents. Integrations are thin discovery and workflow adapters; they are not separate policy engines.

| Environment | Recommended integration | What it does |
|---|---|---|
| Codex | `AGENTS.md` plus the packaged `engineering-spec` Agent Skill | Discovers obligations, loads path context and self-checks the complete working state |
| Claude Code | `CLAUDE.md` importing `AGENTS.md` | Reuses the same neutral repository workflow |
| Cursor | Project rule pointing to `AGENTS.md` | Keeps editor agents on the same base-pinned commands |
| GitHub Copilot | Repository prompt pointing to `AGENTS.md` | Reuses the same lifecycle without duplicating authorization logic |
| ChatGPT-assisted repository work | Attach or connect the repository and instruct the coding workflow to follow `AGENTS.md` | Uses maintained repository guidance; availability depends on the repository tooling in use |
| CI | Immutable EngineeringSpec GitHub Action SHA | Enforces approved-base routing independently of the agent |

Run `adopt --quickstart --maintainer @owner --dry-run` for a new setup or `adopt --merge --dry-run` in an established repository. Existing user-authored structured configuration is not overwritten by default. Platform-specific notes live under [`integrations/`](../integrations/README.md).

## Skill versus plugin

The portable Agent Skill is the primary integration because it works without a hosted service and keeps the contract on disk. A vendor plugin is justified only when it adds genuine discovery, UI, or tool transport over stable CLI/JSON surfaces. It must remain a consumer of EngineeringSpec and must never implement its own authorization semantics.

The deterministic `catalogue --format json` output is the supported foundation for future MCP resources, IDE panels, review bots and plugins.
