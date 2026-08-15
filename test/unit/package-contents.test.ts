import { describe,expect,it } from "vitest";
// @ts-expect-error The release auditor is intentionally a directly executable JavaScript module.
import { validatePackageFiles } from "../../scripts/check-package-contents.mjs";

const required=[
  "LICENSE",
  "README.md",
  "SPEC.md",
  "action.yml",
  "benchmarks/agent-impact.schema.json",
  "dist/cli.js",
  "dist/index.js",
  "examples/demo/README.md",
  "integrations/README.md",
  "package.json",
  "schemas/engineering-spec-0.1.schema.json",
  "scripts/demo.mjs",
  "skills/engineering-spec/SKILL.md",
];

describe("package content policy",()=>{
  it("accepts the required public package surface",()=>expect(validatePackageFiles(required)).toEqual([]));
  it.each([
    ".private/launch-plan.md",
    "_internal/adoption-notes.md",
    ".git/config",
    ".env.production",
    "docs/launch/hacker-news.md",
    "docs/cursor-adoption-handoff.md",
    "scripts/postinstall.mjs",
    "unexpected.txt",
  ])("rejects private or unexpected content %s",file=>expect(validatePackageFiles([...required,file])).not.toEqual([]));
  it("fails when a required runtime entrypoint is absent",()=>expect(validatePackageFiles(required.filter(file=>file!=="dist/cli.js"))).toContain("required package path is missing: dist/cli.js"));
});
