import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EngineeringSpec, Status } from "../../src/model/types.js";
import { buildChangeBrief } from "../../src/query/changeBrief.js";

interface Vector {
  name: string;
  status: Status;
  expected: {
    result: "ready" | "blocked";
    permission: "implementation" | "none";
    writableTargetIds: string[];
    protectedTargetIds: string[];
    verificationIds: string[];
  };
}

function contract(status: Status): EngineeringSpec {
  return {
    metadata: {
      specFormat: "engineering-spec",
      specFormatVersion: "0.1",
      specRevision: 1,
      id: "ES-prepare-conformance",
      title: "Prepare conformance",
      status,
      owners: [{ team: "conformance" }],
    },
    sourceRefs: [{ id: "SRC-1", type: "other", ref: "conformance" }],
    targets: [
      { id: "TARGET-write", paths: ["src/**"], changePolicy: "modify" },
      { id: "TARGET-protected", paths: ["security/**"], changePolicy: "read_only" },
    ],
    constraints: [{ id: "CON-1", level: "must", statement: "Preserve safety" }],
    verification: [{ id: "VER-1", kind: "test", proves: ["CON-1"], runner: { type: "command", argv: ["never-run"] } }],
    prose: [],
  };
}

describe("prepare conformance", () => {
  const vectors = JSON.parse(readFileSync("conformance/prepare/manifest.json", "utf8")) as Vector[];
  for (const vector of vectors) {
    it(vector.name, () => {
      const report = buildChangeBrief(contract(vector.status), {
        baseRef: "origin/main",
        baseSha: "0123456789012345678901234567890123456789",
        specPath: "specs/prepare.engineering-spec.md",
        specDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
      expect({
        result: report.result,
        permission: report.permission,
        writableTargetIds: report.writableSurfaces.map((item) => item.id),
        protectedTargetIds: report.protectedSurfaces.map((item) => item.id),
        verificationIds: report.verification.map((item) => item.id),
      }).toEqual(vector.expected);
      expect(JSON.stringify(report)).not.toContain("never-run");
    });
  }
});
