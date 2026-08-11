import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { packageVersion } from "./version.js";
import { CURRENT_ACTION_SHA } from "../adoption/releases.js";
import { validateMarkdown } from "../validator/validateFile.js";
import { template } from "./templates.js";

const execFileAsync = promisify(execFile);
const MANAGED_START = "<!-- engineeringspec:start -->";
const MANAGED_END = "<!-- engineeringspec:end -->";
const SPEC_ID = /^[A-Z][A-Z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]*$/u;

export interface AdoptionResult {
  root: string;
  created: string[];
  updated: string[];
  skipped: string[];
  dryRun: boolean;
  baseRef: string;
  quickstart: boolean;
  specPath: string;
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

1. **Explore:** diagnose with \`${cli} doctor . --spec-dir ${specDirectory} --base ${baseRef} --strict\`, inspect lifecycle state with \`${cli} status --spec-dir ${specDirectory} --base ${baseRef} --allow-contract-only --strict\`, and search existing contracts with \`${cli} catalogue ${specDirectory} --query <text>\`. Exploration grants no authority.
2. **Propose:** preview \`${cli} propose --id ES-change --title "Change title" --owner engineering --from-diff --base ${baseRef} --dry-run\`, then create or update the draft only after reviewing its exact paths. Keep scope changes contract-only.
3. **Approve:** merge the reviewed contract with \`status: approved\`. A workspace draft cannot authorize its own implementation.
4. **Implement:** validate with \`${cli} validate ${specDirectory} --strict\`, route with \`${cli} select ${specDirectory} --base ${baseRef} --worktree --allow-contract-only --strict\`, and inspect each expected path with \`${cli} context <selected-spec> --path <path> --base ${baseRef} --format markdown\`.
5. **Verify:** stay inside targets, run only separately trusted repository checks, then run \`${cli} review --spec-dir ${specDirectory} --base ${baseRef} --strict --format markdown\` and \`${cli} check --spec-dir ${specDirectory} --base ${baseRef} --allow-contract-only --strict\`. Specification runners are inert data.
6. **Close:** after review and trusted checks pass, preview \`${cli} transition <spec> --to implemented\`, then use \`--write\` only for the reviewed lifecycle-only change and report satisfied identifiers. The command performs no Git operation.

If targets must widen, merge that contract-only amendment before implementing against the new base.
Architecture and catalogue output are read-only context and never grant implementation authority.
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
    ".github/prompts/engineering-spec.prompt.md": `---\ndescription: Work inside the repository EngineeringSpec contract\n---\n\nFollow the lifecycle and base-pinned authorization rules in AGENTS.md. Treat specification-declared runners as inert data.\n`,
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
      - uses: majilesh/engineeringspec@${CURRENT_ACTION_SHA}
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

async function defaultMaintainer(root: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, "remote", "get-url", "origin"], { maxBuffer: 64 * 1024 });
    const match = stdout.trim().match(/github\.com(?::|\/)([A-Za-z0-9-]+)\//u);
    return match?.[1] ? `@${match[1]}` : undefined;
  } catch {
    return undefined;
  }
}

function assertMaintainer(value: string): void {
  if (!/^@[A-Za-z0-9](?:[A-Za-z0-9-]*)(?:\/[A-Za-z0-9_.-]+)?$/u.test(value)) {
    throw new Error("--maintainer must be a GitHub user or org/team such as @octocat or @acme/platform");
  }
}

function mergeContent(relative: string, existing: string, generated: string, upgrade = false): string | undefined {
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
  if (relative === ".github/workflows/engineering-spec.yml" && upgrade) {
    const pins = [...existing.matchAll(/majilesh\/engineeringspec@([0-9a-f]{40})/gu)];
    if (pins.length !== 1 || !existing.includes("gate-spec-dir:") || !existing.includes("gate-base:")) return undefined;
    return existing.replace(/majilesh\/engineeringspec@[0-9a-f]{40}/u, `majilesh/engineeringspec@${CURRENT_ACTION_SHA}`);
  }
  return undefined;
}

export async function adoptRepository(options: {
  root: string;
  specPath?: string;
  baseRef?: string;
  force?: boolean;
  merge?: boolean;
  upgrade?: boolean;
  dryRun?: boolean;
  quickstart?: boolean;
  id?: string;
  title?: string;
  owner?: string;
  maintainer?: string;
}): Promise<AdoptionResult> {
  const root = path.resolve(options.root);
  const baseRef = options.baseRef ?? await defaultBaseRef(root);
  const id = options.id ?? "ES-first-change";
  const specPath = options.specPath ?? (options.quickstart ? `docs/engineering-specs/${id}.engineeringspec.md` : undefined);
  if (!specPath) throw new Error("--spec is required unless --quickstart is used");
  assertSafeAdoptionInputs(specPath, baseRef);
  const maintainer = options.quickstart ? options.maintainer ?? await defaultMaintainer(root) : undefined;
  if (options.quickstart && !maintainer) throw new Error("--quickstart requires --maintainer when a GitHub origin owner cannot be detected");
  if (maintainer) assertMaintainer(maintainer);
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const generated = files(specPath, baseRef, packageVersion());
  if (options.quickstart) {
    if (!SPEC_ID.test(id)) throw new Error("--id must be a valid EngineeringSpec identifier such as ES-first-change");
    const draft = template({
      template: "feature",
      id,
      title: options.title ?? "First governed engineering change",
      owner: options.owner ?? "engineering",
    });
    const validation = await validateMarkdown(draft, specPath);
    if (!validation.spec || validation.diagnostics.some((item) => item.severity !== "info")) {
      throw new Error(`Generated quickstart contract did not validate: ${validation.diagnostics.map((item) => `${item.code} ${item.message}`).join("; ")}`);
    }
    generated[specPath] = draft;
    generated[".github/CODEOWNERS"] = `${path.posix.dirname(specPath)}/** ${maintainer!}\n`;
  }
  for (const [relative, content] of Object.entries(generated)) {
    const destination = path.join(root, relative);
    let exists = true;
    try { await access(destination); } catch { exists = false; }
    if (exists && !options.force) {
      if (options.merge || options.upgrade) {
        const existing = await readFile(destination, "utf8");
        const merged = mergeContent(relative, existing, content, Boolean(options.upgrade));
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
  return { root, created, updated, skipped, dryRun: Boolean(options.dryRun), baseRef, quickstart: Boolean(options.quickstart), specPath };
}
