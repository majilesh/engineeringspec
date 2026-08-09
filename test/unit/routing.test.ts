import { describe, expect, it } from "vitest";
import { Codes } from "../../src/diagnostics/codes.js";
import { parseGitPathListZ } from "../../src/gate/loadSpec.js";
import { gateDiff } from "../../src/gate/gate.js";
import type { EngineeringSpec, TargetSurface } from "../../src/model/types.js";
import { routeChanges } from "../../src/routing/route.js";
import type { LoadedRoutingCandidate } from "../../src/routing/types.js";

function spec(id: string, status: EngineeringSpec["metadata"]["status"], targets: TargetSurface[]): EngineeringSpec {
  return {
    metadata: { specFormat: "engineering-spec", specFormatVersion: "0.1", specRevision: 1, id, title: id, status, owners: [{ team: "test" }] },
    sourceRefs: [],
    targets,
    verification: [],
    prose: [],
  };
}

function candidate(id: string, targets: TargetSurface[], status: EngineeringSpec["metadata"]["status"] = "approved"): LoadedRoutingCandidate {
  return { path: `specs/${id}.engineering-spec.md`, digest: `sha256:${id}`, spec: spec(id, status, targets) };
}

const writable = (id: string, path: string): TargetSurface => ({ id, paths: [path], changePolicy: "modify" });

describe("multi-spec routing", () => {
  it("selects the unique approved contract deterministically", () => {
    const result = routeChanges(
      [candidate("ES-z", [writable("TARGET-z", "z/**")]), candidate("ES-a", [writable("TARGET-a", "src/**")])],
      [{ path: "src/a.ts", kind: "modified" }],
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.candidates.map((item) => item.specId)).toEqual(["ES-a", "ES-z"]);
    expect(result.routes[0]).toMatchObject({ decision: "selected", selected: { specId: "ES-a", targetIds: ["TARGET-a"] } });
  });

  it("treats an empty change set without eligible contracts as not applicable", () => {
    const result = routeChanges([candidate("ES-implemented", [writable("TARGET", "src/**")], "implemented")], []);
    expect(result.diagnostics).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.candidates).toMatchObject([{ specId: "ES-implemented", eligible: false }]);
    expect(result.changedDigest).toBe("sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b");
  });

  it("fails closed for non-empty input without an eligible contract, uncovered paths, and duplicate IDs", () => {
    expect(routeChanges(
      [candidate("ES-draft", [writable("TARGET", "src/**")], "draft")],
      [{ path: "src/a.ts", kind: "modified" }],
    ).diagnostics[0]?.code).toBe(Codes.routingNoEligible);
    expect(routeChanges([candidate("ES-a", [writable("TARGET", "docs/**")])], [{ path: "src/a.ts", kind: "modified" }]).diagnostics[0]?.code).toBe(Codes.routingUncovered);
    expect(routeChanges([
      candidate("ES-duplicate", [writable("TARGET-a", "src/**")]),
      { ...candidate("ES-duplicate", [writable("TARGET-b", "lib/**")]), path: "specs/other.engineering-spec.md" },
    ], []).diagnostics[0]?.code).toBe(Codes.routingDuplicateId);
  });

  it("rejects ambiguity and applies deny-wins across contracts", () => {
    const change = [{ path: "src/secret.ts", kind: "modified" as const }];
    const ambiguous = routeChanges([
      candidate("ES-a", [writable("TARGET-a", "src/**")]),
      candidate("ES-b", [writable("TARGET-b", "src/**")]),
    ], change);
    expect(ambiguous.routes[0]?.decision).toBe("ambiguous");
    expect(ambiguous.diagnostics[0]?.code).toBe(Codes.routingAmbiguous);

    const denied = routeChanges([
      candidate("ES-allow", [writable("TARGET-allow", "src/**")]),
      candidate("ES-deny", [{ id: "TARGET-deny", paths: ["src/secret.ts"], changePolicy: "read_only" }]),
    ], change);
    expect(denied.routes[0]?.decision).toBe("denied");
    expect(denied.diagnostics[0]?.code).toBe(Codes.routingDenied);
  });

  it("routes both sides of a rename", () => {
    const result = routeChanges([
      candidate("ES-a", [{ id: "TARGET", paths: ["src/**"], changePolicy: "modify" }]),
    ], [{ path: "src/new.ts", fromPath: "src/old.ts", kind: "renamed" }]);
    expect(result.routes.map((item) => [item.path, item.kind, item.decision])).toEqual([
      ["src/new.ts", "added", "selected"],
      ["src/old.ts", "deleted", "selected"],
    ]);
  });

  it("keeps single-contract policy decisions compatible with gate", () => {
    const policies: TargetSurface["changePolicy"][] = ["modify", "create", "delete", "read_only", "interface_only", "observe"];
    const kinds = ["added", "modified", "deleted", "renamed"] as const;
    for (const policy of policies) for (const kind of kinds) {
      const engineeringSpec = spec("ES-policy", "approved", [{ id: "TARGET", paths: ["src/**"], changePolicy: policy }]);
      const changed = [{ path: "src/a.ts", kind }];
      const gateAllowed = gateDiff(engineeringSpec, changed).valid;
      const route = routeChanges([{ path: "specs/policy.engineering-spec.md", digest: "sha256:policy", spec: engineeringSpec }], changed);
      expect(route.routes[0]?.decision === "selected", `${policy}/${kind}`).toBe(gateAllowed);
    }
  });

  it("parses only safe NUL-delimited Git tree paths", () => {
    expect(parseGitPathListZ("specs/a.engineering-spec.md\0specs/b.engineering-spec.md\0")).toEqual([
      "specs/a.engineering-spec.md",
      "specs/b.engineering-spec.md",
    ]);
    expect(() => parseGitPathListZ("specs/a.engineering-spec.md\n")).toThrow("missing NUL");
    expect(() => parseGitPathListZ("../outside.engineering-spec.md\0")).toThrow("unsafe");
    expect(() => parseGitPathListZ("specs/bad\nname.engineering-spec.md\0")).toThrow("unsafe");
    expect(() => parseGitPathListZ("specs/a.engineering-spec.md\0specs/a.engineering-spec.md\0")).toThrow("Duplicate");
  });
});
