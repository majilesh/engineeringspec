import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ChangedFile } from "../../src/gate/types.js";
import { classifyGovernanceChanges, type ChangeClassification } from "../../src/routing/governance.js";

interface Vector {
  name: string;
  directory: string;
  changed: ChangedFile[];
  expected: ChangeClassification;
}

describe("contract governance conformance", () => {
  const vectors = JSON.parse(readFileSync("conformance/governance/manifest.json", "utf8")) as Vector[];
  for (const vector of vectors) {
    it(vector.name, () => {
      expect(classifyGovernanceChanges(vector.directory, vector.changed)).toBe(vector.expected);
    });
  }
});
