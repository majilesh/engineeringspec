<!-- This file is generated. Do not edit manually. -->
# CLI command metadata

Built from src/cli/program.ts without executing command actions. Global options: `-V, --version`, `--format <format>`, `--quiet`, `--strict`.

## init



- `--template <name>`: 
- `--id <id>`: spec ID
- `--title <title>`: title
- `--owner <owner>`: owner
- `--force`: overwrite an existing file

## validate



- `--strict-external`: 
- `--schema-only`: 
- `--no-profile-resolution`: 
- `--repository-root <path>`: repository root for repository-relative local source paths
- `--format <format>`: output format

## normalize



- `--output <path>`: 
- `--include-source-locations`: 
- `--digest`: 

## inspect



- `--summary`: 
- `--target <id>`: 
- `--path <path>`: 
- `--constraint <id>`: 
- `--contract <id>`: 
- `--verifier <id>`: 
- `--source-item <id>`: 
- `--parse-only`: skip semantic validation (debugging only)

## coverage



- `--format <format>`: output format
- `--fail-on <level>`: 

## adopt

Safely scaffold neutral agent and CI integration files

- `--spec <path>`: repository-relative EngineeringSpec path
- `--quickstart`: create a draft first contract, neutral agent guidance, CI, and CODEOWNERS
- `--id <id>`: quickstart draft identifier
- `--title <title>`: quickstart draft title
- `--owner <owner>`: quickstart owning team
- `--maintainer <github-owner>`: CODEOWNERS user or org/team; inferred from GitHub origin when possible
- `--base <ref>`: approved base ref (auto-detects origin/HEAD; falls back to origin/main)
- `--force`: overwrite existing integration files
- `--merge`: merge agent instructions into existing text files; structured files are skipped
- `--upgrade`: upgrade recognizably managed guidance and immutable Action pins
- `--dry-run`: report files without writing them

## benchmark

Summarize paired agent-impact benchmark records

- `--format <format>`: output format
- `--require-publishable`: fail unless retained evidence is complete, observed, and publishable
- `--ceremony`: execute the canonical ceremony scenarios with this CLI in temporary Git repositories

## doctor

Diagnose repository readiness without changing files

- `--spec-dir <directory>`: repository-relative EngineeringSpec directory
- `--base <ref>`: trusted base ref
- `--format <format>`: output format

## status

Summarize contract lifecycle and the complete working state

- `--spec-dir <directory>`: repository-relative EngineeringSpec directory; defaults from trusted config
- `--base <ref>`: trusted base ref; safely auto-resolved when omitted
- `--head <ref>`: git head ref
- `--changed <path>`: explicit changed path (repeatable)
- `--staged`: inspect committed and staged changes only
- `--no-worktree`: exclude working-tree changes
- `--allow-contract-only`: allow strictly validated specification-directory-only governance changes
- `--change-kind <kind>`: 
- `--format <format>`: output format

## next

Report the next safe action using trusted repository defaults

- `--base <ref>`: trusted base ref override
- `--verbose`: restore the full pre-ticket status/routing payload
- `--format <format>`: output format

## replay

Simulate historical review or finish readiness without granting current authority

- `--at <commit>`: full immutable authority commit SHA
- `--operation <operation>`: 
- `--head-at <commit>`: full immutable candidate commit SHA
- `--changes-file <path>`: bounded inert changed-path fixture
- `--format <format>`: output format

## work

Load a base-pinned implementation brief using trusted repository defaults

- `--base <ref>`: trusted base ref override
- `--verbose`: restore the full pre-ticket preparation payload
- `--format <format>`: output format

## finish

Check an implementation, prepare trusted evidence metadata, and optionally write its monotonic close

- `--base <ref>`: trusted base ref override
- `--staged`: evaluate committed and staged changes; disclose excluded working state
- `--evidence <path>`: bounded external verifier-state JSON
- `--write-closure`: write only the approved-to-implemented status transition
- `--output <path>`: write receipt and PR metadata JSON
- `--format <format>`: output format

## transition

Preview or write a validated lifecycle status-only transition

- `--to <status>`: target lifecycle status
- `--write`: write the status-only transition after validation

## propose

Generate a deterministic draft contract from bounded local intent

- `--id <id>`: EngineeringSpec identifier
- `--title <title>`: change title
- `--owner <owner>`: owning team
- `--output <path>`: repository-relative output path
- `--issue <reference>`: inert issue reference; no network request is made
- `--base <ref>`: base ref used by --from-diff
- `--path <path>`: explicit target path (repeatable)
- `--from-diff`: infer exact paths from the complete Git working state
- `--lite`: generate a lite-profile contract: frontmatter and targets only (RFC 0014)
- `--dry-run`: print the draft without writing it
- `--format <format>`: output format

## review

Explain the base-pinned authorization decision for the complete working state

