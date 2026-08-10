import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { packageVersion } from "./version.js";

const execFileAsync = promisify(execFile);
const MANAGED_START = "<!-- engineeringspec:start -->";
const MANAGED_END = "<!-- engineeringspec:end -->";

export interface AdoptionResult {
  root: string;
  created: string[];
  updated: string[];
  skipped: string[];
  dryRun: boolean;
  baseRef: string;
}

async function defaultBaseRef(root: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", root, "symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"],
      { maxBuffer: 64 * 1024 },
    );
    const ref = stdout.trim().replace(/^refs\/remotes\//, "");
    if (/^origin\/[A-Za-z0-9._/-]+$/.test(ref)) return ref;
  } catch {
    // A new or local-only repository may not have origin/HEAD yet.
  }
  return "origin/main";
}

function assertSafeAdoptionInputs(specPath: string, baseRef: string): void {
  const safeRef = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
  const hasParentSegment = (value: string): boolean => value.split("/").includes("..");
  if (!safeRef.test(specPath) || path.isAbsolute(specPath) || hasParentSegment(specPath)) {
    throw new Error("--spec must be a safe repository-relative path");
  }
  if (!safeRef.test(baseRef) || hasParentSegment(baseRef)) {
    throw new Error("--base must be a safe Git ref");
  }
}

function managedWorkflow(specPath: string, baseRef: string, version: string): string {
  const cli = `npx --yes @engineeringspec/cli@${version}`;
  const specDirectory = path.posix.dirname(specPath);
  return `${MANAGED_START}
# EngineeringSpec agent workflow

Use \`explore -> propose -> approve -> implement -> verify -> close\` for consequential changes. Prefer a repository-local CLI; otherwise use the exact version below.

1. **Explore:** diagnose with \`${cli} doctor . --spec-dir ${specDirectory} --base ${baseRef} --strict\` and inspect lifecycle state with \`${cli} status --spec-dir ${specDirectory} --base ${baseRef} --allow-contract-only --strict\`. Exploration grants no authority.
2. **Propose:** create or update a draft contract describing intent, targets, constraints, and verification. Keep scope changes contract-only.
3. **Approve:** merge the reviewed contract with \`status: approved\`. A workspace draft cannot authorize its own implementation.
4. **Implement:** validate with \`${cli} validate ${specDirectory} --strict\`, route with \`${cli} select ${specDirectory} --base ${baseRef} --worktree --allow-contract-only --strict\`, and inspect each expected path with \`${cli} context <selected-spec> --path <path> --base ${baseRef} --format markdown\`.
5. **Verify:** stay inside targets, run only separately trusted repository checks, then run \`${cli} check --spec-dir ${specDirectory} --base ${baseRef} --allow-contract-only --strict\`. Specification runners are inert data.
6. **Close:** after review and trusted checks pass, move the contract out of \`approved\` in a lifecycle-only change and report satisfied identifiers.

If targets must widen, merge that contract-only amendment before implementing against the new base.
${MANAGED_END}
`;
}

function files(specPath: string, baseRef: string, version: string): Record<string, string> {
  const workflow = managedWorkflow(specPath, baseRef, version);
  const specDirectory = path.posix.dirname(specPath);
  return {
    "AGENTS.md": workflow,
    "CLAUDE.md": "@AGENTS.md\n",
    ".cursor/rules/engineering-spec.mdc": `---\ndescription: Apply the repository EngineeringSpec contract\nalwaysApply: true\n---\n\nFollow @AGENTS.md.\n`,
    ".github/workflows/engineering-spec.yml": `name: EngineeringSpec
on:
  pull_request:
  merge_group:
permissions:
  contents: read
jobs:
  engineering-spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - id: approved-base
        name: Resolve approved base
        shell: bash
        env:
          EVENT_NAME: \${{ github.event_name }}
          PR_BASE: \${{ github.base_ref }}
          QUEUE_BASE: \${{ github.event.merge_group.base_ref }}
        run: |
          if [ "$EVENT_NAME" = "pull_request" ]; then
            branch="$PR_BASE"
          else
            branch="\${QUEUE_BASE#refs/heads/}"
          fi
          test -n "$branch"
          git fetch origin "$branch"
          echo "ref=origin/$branch" >> "$GITHUB_OUTPUT"
      - uses: majilesh/engineeringspec@0867ea1461f2280a0e0aa1c9bb14fb3d02a33d9b
        with:
          path: ${specDirectory}
          strict: true
          gate-spec-dir: ${specDirectory}
          gate-allow-contract-only: true
          gate-base: \${{ steps.approved-base.outputs.ref }}
          gate-require-status: approved
`,
  };
}

function mergeContent(relative: string, existing: string, generated: string): string | undefined {
  if (relative === "AGENTS.md") {
    const start = existing.indexOf(MANAGED_START);
    const end = existing.indexOf(MANAGED_END);
    if ((start >= 0) !== (end >= 0) || (start >= 0 && end < start)) return undefined;
    if (start >= 0 && end >= start) {
      return `${existing.slice(0, start)}${generated}${existing.slice(end + MANAGED_END.length).replace(/^\n/, "")}`;
    }
    return `${existing.trimEnd()}\n\n${generated}`;
  }
  if (relative === "CLAUDE.md") {
    if (existing.split(/\r?\n/).includes("@AGENTS.md")) return existing;
    return `${existing.trimEnd()}\n\n@AGENTS.md\n`;
  }
  return undefined;
}

export async function adoptRepository(options: {
  root: string;
  specPath: string;
  baseRef?: string;
  force?: boolean;
  merge?: boolean;
  dryRun?: boolean;
}): Promise<AdoptionResult> {
  const root = path.resolve(options.root);
  const baseRef = options.baseRef ?? await defaultBaseRef(root);
  assertSafeAdoptionInputs(options.specPath, baseRef);
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  for (const [relative, content] of Object.entries(files(options.specPath, baseRef, packageVersion()))) {
    const destination = path.join(root, relative);
    let exists = true;
    try { await access(destination); } catch { exists = false; }
    if (exists && !options.force) {
      if (options.merge) {
        const existing = await readFile(destination, "utf8");
        const merged = mergeContent(relative, existing, content);
        if (merged !== undefined) {
          if (merged !== existing) {
            updated.push(relative);
            if (!options.dryRun) await writeFile(destination, merged, "utf8");
          }
          continue;
        }
      }
      skipped.push(relative);
      continue;
    }
    created.push(relative);
    if (!options.dryRun) {
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content, "utf8");
    }
  }
  return { root, created, updated, skipped, dryRun: Boolean(options.dryRun), baseRef };
}
