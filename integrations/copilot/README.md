# GitHub Copilot

The generated `.github/prompts/engineering-spec.prompt.md` points Copilot at `AGENTS.md` and the same base-pinned lifecycle. It contains no vendor-specific authorization logic.

The GitHub Action writes the deterministic `review` report to the job summary. It does not post or edit pull-request comments by default and needs only `contents: read`.

For agent-driven changes, follow the shared `next -> work <contract-id> -> separately trusted repository checks -> finish <contract-id>` journey from `AGENTS.md`. The Action independently enforces the trusted-base routing decision.