- `--spec-dir <directory>`: repository-relative EngineeringSpec directory; defaults from trusted config
- `--base <ref>`: trusted base ref; safely auto-resolved when omitted
- `--head <ref>`: Git head ref
- `--changed <path>`: explicit changed path (repeatable)
- `--staged`: inspect committed and staged changes only
- `--no-worktree`: exclude working-tree changes
- `--allow-contract-only`: allow strictly validated specification-directory-only governance changes
- `--bootstrap-mode <mode>`: first-adoption advisory mode; ignored when the trusted base has engineering-spec.json or approved contracts
- `--contract <id>`: narrow routing to one approved trusted-base contract (never widens authority)
- `--selector-label <label>`: PR label naming a contract; honored only with a trusted selection.label prefix (repeatable)
- `--selector-branch <name>`: PR branch naming a contract; honored only with a trusted selection.branch prefix
- `--change-kind <kind>`: 
- `--evidence <path>`: bound evidence envelope for HTML only (repeatable)
- `--format <format>`: output format

## catalogue

Build a deterministic searchable contract catalogue

- `--query <text>`: filter catalogue content
- `--path <path>`: filter contracts that affect a repository path
- `--format <format>`: output format

## architecture

Import a read-only architecture map from a Backstage component catalogue

- `--format <format>`: output format

## check

Run the read-only agent pre-completion check over the complete working state

- `--spec-dir <directory>`: base-pinned directory of approved EngineeringSpecs
- `--base <ref>`: approved base ref; loads the contract from base by default
- `--head <ref>`: git head ref
- `--spec-from <source>`: 
- `--staged`: check committed and staged changes only
- `--no-worktree`: exclude working-tree changes and check committed changes only
- `--allow-contract-only`: allow strictly validated specification-directory-only governance changes
- `--bootstrap-mode <mode>`: first-adoption advisory mode; ignored when the trusted base has engineering-spec.json or approved contracts
- `--contract <id>`: narrow routing to one approved trusted-base contract (never widens authority)
- `--selector-label <label>`: PR label naming a contract; honored only with a trusted selection.label prefix (repeatable)
- `--selector-branch <name>`: PR branch naming a contract; honored only with a trusted selection.branch prefix
- `--format <format>`: output format

## select

Route changed paths to unique approved EngineeringSpecs from an immutable base tree

- `--base <ref>`: approved Git base ref
- `--head <ref>`: git head ref
- `--require-status <status>`: eligible lifecycle status (repeatable; defaults to approved)
- `--changed <path>`: explicit changed path (repeatable)
- `--worktree`: route the complete working state
- `--staged`: route committed and staged changes
- `--allow-contract-only`: allow strictly validated specification-directory-only governance changes
- `--bootstrap-mode <mode>`: first-adoption advisory mode; ignored when the trusted base has engineering-spec.json or approved contracts
- `--contract <id>`: narrow routing to one approved trusted-base contract (never widens authority)
- `--selector-label <label>`: PR label naming a contract; honored only with a trusted selection.label prefix (repeatable)
- `--selector-branch <name>`: PR branch naming a contract; honored only with a trusted selection.branch prefix
- `--change-kind <kind>`: 
- `--format <format>`: output format

## measure

Generate unsigned deterministic scope evidence from committed base and head revisions

- `--spec-dir <directory>`: base-pinned EngineeringSpec directory
- `--base <ref>`: approved Git base ref
- `--head <ref>`: committed Git head ref
- `--include-paths`: explicitly include repository paths in the receipt
- `--output <path>`: write the receipt to a file
- `--format <format>`: output format

## prepare

Load one approved base contract as a concise pre-code implementation brief

- `--spec-dir <directory>`: base-pinned EngineeringSpec directory; defaults from trusted config
- `--base <ref>`: approved Git base ref; safely auto-resolved when omitted
- `--format <format>`: output format

## context

Print the smallest relevant contract context for paths or the working state

- `--path <path>`: path to include (repeatable)
- `--base <ref>`: base ref for --worktree or --staged
- `--head <ref>`: git head ref
- `--spec-from <source>`: 
- `--worktree`: derive paths from the complete working state
- `--staged`: derive paths from committed and staged changes
- `--format <format>`: output format

## guard

Check proposed edits against trusted-base authority before they happen (read-only guardrail for agent hooks)

- `--path <path>`: proposed path; absolute or relative to the current directory (repeatable)
- `--change-kind <kind>`: change kind for every --path; inferred from the filesystem when omitted
- `--contract <id>`: narrow to one approved trusted-base contract (never widens authority)
- `--stdin`: read {"paths":[{"path","kind"?}],"contract"?} from standard input
- `--base <ref>`: trusted base ref override
- `--format <format>`: output format

## explain

Explain why one path and change kind is allowed or denied

- `--spec-dir <directory>`: explain through the complete approved-base candidate set
- `--path <path>`: 
- `--base <ref>`: approved base ref; loads the contract from base by default
- `--spec-from <source>`: 
- `--change-kind <kind>`: 

## gate

Fail closed if git changes fall outside declared targets (diff-scope gate)

- `--base <ref>`: git base ref for diff (e.g. origin/main)
- `--head <ref>`: git head ref
- `--spec-from <source>`: load contract from workspace file or git base SHA (default: base when --base is set)
- `--require-status <status>`: require metadata.status (repeatable)
- `--changed <path>`: explicit changed path (repeatable; skips git)
- `--worktree`: gate committed, staged, unstaged, deleted, renamed, and untracked files
- `--staged`: gate committed and staged files relative to the selected base
- `--change-kind <kind>`: kind for --changed paths
- `--receipt <path>`: write durable gate-receipt.json to this path
- `--format <format>`: output format
