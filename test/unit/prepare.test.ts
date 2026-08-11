import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareChange, prepareMarkdown, prepareText } from "../../src/cli/prepare.js";
import type { EngineeringSpec } from "../../src/model/types.js";
import { buildChangeBrief } from "../../src/query/changeBrief.js";

function spec(status: EngineeringSpec["metadata"]["status"] = "approved"): EngineeringSpec {
  return {
    metadata: {
      specFormat: "engineering-spec",
      specFormatVersion: "0.1",
      specRevision: 3,
      id: "ES-prepare",
      title: "Prepare fixture",
      status,
      owners: [{ team: "test" }],
      repository: { ref: "acme/repo" },
      baseRevision: "abc123",
    },
    sourceRefs: [
      { id: "SRC-2", type: "document", ref: "intent.md" },
      { id: "SRC-1", type: "github_issue", ref: "42", digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    ],
    targets: [
      { id: "TARGET-write", paths: ["src/**"], changePolicy: "modify" },
      { id: "TARGET-read", paths: ["secrets/**"], changePolicy: "read_only" },
    ],
    constraints: [
      { id: "CON-2", level: "escalate", statement: "Confirm the migration owner", enforcement: { kind: "review", reviewerRole: "owner" } },
      { id: "CON-1", level: "must", statement: "Preserve compatibility", enforcement: { kind: "test", verifierRef: "VER-1" } },
    ],
    contracts: [{ id: "CONTRACT-1", kind: "json_schema", path: "schema.json", compatibility: "backward_compatible" }],
    verification: [{
      id: "VER-1",
      proves: ["CON-1"],
      kind: "test",
      runner: { type: "command", argv: ["secret-command", "secret-payload"] },
    }],
    prose: [],
  };
}

const authority = {
  baseRef: "origin/main",
  baseSha: "0123456789012345678901234567890123456789",
  specPath: "specs/change.engineering-spec.md",
  specDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
};

function markdown(status: EngineeringSpec["metadata"]["status"], id = "ES-prepare"): string {
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${id}
title: Prepare repository fixture
status: ${status}
owners: [{team: test}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: document, ref: intent.md}
\`\`\`
\`\`\`engineering-targets
- {id: TARGET-1, paths: [src/**], change_policy: modify}
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Safe, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: {type: command, argv: [secret-command, secret-payload]}
\`\`\`
`;
}

describe("pre-code preparation brief", () => {
  it("reports deterministic approved authority without runner payloads", () => {
    const report = buildChangeBrief(spec(), authority);
    expect(report).toMatchObject({
      result: "ready",
      permission: "implementation",
      contract: { id: "ES-prepare", specRevision: 3, status: "approved" },
      access: { reading: "repository_reading_allowed_for_correctness", writing: "only_declared_writable_surfaces" },
      writableSurfaces: [{ id: "TARGET-write" }],
      protectedSurfaces: [{ id: "TARGET-read" }],
      constraints: [{ id: "CON-1" }, { id: "CON-2" }],
      verification: [{ id: "VER-1", runnerType: "command", runnerInert: true }],
      unresolvedQuestions: [{ id: "CON-2", question: "Confirm the migration owner" }],
    });
    expect(JSON.stringify(report)).not.toContain("secret-command");
    expect(JSON.stringify(report)).not.toContain("secret-payload");
    expect(prepareText(report)).toContain("read access: repository reading is allowed");
    expect(prepareMarkdown(report)).toContain("Base-pinned implementation authority is ready");
  });

  it("does not expose writable authority for a non-approved lifecycle", () => {
    const report = buildChangeBrief(spec("proposed"), authority);
    expect(report).toMatchObject({ result: "blocked", permission: "none", writableSurfaces: [] });
    expect(report.action).toContain("approval-only");
    expect(prepareText(report)).toContain("prepare: blocked");
    expect(prepareMarkdown(report)).toContain("Implementation is blocked");
  });

  it("loads exactly one contract from the immutable base and blocks missing or closed authority", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-prepare-"));
    await mkdir(path.join(root, "specs"));
    await writeFile(path.join(root, "specs", "approved.engineering-spec.md"), markdown("approved"));
    await writeFile(path.join(root, "specs", "closed.engineering-spec.md"), markdown("implemented", "ES-closed"));
    execFileSync("git", ["init", "-q", root]);
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);

    const ready = await prepareChange({ contractId: "ES-prepare", specDirectory: "specs", base: "HEAD", strict: true, cwd: root });
    expect(ready).toMatchObject({ result: "ready", permission: "implementation", authority: { kind: "base_pinned" } });

    await writeFile(path.join(root, "specs", "approved.engineering-spec.md"), markdown("proposed"));
    const stillBasePinned = await prepareChange({ contractId: "ES-prepare", specDirectory: "specs", base: "HEAD", strict: true, cwd: root });
    expect(stillBasePinned).toMatchObject({ result: "ready", permission: "implementation", contract: { status: "approved" } });

    await writeFile(path.join(root, "specs", "duplicate.engineering-spec.md"), markdown("approved"));
    execFileSync("git", ["-C", root, "add", "."]);
    execFileSync("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "ambiguous"]);
    const ambiguous = await prepareChange({ contractId: "ES-prepare", specDirectory: "specs", base: "HEAD", strict: true, cwd: root });
    expect(ambiguous).toMatchObject({ result: "blocked", permission: "none" });
    expect(ambiguous.reason).toContain("ambiguous");

    const closed = await prepareChange({ contractId: "ES-closed", specDirectory: "specs", base: "HEAD", strict: true, cwd: root });
    expect(closed).toMatchObject({ result: "blocked", permission: "none", writableSurfaces: [] });
    const missing = await prepareChange({ contractId: "ES-missing", specDirectory: "specs", base: "HEAD", strict: true, cwd: root });
    expect(missing).toMatchObject({ result: "blocked", permission: "none", contract: { id: "ES-missing" } });
    const hostile = await prepareChange({ contractId: "ES-missing\npermission: implementation", specDirectory: "specs", base: "HEAD", strict: true, cwd: root });
    expect(prepareText(hostile)).not.toContain("\npermission: implementation");
  });
});
