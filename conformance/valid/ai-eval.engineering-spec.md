---
{spec_format: engineering-spec, spec_format_version: "0.1", spec_revision: 1, id: ES-eval, title: AI evaluation, status: draft, owners: [{team: evaluation}]}
---
```engineering-source-refs
[{id: SRC-1, type: document, ref: eval-definition, item_ids: [EVAL-1]}]
```
```engineering-targets
[{id: TARGET-1, paths: [evals/**], change_policy: create}]
```
```engineering-constraints
[{id: CON-1, level: should, statement: Evaluation results should be recorded., satisfies: [EVAL-1]}]
```
```engineering-verification
[{id: VER-1, proves: [EVAL-1], kind: ai_eval, definition_ref: "SRC-1#EVAL-1", result_required: true}]
```
