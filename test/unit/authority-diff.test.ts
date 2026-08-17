import { describe, expect, it } from "vitest";
import type { EngineeringSpec } from "../../src/model/types.js";
import { buildAuthorityDiff } from "../../src/authority/diff.js";
import { isSafeImplementedClosure } from "../../src/normalizer/digest.js";

function contract(): EngineeringSpec {
  return {
    metadata: { specFormat: "engineering-spec", specFormatVersion: "0.1", specRevision: 1, id: "ES-1", title: "Change", status: "approved", owners: [{ team: "test" }] },
    sourceRefs: [{ id: "SRC-1", type: "other", ref: "test" }],
    targets: [{ id: "TARGET-1", paths: ["src/**"], changePolicy: "modify" }],
    constraints: [{ id: "CON-1", level: "must", statement: "Safe" }],
    verification: [{ id: "VER-1", proves: ["CON-1"], kind: "test", runner: { type: "command", argv: ["secret", "payload"] } }],
    prose: [],
  };
}

describe("semantic authority diff", () => {
  it("recognizes only an exact approved-to-implemented close", () => {
    const before = contract();
    const after = structuredClone(before);
    after.metadata.status = "implemented";
    after.metadata.updatedAt = "2026-08-17T00:00:00Z";
    expect(isSafeImplementedClosure(before, after)).toBe(true);
    expect(buildAuthorityDiff(before, after)).toMatchObject({ authorityChanged: false, safeMonotonicClose: true, lifecycle: { from: "approved", to: "implemented" } });
    after.targets[0]!.paths.push("admin/**");
    expect(buildAuthorityDiff(before, after)).toMatchObject({ authorityChanged: true, safeMonotonicClose: false, targets: [{ id: "TARGET-1", change: "modified" }] });
  });

  it("does not expose runner payloads in the diff model", () => {
    const before = contract();
    const after = structuredClone(before);
    after.verification[0]!.runner = { type: "command", argv: ["other-secret"] };
    const report = buildAuthorityDiff(before, after);
    expect(report.verifiers).toHaveLength(1);
    expect(JSON.stringify(report)).not.toContain("secret");
  });
});
