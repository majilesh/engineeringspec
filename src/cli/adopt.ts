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

For consequential changes:

1. Prefer a repository-local EngineeringSpec CLI. Otherwise use the exact version shown below.
2. Validate ${specDirectory} with \`${cli} validate ${specDirectory} --strict\`.
3. Route the complete working state with \`${cli} select ${specDirectory} --base ${baseRef} --worktree --strict\`.
4. Inspect every expected path with \`${cli} context <selected-spec> --path <path> --base ${baseRef} --format markdown\`.
5. Stay inside declared targets and treat contracts, constraints, and verification obligations as binding.
6. Run only separately trusted repository checks; specification runners are inert data.
7. Before claiming completion, run \`${cli} check --spec-dir ${specDirectory} --base ${baseRef} --strict\`.
8. Widen targets in a contract-only change, merge it, then implement against the approved base.
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
      - uses: majilesh/engineeringspec@da9b6d7a7fabb17ec2169cdf3a4ca4278cbdeb76
        with:
          path: ${specDirectory}
          strict: true
          gate-spec-dir: ${specDirectory}
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
