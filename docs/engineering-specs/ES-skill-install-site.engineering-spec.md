---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-skill-install-site
title: Install the EngineeringSpec agent skill
status: implemented
owners:
  - team: EngineeringSpec maintainers
repository:
  ref: majilesh/engineeringspec
---

# Install the EngineeringSpec agent skill

Add a discoverable skill section to the homepage with this project-local Codex install, tested against the public GitHub repository in an empty temporary directory.

```sh
npx --yes skills add majilesh/engineeringspec --skill engineering-spec --agent codex --copy --yes
```

Explain that the skill supplies agent guidance and the repository needs its own configured EngineeringSpec CLI. Show three copyable prompts:

- Use EngineeringSpec to tell me whether I can change checkout retries and which files the approved contract covers.
- Draft a contract requiring every successful charge to have a receipt after recovery. Include how we would verify it.
- Review this change against its approved contract. Show which guarantees have evidence and which still need a check.

Verify the displayed command in a fresh project and compare the installed directory with the public source. Inspect the homepage on mobile and desktop and verify that selecting and copying each prompt preserves its text.

```engineering-source-refs
- id: SRC-WORKFLOW
  type: document
  ref: skills/engineering-spec/SKILL.md
```

```engineering-targets
- id: TARGET-DELIVERY
  component: skill-install-site
  paths:
    - site/index.html
  change_policy: modify
```

```engineering-constraints
- id: CON-DELIVERY
  level: must
  statement: The published example must install the canonical skill project-locally and must preserve the trusted-base authority boundary.
  applies_to: [TARGET-DELIVERY]
  enforcement: { kind: review, reviewer_role: repository-maintainer }
```

```engineering-verification
- id: VER-DELIVERY
  kind: human_review
  proves: [CON-DELIVERY]
  runner: { type: manual, reference: Review the acceptance evidence described above }
```
