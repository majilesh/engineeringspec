import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EngineeringSpec, TargetSurface } from "../../src/model/types.js";
import { routeChanges } from "../../src/routing/route.js";
import type { LoadedRoutingCandidate } from "../../src/routing/types.js";

interface Vector {
  name: string;
  candidates: Array<{
    id: string;
    status: EngineeringSpec["metadata"]["status"];
    targets: Array<{ id: string; path: string; policy: TargetSurface["changePolicy"] }>;
  }>;
  changed: Array<{ path: string; kind: "added" | "modified" | "deleted" | "renamed" }>;
  expected: { decisions: string[]; codes: string[]; changedDigest: string };
}

function candidate(vector: Vector["candidates"][number]): LoadedRoutingCandidate {
  return {
    path: `specs/${vector.id}.engineering-spec.md`,
    digest: `sha256:${vector.id}`,
    spec: {
      metadata: { specFormat: "engineering-spec", specFormatVersion: "0.1", specRevision: 1, id: vector.id, title: vector.id, status: vector.status, owners: [{ team: "test" }] },
      sourceRefs: [],
      targets: vector.targets.map((target) => ({ id: target.id, paths: [target.path], changePolicy: target.policy })),
      verification: [],
      prose: [],
    },
  };
}

describe("routing conformance", () => {
  const vectors = JSON.parse(readFileSync("conformance/routing/manifest.json", "utf8")) as Vector[];
  for (const vector of vectors) {
    it(vector.name, () => {
      const result = routeChanges(vector.candidates.map(candidate), vector.changed);
      expect(result.routes.map((item) => item.decision)).toEqual(vector.expected.decisions);
      expect(result.diagnostics.map((item) => item.code)).toEqual(vector.expected.codes);
      expect(result.changedDigest).toBe(vector.expected.changedDigest);
    });
  }
});
