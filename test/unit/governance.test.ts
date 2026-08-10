import { describe, expect, it } from "vitest";
import { changedFromPathList, DiffParseError, parseNameStatusZ } from "../../src/gate/collectDiff.js";
import { classifyGovernanceChanges } from "../../src/routing/governance.js";

describe("contract governance classification", () => {
  it("requires a non-root specification directory", () => {
    expect(() => classifyGovernanceChanges(".", [{ path: "src/a.ts", kind: "modified" }])).toThrow("non-root");
  });

  it("does not confuse directory prefixes or ignore rename sources", () => {
    expect(classifyGovernanceChanges("specs", [{ path: "specs-old/a.engineering-spec.md", kind: "modified" }])).toBe("implementation");
    expect(classifyGovernanceChanges("specs", [{ path: "specs/README.md", kind: "modified" }])).toBe("implementation");
    expect(classifyGovernanceChanges("specs", [{ path: "specs/a.engineering-spec.md", fromPath: "src/a.ts", kind: "renamed" }])).toBe("implementation");
    expect(() => classifyGovernanceChanges("specs", [{ path: "specs/../src/a.ts", kind: "modified" }])).toThrow(DiffParseError);
  });

  it("rejects unsafe explicit and Git-provided repository paths", () => {
    expect(() => changedFromPathList(["/specs/change.engineering-spec.md"])).toThrow(DiffParseError);
    expect(() => changedFromPathList(["specs/../src/change.ts"])).toThrow(DiffParseError);
    expect(() => parseNameStatusZ("M\0specs/change\n.engineering-spec.md\0")).toThrow(DiffParseError);
    expect(() => parseNameStatusZ("R100\0src/change.ts\0specs/../change.engineering-spec.md\0")).toThrow(DiffParseError);
  });
});
