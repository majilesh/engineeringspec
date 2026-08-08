import { describe, expect, it } from "vitest";
import {
  parseNameStatus,
  parseNameStatusZ,
  normalizeRepoPath,
  changedFromPathList,
  DiffParseError,
} from "../../src/gate/collectDiff.js";
import { gateDiff } from "../../src/gate/gate.js";
import type { EngineeringSpec } from "../../src/model/types.js";

function spec(targets: EngineeringSpec["targets"], status: EngineeringSpec["metadata"]["status"] = "draft"): EngineeringSpec {
  return {
    metadata: {
      specFormat: "engineering-spec",
      specFormatVersion: "0.1",
      specRevision: 1,
      id: "ES-gate-test",
      title: "Gate test",
      status,
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

  it("parses null-delimited name-status", () => {
    const parsed = parseNameStatusZ("A\0src/new.ts\0M\0src/a.ts\0R100\0old/name.ts\0new/name.ts\0");
    expect(parsed).toEqual([
      { path: "src/new.ts", kind: "added" },
      { path: "src/a.ts", kind: "modified" },
      { path: "new/name.ts", kind: "renamed", fromPath: "old/name.ts" },
    ]);
  });

  it("rejects unknown status codes (fail closed)", () => {
    expect(() => parseNameStatus("U\tconflict.ts\n")).toThrow(DiffParseError);
    expect(() => parseNameStatusZ("X\0weird.ts\0")).toThrow(DiffParseError);
  });

  it("rejects malformed records", () => {
    expect(() => parseNameStatus("M only\n")).toThrow(DiffParseError);
    expect(() => parseNameStatusZ("R100\0only-one\0")).toThrow(DiffParseError);
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

  it("deny-overrides: nested read_only beats broader modify", () => {
    const overlapped = spec([
      { id: "TARGET-general", paths: ["src/**"], changePolicy: "modify" },
      { id: "TARGET-secrets", paths: ["src/secrets/**"], changePolicy: "read_only" },
    ]);
    const report = gateDiff(overlapped, [{ path: "src/secrets/key.ts", kind: "modified" }]);
    expect(report.valid).toBe(false);
    expect(report.diagnostics.some((item) => item.code === "ESG003")).toBe(true);
    expect(report.violations[0]?.message).toMatch(/deny overrides allow/);
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

  it("warns that interface_only is path-scoped only", () => {
    const iface = spec([{ id: "TARGET-api", paths: ["src/api.ts"], changePolicy: "interface_only" }]);
    const report = gateDiff(iface, [{ path: "src/api.ts", kind: "modified" }]);
    expect(report.valid).toBe(true);
    expect(report.diagnostics.some((item) => item.code === "ESG006")).toBe(true);
  });

  it("enforces --require-status", () => {
    const draft = gateDiff(base, [{ path: "src/gate/gate.ts", kind: "modified" }], {
      requireStatus: ["approved"],
    });
    expect(draft.valid).toBe(false);
    expect(draft.diagnostics.some((item) => item.code === "ESG005")).toBe(true);

    const approved = gateDiff(spec(base.targets, "approved"), [{ path: "src/gate/gate.ts", kind: "modified" }], {
      requireStatus: ["approved"],
    });
    expect(approved.valid).toBe(true);
  });

  it("binds digests and commit metadata when provided", () => {
    const report = gateDiff(base, [{ path: "src/gate/gate.ts", kind: "modified" }], {
      base: "origin/main",
      head: "HEAD",
      baseSha: "a".repeat(40),
      headSha: "b".repeat(40),
      specDigest: "sha256:" + "c".repeat(64),
      specSource: "base",
    });
    expect(report.specSource).toBe("base");
    expect(report.specDigest?.startsWith("sha256:")).toBe(true);
    expect(report.changedDigest?.startsWith("sha256:")).toBe(true);
    expect(report.baseSha).toHaveLength(40);
  });
});
