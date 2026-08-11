# Claude Code

Use a one-line `CLAUDE.md` containing `@AGENTS.md`. This prevents a second, drifting policy copy. Claude should use `propose` only for draft generation and `review` for a deterministic explanation of base-pinned scope.

Do not grant tool permission to specification-declared runner payloads merely because they appear in context.
