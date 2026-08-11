export type TemplateName = "bug-fix" | "feature" | "api-change" | "infrastructure";

export function template(options: { template: TemplateName; id: string; title: string; owner: string }): string {
  const title = options.title.trim().replace(/[\r\n]+/gu, " ");
  const owner = options.owner.trim().replace(/[\r\n]+/gu, " ");
  if (!title || !owner) throw new Error("template title and owner must not be empty");
  const contract = options.template === "api-change"
    ? `
## Contracts

\`\`\`engineering-contracts
- id: CONTRACT-1
  kind: openapi
  path: contracts/openapi.yaml
  compatibility: backward_compatible
\`\`\`
`
    : `
## Constraints

\`\`\`engineering-constraints
- id: CON-1
  level: must
  statement: The change must preserve existing documented behaviour.
  enforcement:
    kind: test
    verifier_ref: VER-1
\`\`\`
`;
  const proof = options.template === "api-change" ? "CONTRACT-1" : "CON-1";
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${options.id}
title: ${JSON.stringify(title)}
status: draft
owners:
  - team: ${JSON.stringify(owner)}
---

# ${title}

Describe the engineering context and rationale here.

## Source intent

\`\`\`engineering-source-refs
- id: SRC-1
  type: other
  ref: local-intent
\`\`\`

## Targets

\`\`\`engineering-targets
- id: TARGET-1
  component: ${options.template}
  paths: [src/**]
  change_policy: modify
\`\`\`
${contract}
## Verification

\`\`\`engineering-verification
- id: VER-1
  proves: [${proof}]
  kind: test
  runner:
    type: reference
    reference: project test suite
\`\`\`
`;
}
