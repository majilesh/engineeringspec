import { describe, expect, it } from "vitest";
import { parseNameStatus, normalizeRepoPath, changedFromPathList } from "../../src/gate/collectDiff.js";
import { gateDiff } from "../../src/gate/gate.js";
import type { EngineeringSpec } from "../../src/model/types.js";

function spec(targets: EngineeringSpec["targets"]): EngineeringSpec {
  return {
    metadata: {
      specFormat: "engineering-spec",
      specFormatVersion: "0.1",
      specRevision: 1,
      id: "ES-gate-test",
      title: "Gate test",
      status: "draft",
      owners: [{ team: "test" }],
    },
    sourceRefs: [{ id: "SRC-1", type: "other", ref: "test" }],
    targets,
    verification: [{ id: "VER-1", proves: ["CON-1"], kind: "test", runner: { type: "reference", reference: "tests" } }],
    constraints: [{ id: "CON-1", level: "must", statement: "safe", enforcement: { kind: "test", verifierRef: "VER-1" } }],
    prose: [],
  };
}

describe("gate collectDiff", () => {
  it("parses name-status including renames", () => {
    const parsed = parseNameStatus("A\tsrc/new.ts\nM\tsrc/a.ts\nD\told.ts\nR100\told/name.ts\tnew/name.ts\n");
    expect(parsed).toEqual([
      { path: "src/new.ts", kind: "added" },
      { path: "src/a.ts", kind: "modified" },
      { path: "old.ts", kind: "deleted" },
      { path: "new/name.ts", kind: "renamed", fromPath: "old/name.ts" },
    ]);
  });

  it("normalizes paths", () => {
    expect(normalizeRepoPath(".\\src\\x.ts")).toBe("src/x.ts");
    expect(changedFromPathList(["./a.ts"])[0]?.path).toBe("a.ts");
  });
});

describe("gateDiff", () => {
  const base = spec([
    { id: "TARGET-1", paths: ["src/gate/**"], changePolicy: "modify" },
    { id: "TARGET-2", paths: ["src/secrets/**"], changePolicy: "read_only" },
    { id: "TARGET-3", paths: ["src/new/**"], changePolicy: "create" },
  ]);

  it("allows in-scope modifications", () => {
    const report = gateDiff(base, [{ path: "src/gate/gate.ts", kind: "modified" }]);
    expect(report.valid).toBe(true);
    expect(report.violations).toEqual([]);
  });

  it("rejects out-of-scope files", () => {
    const report = gateDiff(base, [{ path: "src/cli/program.ts", kind: "modified" }]);
    expect(report.valid).toBe(false);
    expect(report.diagnostics[0]?.code).toBe("ESG001");
  });

  it("rejects read_only matches", () => {
    const report = gateDiff(base, [{ path: "src/secrets/key.ts", kind: "modified" }]);
    expect(report.valid).toBe(false);
    expect(report.diagnostics[0]?.code).toBe("ESG003");
  });

  it("rejects modify against create-only targets", () => {
    const report = gateDiff(base, [{ path: "src/new/file.ts", kind: "modified" }]);
    expect(report.valid).toBe(false);
    expect(report.diagnostics[0]?.code).toBe("ESG002");
  });

  it("allows added files under create policy", () => {
    const report = gateDiff(base, [{ path: "src/new/file.ts", kind: "added" }]);
    expect(report.valid).toBe(true);
  });

  it("checks both sides of renames", () => {
    const report = gateDiff(base, [{ path: "src/gate/b.ts", kind: "renamed", fromPath: "src/cli/a.ts" }]);
    expect(report.valid).toBe(false);
    expect(report.violations.some((item) => item.file === "src/cli/a.ts")).toBe(true);
  });
});
