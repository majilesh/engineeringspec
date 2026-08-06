import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { discoverEngineeringSpecs, isEngineeringSpecFilename } from "../../src/discovery/discover.js";
import { validatePath } from "../../src/validator/validatePath.js";
import { template } from "../../src/cli/templates.js";

const valid = (id: string) => template({ template: "feature", id, title: id, owner: "test" });

describe("EngineeringSpec discovery", () => {
  it.each([
    ["ENGINEERING_SPEC.md", true],
    ["feature.engineering-spec.md", true],
    ["feature.engineeringspec.md", true],
    ["README.md", false],
    ["engineering-spec.md", false],
  ])("recognizes %s", (file, expected) => expect(isEngineeringSpecFilename(file)).toBe(expected));

  it("discovers deterministically and respects .engineeringspecignore", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-discovery-"));
    await mkdir(path.join(root, "nested"));
    await mkdir(path.join(root, "ignored"));
    await mkdir(path.join(root, "node_modules"));
    await writeFile(path.join(root, "z.engineering-spec.md"), valid("ES-z"));
    await writeFile(path.join(root, "nested", "a.engineeringspec.md"), valid("ES-a"));
    await writeFile(path.join(root, "ignored", "hidden.engineering-spec.md"), valid("ES-hidden"));
    await writeFile(path.join(root, "node_modules", "dependency.engineering-spec.md"), valid("ES-dependency"));
    await writeFile(path.join(root, ".engineeringspecignore"), "ignored/**\n");
    const found = await discoverEngineeringSpecs(root);
    expect(found.map((file) => path.relative(root, file))).toEqual([
      path.join("nested", "a.engineeringspec.md"),
      "z.engineering-spec.md",
    ]);
  });

  it("validates every discovered document and reports an empty directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-validation-"));
    expect((await validatePath(root)).diagnostics[0]?.code).toBe("ESD001");
    await writeFile(path.join(root, "valid.engineering-spec.md"), valid("ES-valid"));
    await writeFile(path.join(root, "invalid.engineering-spec.md"), "# no frontmatter\n");
    const report = await validatePath(root);
    expect(report.valid).toBe(false);
    expect(report.files).toHaveLength(2);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("returns one supported file and ignores an unsupported explicit file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-file-"));
    const supported = path.join(root, "ENGINEERING_SPEC.md");
    const unsupported = path.join(root, "notes.md");
    await writeFile(supported, valid("ES-single"));
    await writeFile(unsupported, "notes");
    expect(await discoverEngineeringSpecs(supported)).toEqual([supported]);
    expect(await discoverEngineeringSpecs(unsupported)).toEqual([]);
  });
});
