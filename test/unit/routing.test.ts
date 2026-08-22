import { describe, expect, it } from "vitest";
import { Codes } from "../../src/diagnostics/codes.js";
import { parseGitPathListZ } from "../../src/gate/loadSpec.js";
import { gateDiff } from "../../src/gate/gate.js";
import type { EngineeringSpec, TargetSurface } from "../../src/model/types.js";
import { routeChanges } from "../../src/routing/route.js";
import { assertRoutingCandidateLimit } from "../../src/routing/loadCandidates.js";
import type { LoadedRoutingCandidate } from "../../src/routing/types.js";
import { closureSemanticDigest } from "../../src/normalizer/digest.js";

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
  it("enforces the shared candidate ceiling at the exact boundary", () => {
    expect(() => assertRoutingCandidateLimit(10_000)).not.toThrow();
    expect(() => assertRoutingCandidateLimit(10_001)).toThrow("Routing candidate limit exceeded");
  });
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
    expect(routeChanges([candidate("ES-a", [writable("TARGET", "docs/**")])], [{ path: "src/a.ts", kind: "modified" }]).diagnostics[0]?.hint).toBe("Merge a contract-only target amendment before implementing this path.");
    expect(routeChanges([candidate("ES-a", [writable("TARGET", "docs/**")])], [{ path: "specs/other.engineering-spec.md", kind: "modified" }]).diagnostics[0]?.hint).toBe("Merge a contract-only target amendment before implementing this path.");
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
    expect(ambiguous.routes[0]).toMatchObject({ allows: [{ specId: "ES-a" }, { specId: "ES-b" }], denies: [] });
    expect(ambiguous.diagnostics[0]?.code).toBe(Codes.routingAmbiguous);

    const denied = routeChanges([
      candidate("ES-allow", [writable("TARGET-allow", "src/**")]),
      candidate("ES-deny", [{ id: "TARGET-deny", paths: ["src/secret.ts"], changePolicy: "read_only" }]),
    ], change);
    expect(denied.routes[0]?.decision).toBe("denied");
    expect(denied.routes[0]).toMatchObject({ allows: [{ specId: "ES-allow" }], denies: [{ specId: "ES-deny" }] });
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

  it("explains mixed contract and implementation changes without interrupting fail-closed routing", () => {
    const result = routeChanges([
      candidate("ES-a", [writable("TARGET-a", "src/**")]),
    ], [
      { path: "specs/change.engineering-spec.md", kind: "modified" },
      { path: "src/change.ts", kind: "modified" },
    ]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "info", message: expect.stringContaining("Contract-only handling is unavailable") }),
      expect.objectContaining({ severity: "error", file: "specs/change.engineering-spec.md", hint: expect.stringContaining("Split specification") }),
    ]));
    expect(result.diagnostics.find((item) => item.file === "specs/change.engineering-spec.md")?.hint).not.toContain("--allow-contract-only");
    expect(result.routes).toHaveLength(2);
    expect(result.routes.find((route) => route.path === "src/change.ts")?.decision).toBe("selected");
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

  it("applies exact trusted subtractive sequencing and records pinned audit identity",()=>{
    const feature=candidate("ES-feature",[writable("TARGET-feature","package.json")]);
    feature.spec.metadata.specRevision=4;
    const maintenance=candidate("ES-maintenance",[writable("TARGET-maintenance","package.json")]);
    maintenance.spec.authorityControls={mode:"maintenance",suspensions:[{contractId:"ES-feature",specRevision:4,semanticDigest:closureSemanticDigest(feature.spec),paths:["package.json"]}]};
    const result=routeChanges([feature,maintenance],[{path:"package.json",kind:"modified"}],undefined,{baseSha:"a".repeat(40)});
    expect(result.diagnostics).toEqual([]);
    expect(result.routes[0]).toMatchObject({decision:"selected",selected:{specId:"ES-maintenance"},allows:[{specId:"ES-maintenance"}]});
    expect(result.sequencing).toMatchObject([{trustedBaseSha:"a".repeat(40),applied:true,path:"package.json",controller:{specId:"ES-maintenance"},referenced:{specId:"ES-feature",specRevision:4},remainingPositiveClaims:[{specId:"ES-maintenance"}]}]);
  });

  it("fails closed for stale, chained, cyclic, competing, or inapplicable controls",()=>{
    const feature=candidate("ES-feature",[writable("TARGET-feature","package.json")]);feature.spec.metadata.specRevision=4;
    const makeController=(id:string,digest=closureSemanticDigest(feature.spec))=>{
      const item=candidate(id,[writable(`TARGET-${id}`,"package.json")]);
      item.spec.authorityControls={mode:"maintenance",suspensions:[{contractId:"ES-feature",specRevision:4,semanticDigest:digest,paths:["package.json"]}]};
      return item;
    };
    const stale=routeChanges([feature,makeController("ES-stale","sha256:"+"0".repeat(64))],[{path:"package.json",kind:"modified"}]);
    expect(stale.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({code:Codes.routingInvalidSequencing,message:expect.stringContaining("stale semantic digest")}),expect.objectContaining({code:Codes.routingAmbiguous})]));
    const staleRevision=makeController("ES-stale-revision");staleRevision.spec.authorityControls!.suspensions[0]!.specRevision=3;
    expect(routeChanges([feature,staleRevision],[{path:"package.json",kind:"modified"}]).diagnostics.some(item=>item.code===Codes.routingInvalidSequencing&&item.message.includes("stale revision"))).toBe(true);

    const chainFeature=structuredClone(feature);chainFeature.spec.authorityControls={mode:"maintenance",suspensions:[{contractId:"ES-other",specRevision:1,semanticDigest:"sha256:"+"1".repeat(64),paths:["package.json"]}]};
    const chained=makeController("ES-chain",closureSemanticDigest(chainFeature.spec));
    const other=candidate("ES-other",[writable("TARGET-other","package.json")]);
    expect(routeChanges([chainFeature,chained,other],[{path:"package.json",kind:"modified"}]).diagnostics.some(item=>item.code===Codes.routingInvalidSequencing&&item.message.includes("cannot chain"))).toBe(true);

    const cycleLeft=candidate("ES-cycle-left",[writable("TARGET-cycle-left","package.json")]);
    const cycleRight=candidate("ES-cycle-right",[writable("TARGET-cycle-right","package.json")]);
    cycleLeft.spec.authorityControls={mode:"maintenance",suspensions:[{contractId:"ES-cycle-right",specRevision:1,semanticDigest:closureSemanticDigest(cycleRight.spec),paths:["package.json"]}]};
    cycleRight.spec.authorityControls={mode:"maintenance",suspensions:[{contractId:"ES-cycle-left",specRevision:1,semanticDigest:closureSemanticDigest(cycleLeft.spec),paths:["package.json"]}]};
    const cyclic=routeChanges([cycleLeft,cycleRight],[{path:"package.json",kind:"modified"}]);
    expect(cyclic.routes[0]?.decision).toBe("ambiguous");
    expect(cyclic.diagnostics.some(item=>item.code===Codes.routingInvalidSequencing&&item.message.includes("cannot chain"))).toBe(true);

    const competing=routeChanges([feature,makeController("ES-one"),makeController("ES-two")],[{path:"package.json",kind:"modified"}]);
    expect(competing.diagnostics.some(item=>item.code===Codes.routingInvalidSequencing&&item.message.includes("Competing trusted maintenance controllers"))).toBe(true);

    const addedOnly=structuredClone(feature);addedOnly.spec.targets=[{id:"TARGET-create",paths:["package.json"],changePolicy:"create"}];
    const wrongKind=makeController("ES-wrong-kind",closureSemanticDigest(addedOnly.spec));wrongKind.spec.targets=[{id:"TARGET-create-controller",paths:["package.json"],changePolicy:"create"}];
    expect(routeChanges([addedOnly,wrongKind],[{path:"package.json",kind:"modified"}]).diagnostics.some(item=>item.code===Codes.routingInvalidSequencing&&item.message.includes("do not both positively authorize"))).toBe(true);
  });

  it("preserves deny-wins after a valid positive-claim subtraction",()=>{
    const feature=candidate("ES-feature",[writable("TARGET-feature","package.json")]);
    const maintenance=candidate("ES-maintenance",[writable("TARGET-maintenance","package.json")]);
    maintenance.spec.authorityControls={mode:"maintenance",suspensions:[{contractId:"ES-feature",specRevision:1,semanticDigest:closureSemanticDigest(feature.spec),paths:["package.json"]}]};
    const denial=candidate("ES-deny",[{id:"TARGET-deny",paths:["package.json"],changePolicy:"read_only"}]);
    const result=routeChanges([feature,maintenance,denial],[{path:"package.json",kind:"modified"}]);
    expect(result.routes[0]).toMatchObject({decision:"denied",denies:[{specId:"ES-deny"}],allows:[{specId:"ES-maintenance"}]});
    expect(result.sequencing[0]).toMatchObject({applied:true,denyClaims:[{specId:"ES-deny"}]});
  });
});
