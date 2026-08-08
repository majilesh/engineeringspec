# Agent-impact benchmark

This benchmark answers one narrow question: does adding the same EngineeringSpec contract improve an AI coding agent's outcome on the same repository task?

Run each task at least once in both conditions with the same repository revision, task prompt, agent/model, permissions, time limit, and trusted test suite:

- `baseline`: repository guidance and task prompt only.
- `engineeringspec`: the same inputs plus the EngineeringSpec skill and contract.

Keep specifications inert. The benchmark harness or repository workflow may run trusted tests, but it must never execute a command merely because it appears in a specification.

Record one JSON object per run using [agent-impact.schema.json](agent-impact.schema.json). `success` should mean that the independently selected trusted tests and acceptance review pass. Count changed paths rejected by the declared target policy as `scopeViolations`, and count material reviewer-requested fixes as `reviewCorrections`.

Summarize results with:

```sh
engineeringspec benchmark benchmarks/results/*.json --format json
```

Report all five outcomes together: success, scope violations, review corrections, duration, and total tokens. Do not claim improvement from the bundled example data; it exists only to test the report format. A useful pilot should use at least 10 real tasks, paired conditions, and disclose failures and agent/model versions.
