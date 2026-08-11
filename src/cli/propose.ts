import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectGitWorktreeDiff, assertSafeRepoPath } from "../gate/collectDiff.js";
import type { ChangedFile } from "../gate/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { validateMarkdown } from "../validator/validateFile.js";

const SPEC_ID = /^[A-Z][A-Z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]*$/u;

export interface ProposalOptions {
  id: string;
  title: string;
  owner: string;
  output: string;
  issue?: string;
  base?: string;
  paths?: string[];
  fromDiff?: boolean;
  cwd?: string;
  dryRun?: boolean;
}

export interface ProposalResult {
  id: string;
  status: "draft";
  output: string;
  written: boolean;
  inferred: boolean;
  paths: string[];
  source: string;
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function proposalPaths(changes: ChangedFile[], explicit: string[]): string[] {
  const values = [
    ...explicit,
    ...changes.flatMap((change) => [change.path, ...(change.fromPath ? [change.fromPath] : [])]),
  ];
  for (const value of values) assertSafeRepoPath(value);
  return [...new Set(values)].sort(compareCodePoints);
}

export function proposalMarkdown(options: {
  id: string;
  title: string;
  owner: string;
  issue?: string;
  paths: string[];
  inferred: boolean;
}): string {
  const sourceType = options.issue ? "github_issue" : "other";
  const sourceRef = options.issue ?? "local-intent";
  const paths = options.paths.map((value) => `    - ${quote(value)}`).join("\n");
  const inference = options.inferred
    ? "Targets were inferred from the current Git working state. Review and narrow them before proposing approval. The generated obligation and verifier identity are placeholders for human review."
    : "Targets were supplied explicitly. Review them before proposing approval. The generated obligation and verifier identity are placeholders for human review.";
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${options.id}
title: ${quote(options.title)}
status: draft
owners:
  - team: ${quote(options.owner)}
---

# ${options.title}

${inference} This generated draft grants no implementation authority.

## Source intent

\`\`\`engineering-source-refs
- id: SRC-1
  type: ${sourceType}
  ref: ${quote(sourceRef)}
\`\`\`

## Target surfaces

\`\`\`engineering-targets
- id: TARGET-1
  component: proposed-change
  paths:
${paths}
  change_policy: modify
  notes: ${quote(inference)}
\`\`\`

## Constraints

\`\`\`engineering-constraints
- id: CON-1
  level: must
  statement: ${quote("The implementation must preserve existing documented behaviour outside the reviewed change scope.")}
  applies_to: [TARGET-1]
  enforcement: { kind: test, verifier_ref: VER-1 }
\`\`\`

## Verification

\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner:
    type: reference
    reference: ${quote("Separately trusted repository checks selected during review")}
\`\`\`
`;
}

export async function proposeDraft(options: ProposalOptions): Promise<{ result: ProposalResult; markdown: string }> {
  if (!SPEC_ID.test(options.id)) throw new Error("--id must be a valid EngineeringSpec identifier such as ES-my-change");
  const title = options.title.trim().replace(/[\r\n]+/gu, " ");
  const owner = options.owner.trim().replace(/[\r\n]+/gu, " ");
  if (!title) throw new Error("--title must not be empty");
  if (!owner) throw new Error("--owner must not be empty");
  if (path.isAbsolute(options.output)) throw new Error("--output must be repository-relative");
  assertSafeRepoPath(options.output);
  const explicit = options.paths ?? [];
  const changes = options.fromDiff
    ? await collectGitWorktreeDiff({
        ...(options.base ? { base: options.base } : {}),
        ...(options.cwd ? { cwd: options.cwd } : {}),
      })
    : [];
  const paths = proposalPaths(changes, explicit);
  if (paths.length === 0) throw new Error("propose requires --path <path> or a non-empty --from-diff working state");
  const markdown = proposalMarkdown({
    id: options.id,
    title,
    owner,
    ...(options.issue ? { issue: options.issue } : {}),
    paths,
    inferred: Boolean(options.fromDiff),
  });
  const validation = await validateMarkdown(markdown, options.output);
  if (!validation.spec || validation.diagnostics.some((item) => item.severity === "error")) {
    throw new Error(`Generated proposal did not validate: ${validation.diagnostics.map((item) => `${item.code} ${item.message}`).join("; ")}`);
  }
  if (!options.dryRun) {
    const destination = path.resolve(options.cwd ?? process.cwd(), options.output);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, markdown, { encoding: "utf8", flag: "wx" });
  }
  return {
    result: {
      id: options.id,
      status: "draft",
      output: options.output,
      written: !options.dryRun,
      inferred: Boolean(options.fromDiff),
      paths,
      source: options.issue ?? "local-intent",
    },
    markdown,
  };
}
