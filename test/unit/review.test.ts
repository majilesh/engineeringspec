import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildReview, reviewMarkdown, reviewText } from "../../src/cli/review.js";

const CONTRACT = `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-review
title: Review fixture
status: approved
owners: [{team: test}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: test}
\`\`\`

\`\`\`engineering-targets
- {id: TARGET-src, paths: [src/**], change_policy: modify}
\`\`\`

\`\`\`engineering-constraints
- id: CON-safe
  level: must
  statement: Stay inside reviewed scope.
  applies_to: [TARGET-src]
  enforcement: {kind: test, verifier_ref: VER-safe}
\`\`\`

\`\`\`engineering-verification
- id: VER-safe
  proves: [CON-safe]
  kind: test
  runner: {type: command, argv: [must-never-run, secret-runner-payload]}
\`\`\`
`;

async function repository(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-review-"));
  await mkdir(path.join(root, "specs"));
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "specs", "review.engineering-spec.md"), CONTRACT);
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture"]);
  return root;
}

describe("deterministic review", () => {
  it("maps paths to base authority, obligations, and verifier identities without runner payloads", async () => {
    const root = await repository();
    await writeFile(path.join(root, "src", "change.ts"), "export {};\n");
    const report = await buildReview({ specDirectory: "specs", base: "HEAD", cwd: root, strict: true });
    expect(report).toMatchObject({ valid: true, authority: "base_pinned", workingState: { changed: 1, selected: 1, violations: 0 } });
    expect(report.contracts[0]).toMatchObject({ id: "ES-review", targetIds: ["TARGET-src"] });
    expect(report.contracts[0]?.constraints.map((item) => item.id)).toEqual(["CON-safe"]);
    expect(report.contracts[0]?.verification.map((item) => item.id)).toEqual(["VER-safe"]);
    expect(JSON.stringify(report)).not.toContain("secret-runner-payload");
    const markdown = reviewMarkdown(report);
    expect(markdown).toContain("Change is inside approved scope");
    expect(markdown).not.toContain("secret-runner-payload");
    expect(reviewText(report)).toContain("obligation: CON-safe");
    expect(reviewText(report)).toContain("verification: VER-safe");
    expect(reviewText(report)).not.toContain("secret-runner-payload");
    report.routes[0]!.path = "src/odd`````name.ts\nforged: authority\u001b[31m\u061c\u202e";
    report.contracts[0]!.title = "</script><script>alert(1)</script>\nforged: pass\u061c";
    report.contracts[0]!.constraints[0]!.statement = "safe\nreview: pass\u001b[31m\u2067";
    const hostileMarkdown = reviewMarkdown(report);
    const hostileText = reviewText(report);
    expect(hostileMarkdown).toContain("`````` src/odd`````name.ts forged: authority [31m ``````");
    expect(hostileMarkdown).not.toContain("</script><script>");
    for (const rendered of [hostileMarkdown, hostileText]) {
      expect(rendered).not.toContain("\u061c");
      expect(rendered).not.toContain("\u202e");
      expect(rendered).not.toContain("\u2067");
      expect(rendered).not.toContain("\u001b");
      expect(rendered).not.toContain("\nforged:");
      expect(rendered).not.toContain("\nreview: pass");
    }
  });

  it("fails closed for an uncovered path", async () => {
    const root = await repository();
    await writeFile(path.join(root, "outside.ts"), "export {};\n");
    const report = await buildReview({ specDirectory: "specs", base: "HEAD", cwd: root, strict: true });
    expect(report.valid).toBe(false);
    expect(report.workingState.violations).toBe(1);
    expect(reviewMarkdown(report)).toContain("Change is not authorized");
  });

  it("does not present a clean repository as implementation authority", async () => {
    const root = await repository();
    const report = await buildReview({ specDirectory: "specs", base: "HEAD", cwd: root, strict: true });
    expect(report.valid).toBe(true);
    expect(reviewMarkdown(report)).toContain("No changed paths to authorize");
    expect(reviewText(report)).toContain("decision: no_changes");
  });
});
