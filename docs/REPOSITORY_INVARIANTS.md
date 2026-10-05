# Repository invariants

Do not manually maintain the same fact in five places when one place can generate or validate the other four.

EngineeringSpec is a change-authority layer for AI coding agents. Tests tell you whether the code worked. EngineeringSpec tells you whether the repository change stayed inside the boundary that was approved. Review the allowed diff before the agent writes the diff.

## Sources and propagation

| Fact | Source of truth | Generated or validated consumers |
| --- | --- | --- |
| Current release, npm identity, Node support, license and product description | package.json | Lockfile root metadata; generated version reference; website metadata and release panel; Action compatibility metadata; current public installation snippets |
| Contract semantics and security boundaries | SPEC.md | Versioned schemas, model constants, evaluator and conformance tests |
| Machine structure and field enums | schemas/ | Schema validation and compatibility checks against the normative text |
| Command names, flags and supported choices | src/cli/program.ts | Generated CLI metadata and command reference; static inspection of public code examples |
| Immutable reviewed Action anchor | src/adoption/releases.ts | Current Action references; anchor package version read from that Git commit |
| Action bundle | src/ and scripts/build-action.mjs | Existing check:action compares the committed bundle to reviewed source |
| Catalogue | docs/engineering-specs/ and scripts/generate-site.mjs | site/catalogue.json and site/explorer.html |
| Public terminology and bounded claim rules | This glossary and engineering/repository-consistency.json | Public text checks and maintainer review |
| Authority decisions | Existing evaluator and routing modules | CLI, bundled Action, integrations and Visual Verification render or consume the same decision |

The package version does not identify the contract format or a contract revision. A reviewed Action anchor can contain an earlier package version. Its full SHA is an independent compatibility fact, never generated from the current commit.

`npm run project:generate` refreshes [version facts](generated/version.md), [command metadata](generated/cli-commands.md), website metadata, Action metadata and the marked homepage release panel. `npm run site:generate` refreshes the contract catalogue. Both generators use repository sources and execute no declared verifier. Generated files carry an explicit notice. The homepage notice applies only to its marked generated panel. Check mode compares expected bytes without writing.

The existing package description supplies the canonical short product description. The homepage teaches the escaped-diff problem; its displayed release and install command come from the same source.

## Glossary

| Term | Meaning |
| --- | --- |
| Context | Information the agent knows |
| Change authority | The repository changes the reviewed contract permits |
| Contract | The EngineeringSpec change-authority artifact |
| Trusted base | The immutable reviewed Git state from which authority is loaded |
| Complete Git diff | The full relevant committed, staged, unstaged, renamed, deleted and untracked working change |
| Validation | Checks that the resulting software or artifact works; distinct from authority |
| Selected | A single eligible change contract allows the path, as defined by SPEC.md |
| Denied | Negative authority or a forbidden change kind rejects the path |
| Uncovered | No eligible contract allows the path |
| Ambiguous | Multiple eligible positive claims remain without valid disambiguation |

Modes, lifecycle states and write policies retain their definitions in SPEC.md. `interface_only` is a path-writable label, not an AST or API compatibility proof. Runtime permissions are a separate concept. Use STE-inspired technical English; no formal language-standard compliance claim is made.

## Repository Integrity checks

Run `npm run check:release` before proposing an implementation or release. The **Repository Integrity** CI job runs the same aggregate on every PR, push and merge group. The publication workflow runs it before npm publication. Individual groups are available as `check:versions`, `check:docs`, `check:links`, `check:examples`, `check:schemas`, `check:conformance`, `check:generated` and `check:positioning`.

