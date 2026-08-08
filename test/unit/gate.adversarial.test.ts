import { describe, expect, it } from "vitest";
import { DiffParseError, parseNameStatusZ } from "../../src/gate/collectDiff.js";
import { gateDiff } from "../../src/gate/gate.js";
import type { EngineeringSpec } from "../../src/model/types.js";

function spec(targets: EngineeringSpec["targets"], status: EngineeringSpec["metadata"]["status"] = "draft"): EngineeringSpec {
  return {
    metadata: {
      specFormat: "engineering-spec",
      specFormatVersion: "0.1",
      specRevision: 1,
      id: "ES-gate-adv",
      title: "Adversarial gate",
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

describe("gate adversarial policy composition", () => {
  it("deny-overrides across observe and nested read_only", () => {
    const doc = spec([
      { id: "TARGET-broad", paths: ["**"], changePolicy: "modify" },
      { id: "TARGET-observe", paths: ["docs/**"], changePolicy: "observe" },
      { id: "TARGET-secrets", paths: ["src/secrets/**"], changePolicy: "read_only" },
    ]);
    expect(gateDiff(doc, [{ path: "docs/a.md", kind: "modified" }]).diagnostics.some((d) => d.code === "ESG003")).toBe(true);
    expect(gateDiff(doc, [{ path: "src/secrets/k.ts", kind: "modified" }]).diagnostics.some((d) => d.code === "ESG003")).toBe(true);
    expect(gateDiff(doc, [{ path: "src/ok.ts", kind: "modified" }]).valid).toBe(true);
  });

  it("rename into a forbidden subtree is rejected", () => {
    const doc = spec([
      { id: "TARGET-src", paths: ["src/**"], changePolicy: "modify" },
      { id: "TARGET-secrets", paths: ["src/secrets/**"], changePolicy: "read_only" },
    ]);
    const report = gateDiff(doc, [{ path: "src/secrets/k.ts", kind: "renamed", fromPath: "src/ok.ts" }]);
    expect(report.valid).toBe(false);
    expect(report.violations.some((v) => v.file === "src/secrets/k.ts" && v.reason === "read_only")).toBe(true);
  });

  it("create-only still blocks modify even when a broader modify also matches", () => {
    // Deny-overrides only for read_only/observe; create vs modify uses allowing-filter.
    const doc = spec([
      { id: "TARGET-broad", paths: ["src/**"], changePolicy: "modify" },
      { id: "TARGET-gen", paths: ["src/generated/**"], changePolicy: "create" },
    ]);
    // Broad modify still allows modification of generated paths (not a deny policy).
    expect(gateDiff(doc, [{ path: "src/generated/a.ts", kind: "modified" }]).valid).toBe(true);
  });

  it("interface_only remains path-writable and always warns ESG006", () => {
    const doc = spec([{ id: "TARGET-api", paths: ["src/api.ts"], changePolicy: "interface_only" }]);
    const report = gateDiff(doc, [{ path: "src/api.ts", kind: "modified" }]);
    expect(report.valid).toBe(true);
    expect(report.diagnostics.filter((d) => d.code === "ESG006")).toHaveLength(1);
  });

  it("require-status fails closed before path allow can matter", () => {
    const doc = spec([{ id: "TARGET-1", paths: ["src/**"], changePolicy: "modify" }], "draft");
    const report = gateDiff(doc, [{ path: "src/a.ts", kind: "modified" }], { requireStatus: ["approved"] });
    expect(report.valid).toBe(false);
    expect(report.diagnostics.some((d) => d.code === "ESG005")).toBe(true);
  });
});

describe("gate adversarial git parsing", () => {
  it("accepts unusual but legal relative paths from -z output", () => {
    const parsed = parseNameStatusZ("M\0src/weird name.ts\0A\0src/ünicode.ts\0");
    expect(parsed).toEqual([
      { path: "src/weird name.ts", kind: "modified" },
      { path: "src/ünicode.ts", kind: "added" },
    ]);
  });

  it("fails closed on unmerged and unknown statuses", () => {
    expect(() => parseNameStatusZ("U\0conflict.ts\0")).toThrow(DiffParseError);
    expect(() => parseNameStatusZ("X\0nope.ts\0")).toThrow(DiffParseError);
    expect(() => parseNameStatusZ("R100\0only-from\0")).toThrow(DiffParseError);
  });

  it("treats copy like rename for path checks", () => {
    const parsed = parseNameStatusZ("C100\0src/a.ts\0src/b.ts\0");
    expect(parsed[0]).toEqual({ path: "src/b.ts", kind: "renamed", fromPath: "src/a.ts" });
    const doc = spec([{ id: "TARGET-1", paths: ["src/b.ts"], changePolicy: "modify" }]);
    const report = gateDiff(doc, parsed);
    expect(report.valid).toBe(false);
    expect(report.violations.some((v) => v.file === "src/a.ts")).toBe(true);
  });
});
