# GitHub Copilot

The Copilot coding agent reads repository instructions from `AGENTS.md` and, optionally, `.github/copilot-instructions.md`. `adopt` writes the shared lifecycle into `AGENTS.md` and no longer generates `.github/prompts/engineering-spec.prompt.md`: that file is a reusable IDE prompt which the coding agent does not apply automatically. If you want Copilot-specific wording, point `.github/copilot-instructions.md` at `AGENTS.md` instead of copying the rules into it. Keep it free of vendor-specific authorization logic.

The GitHub Action writes the deterministic `review` report to the job summary. It does not post or edit pull-request comments by default, and it needs only `contents: read`.

For agent-driven changes, follow the shared `next -> work <contract-id> -> separately trusted repository checks -> finish <contract-id>` journey from `AGENTS.md`. The Action independently enforces the trusted-base routing decision.