| Report category | Executed coverage | Limits |
| --- | --- | --- |
| Version consistency | Package and lockfile root identity; release literals and Action references on manifest-listed current surfaces | Historical release notes, RFCs, contracts, pilot records and blog articles retain their identities. Exact-line exceptions identify introductions and old anchors in current guidance. Registry tags and publication are not queried. |
| Specification/schema compatibility | Schema validity, format identifier/model constant agreement and documented lifecycle/write-policy enums | Conformance and human review assess semantics; text matching cannot prove equivalence. |
| Conformance corpus | Existing complete conformance suite | Does not execute specification-declared runners. |
| CLI documentation | Defined commands appear in the reference; commands and flags in fenced, HTML and invocation-shaped inline examples match the built command definition | Static inspection does not evaluate shell scripts, positional arguments, placeholder values, tool output or arbitrary prose. |
| README commands | Same static command checks for README | No copied command is executed. |
| Website commands | Same static command checks for website pages | Historical blog versions are preserved; commands still need to exist. |
| Example contracts | Strict positive-example validation with local profile resolution; negative examples must remain invalid | Validation executes no runners and does not prove external business requirements. |
| GitHub Action metadata | Composite bash adapter, reviewed anchor identity, current bundle identity, generated metadata and existing bundle freshness check | Does not move the anchor or claim the anchored bundle is the current package. |
| Generated content | Byte comparison for shared metadata, CLI reference, homepage panel and complete site catalogue; diagnostic paths are normalized to repository-relative paths | Catalogue refresh is required after contract changes, including lifecycle closure. |
| Terminology | Listed prohibited phrases on inventoried public surfaces | Bounded checks supplement glossary review. |
| Broken links | Local paths, fragments and published site-to-source mappings, offline | External liveness is reported as not run by default. Markdown heading anchors approximate GitHub conventions. |
| Security invariants | Existing adversarial, parser, policy, routing, hook, governance, configuration, replay and Visual Verification regression suites | Passing tests provide evidence; they do not prove absence of vulnerabilities or malicious code. |
| Public claims | Listed unsupported phrases on inventoried public surfaces | Maintainer review must distinguish implemented facts, measured observations, hypotheses and future work. |

The manifest inventories public docs, website pages, root guidance, the portable skill and integration READMEs. Generated references are checked by byte comparison. New public pages must be added to the inventory. Exceptions must be narrow and reviewed; do not exclude a current surface to silence drift. Blog version history is exempt from current release matching, not command or link checks.

`npm run check:links:external` separately checks public HTTP links with a ten-second total timeout per link, at most five redirects and explicit HTTP/network failure reporting. External outages and access restrictions fail this optional check; an offline green result never claims remote availability. External URLs are data, not commands. Review external results before publication when relevant links change.

## Security invariants and limitations

Preserve grant-before-spend, trusted-base authority, complete-diff evaluation, deny-overrides, fail-closed enforcement, inert specifications, deterministic authority evaluation and explainable decisions. Integrity checks run only explicitly coded repository checks. Neither documentation text nor specification runner fields are executable inputs.

The core evaluator remains deterministic and agent-neutral. It must not depend on a website, GitHub, an LLM or network access. Integrations stay thin. Visual Verification renders authoritative results and adds no separate decision logic.

EngineeringSpec does not by itself prove code correctness, requirement correctness, vulnerability absence, malicious-code absence, runtime safety, tool-call safety, agent truthfulness, correctness of the approved authority boundary or correctness of external verification tools. Its primary question is whether the resulting repository change remained within reviewed authority. Public claims about reduced incidents or productivity require retained evidence. Preserve negative and inconclusive pilot results.

## Release checklist

1. Obtain reviewed, merged base authority and load the implementation brief.
2. Update the package release and lockfile root identity; preserve independent format versions and immutable historical records.
3. Update release notes and migration notes when needed. Generate shared state and catalogue output. Rebuild the Action only when its reviewed source or package identity changes.
4. Run dependency installation, lint, typecheck, full tests, conformance, build, package contents, Action freshness and the release integrity aggregate. Run the dependency audit required by repository CI.
5. Assess compatibility, security implications, prose, historical exceptions, evidence status and local/external link coverage. Inspect the actual Git diff.
6. Run the complete-working-state strict authority check against the trusted base. Close through finish only after checks and review; regenerate the catalogue after closure.
7. Before an authorized publication, verify clean-install behavior, tag/package binding and provenance through the established release workflow. Never publish an unreviewed workspace build.

New normative semantics require a separate RFC, security and compatibility assessment, approved authority, schema changes where needed, matching conformance fixtures and migration guidance. Maintenance tooling does not authorize normative changes.
