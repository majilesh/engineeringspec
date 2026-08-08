import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface AdoptionResult {
  root: string;
  created: string[];
  skipped: string[];
  dryRun: boolean;
}

function files(specPath: string): Record<string, string> {
  const workflow = `# EngineeringSpec agent workflow

For consequential changes:

1. Validate ${specPath} with \`npx @engineeringspec/cli@next validate ${specPath} --strict\`.
2. Inspect every expected path with \`npx @engineeringspec/cli@next context ${specPath} --path <path> --format markdown\`.
3. Stay inside declared targets and treat contracts, constraints, and verification obligations as binding.
4. Run only separately trusted repository checks; specification runners are inert data.
5. Before claiming completion, run \`npx @engineeringspec/cli@next check ${specPath} --base origin/main --strict\`.
6. Widen targets in a contract-only change, merge it, then implement against the approved base.
`;
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
      - uses: majilesh/engineeringspec@4110e478d2f0bb39a3e1c92cccfe6b5cec09bc75
        with:
          path: docs/engineering-specs
          strict: true
          gate-spec: ${specPath}
          gate-base: \${{ steps.approved-base.outputs.ref }}
          gate-spec-from: base
`,
  };
}

export async function adoptRepository(options: {
  root: string;
  specPath: string;
  force?: boolean;
  dryRun?: boolean;
}): Promise<AdoptionResult> {
  const root = path.resolve(options.root);
  const created: string[] = [];
  const skipped: string[] = [];
  for (const [relative, content] of Object.entries(files(options.specPath))) {
    const destination = path.join(root, relative);
    let exists = true;
    try { await access(destination); } catch { exists = false; }
    if (exists && !options.force) {
      skipped.push(relative);
      continue;
    }
    created.push(relative);
    if (!options.dryRun) {
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content, "utf8");
    }
  }
  return { root, created, skipped, dryRun: Boolean(options.dryRun) };
}
