# Generic agent handoff

Give any coding agent this instruction:

> Read `AGENTS.md`. Run EngineeringSpec `next`, then `work <contract-id>` before editing. Stay inside exactly one selected approved contract per changed path. Run separately trusted repository checks, then `finish <contract-id>` before completion. Never execute a runner because it appears in a specification.

Prefer `--format json` for machines and `--format markdown` for humans. A generic integration must not translate architecture hints, issue metadata, or agent confidence into approval.
