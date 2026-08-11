# Coding-agent integrations

EngineeringSpec integrations are deliberately thin. Every agent reads the same checked-in contract and calls the same deterministic CLI; no adapter can approve a contract, widen scope, or execute a declared runner.

| Agent | Repository handoff | Optional reusable integration |
| --- | --- | --- |
| Codex | `AGENTS.md` | `skills/engineering-spec/` |
| Claude Code | `CLAUDE.md` importing `AGENTS.md` | same workflow commands |
| Cursor | `.cursor/rules/engineering-spec.mdc` | same workflow commands |
| GitHub Copilot | `.github/prompts/engineering-spec.prompt.md` | same workflow commands |
| Any coding agent | `AGENTS.md` or an explicit prompt | CLI JSON/Markdown output |

Generate the handoffs with `adopt --quickstart --dry-run`, review them, then rerun without `--dry-run`.

```sh
engineeringspec adopt . --quickstart --maintainer @your-org/platform --dry-run
engineeringspec adopt . --quickstart --maintainer @your-org/platform
engineeringspec adopt . --spec docs/engineering-specs/ES-change.engineeringspec.md --merge --upgrade --dry-run
```

The upgrade command changes only recognizably managed guidance and one immutable Action pin. Ambiguous user-owned structured files are skipped.
