import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Repository maintenance tooling intentionally runs directly as JavaScript.
import { actionMetadataErrors, collectResults, commandErrors, documentedCommands, exampleErrors, externalLinkErrors, localLinkErrors, packageIdentityErrors, ruleErrors, schemaErrors, versionErrors } from "../../scripts/check-repository-integrity.mjs";
// @ts-expect-error Repository generator intentionally runs directly as JavaScript.
import { generateProjectState, generatedOutputs, projectState, root } from "../../scripts/generate-project-state.mjs";
// @ts-expect-error Repository generator intentionally runs directly as JavaScript.
import { generateSite } from "../../scripts/generate-site.mjs";

const temps: string[] = [];
async function temporary() {
  const directory = await mkdtemp(path.join(tmpdir(), "es-integrity-"));
  temps.push(directory);
  return directory;
}
afterEach(async () => { await Promise.all(temps.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("repository integrity", () => {
  it("detects lockfile and public version drift while preserving exact historical lines", async () => {
    const state = await projectState();
    const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
    const config = JSON.parse(await readFile("engineering/repository-consistency.json", "utf8"));
    expect(packageIdentityErrors(lock, state)).toEqual([]);
    lock.packages[""].version = "0.1.0-rc.1";
    expect(packageIdentityErrors(lock, state)).toHaveLength(1);
    expect(versionErrors("Install @engineeringspec/cli@0.1.0-rc.1", "README.md", state, config)).toHaveLength(1);
    expect(versionErrors("Current tag v0.1.0-rc.1", "README.md", state, config)).toHaveLength(1);
    const historical = config.versionExceptions["README.md"][0];
    expect(versionErrors(historical, "README.md", state, config)).toEqual([]);
    expect(versionErrors(`${historical}\nInstall 0.1.0-rc.18`, "README.md", state, config)).toHaveLength(1);
    expect(versionErrors("majilesh/engineeringspec@main", "README.md", state, config)).toHaveLength(1);
    for (const line of config.historicalActionPins["docs/maintaining-specs.md"]) expect(versionErrors(line, "docs/maintaining-specs.md", state, config)).toEqual([]);
  });

  it("inspects commands and flag choices without executing hostile copied text", async () => {
    const state = await projectState();
    const directory = await temporary();
    const sentinel = path.join(directory, "executed");
    const text = `\`engineeringspec next\`\n\`engineeringspec nonexistent\`\n\`engineeringspec next --obsolete\`\n\`engineeringspec next --format nonsense\`\n\`engineeringspec --invented\`\n\`engineeringspec next --format json\`\n\`engineeringspec next --verbose\`\n\n\`touch ${sentinel}\`\n\n\`engineeringspec next --format $(touch ${sentinel})\``;
    expect(commandErrors(text, "fixture.md", state)).toHaveLength(4);
    expect(documentedCommands("<pre><code>engineeringspec next --format json</code></pre>")).toContain("next --format json");
    expect(commandErrors("```sh\nnpx --yes @engineeringspec/cli@0.1.0-rc.19 next \\\n  --format json\n```", "fixture.md", state)).toEqual([]);
    expect(commandErrors("```sh\nnode dist/cli.js next --not-a-flag\n```", "fixture.md", state)).toHaveLength(1);
    expect(await stat(sentinel).catch(() => null)).toBeNull();
  });

  it("validates examples and negative examples with inert runner data", async () => {
    const directory = await temporary();
    await mkdir(path.join(directory, "examples/invalid"), { recursive: true });
    const sentinel = path.join(directory, "runner-executed");
    const valid = (await readFile("examples/standalone/bug-fix.engineering-spec.md", "utf8")).replace("runner: { type: reference, reference: session compatibility tests }", `runner: { type: command, argv: [touch, ${JSON.stringify(sentinel)}] }`);
    await writeFile(path.join(directory, "examples/valid.engineering-spec.md"), valid);
    await writeFile(path.join(directory, "examples/invalid/bad.engineering-spec.md"), "malformed");
    expect(await exampleErrors(directory)).toEqual([]);
    expect(await stat(sentinel).catch(() => null)).toBeNull();
    await writeFile(path.join(directory, "examples/bad.engineering-spec.md"), valid.replace("TARGET-1", "TARGET-!"));
    expect((await exampleErrors(directory)).length).toBeGreaterThan(0);
    await writeFile(path.join(directory, "examples/invalid/bad.engineering-spec.md"), valid);
    expect((await exampleErrors(directory)).join("\n")).toContain("negative example unexpectedly passed");
  });

  it("fails on schema/version mismatch and stale Action metadata", async () => {
    const state = await projectState();
    const schema = JSON.parse(await readFile("schemas/engineering-spec-0.1.schema.json", "utf8"));
    const spec = await readFile("SPEC.md", "utf8");
    expect(schemaErrors(spec, schema, state.specFormatVersion)).toEqual([]);
    schema.$defs.metadata.properties.specFormatVersion.const = "9.9";
    expect(schemaErrors(spec, schema, state.specFormatVersion)).toHaveLength(1);
    const action = { runs: { using: "composite", steps: [{ shell: "bash", run: 'node "$GITHUB_ACTION_PATH/action/cli.mjs"' }] } };
    const metadata = JSON.parse(await readFile("action/compatibility.json", "utf8"));
    expect(actionMetadataErrors(action, metadata, state)).toEqual([]);
    expect(actionMetadataErrors(action, { ...metadata, workspaceBundleVersion: "0.0.0" }, state)).toHaveLength(1);
    expect(actionMetadataErrors({ runs: { using: "node20" } }, metadata, state)).toHaveLength(1);
  });

  it("checks local paths, fragments and publish mappings without fetching", async () => {
    const directory = await temporary();
    await mkdir(path.join(directory, "site"));
    await writeFile(path.join(directory, "reference.md"), "# Hello World\n\n## Repeated\n## Repeated\n");
    const config = { publicUrlMappings: { "/spec/SPEC.md": "reference.md" } };
    expect(await localLinkErrors("[yes](reference.md#hello-world) [duplicate](reference.md#repeated-1)", "README.md", config, directory)).toEqual([]);
    expect(await localLinkErrors("[remote](https://external.example/missing) [mapped](https://engineeringspec.org/spec/SPEC.md#hello-world)", "README.md", config, directory)).toEqual([]);
    expect(await localLinkErrors('<a href="/spec/SPEC.md#hello-world">Spec</a>', "site/index.html", config, directory)).toEqual([]);
    expect(await localLinkErrors("[bad](reference.md#missing) [absent](absent.md)", "README.md", config, directory)).toHaveLength(2);
  });

  it("reports external HTTP failures and enforces redirect bounds", async () => {
    expect(await externalLinkErrors(["https://example.test"], async () => new Response(null, { status: 404 }))).toHaveLength(1);
    let calls = 0;
    const errors = await externalLinkErrors(["https://example.test"], async () => { calls++; return new Response(null, { status: 302, headers: { location: "/loop" } }); });
    expect(errors).toHaveLength(1);
    expect(calls).toBe(6);
    expect(await externalLinkErrors(["https://example.test"], async () => { throw new Error("offline"); })).toHaveLength(1);
  });

  it("detects unsupported terminology and claims", () => {
    expect(ruleErrors("EngineeringSpec is the only safe tool", "README.md", ["EngineeringSpec is the only"])).toHaveLength(1);
    expect(ruleErrors("an AI permissions system", "README.md", ["AI permissions system"])).toHaveLength(1);
    expect(ruleErrors("Tests tell you whether the code worked.", "README.md", ["EngineeringSpec guarantees code correctness"])).toEqual([]);
  });

  it("accumulates failed and thrown categories without reporting success for them", async () => {
    const results = await collectResults([
      ["one", async () => ["failure"]],
      ["two", async () => { throw new Error("broken"); }],
      ["three", async () => []],
    ]);
    expect(results.map((result: { errors: string[] }) => result.errors.length)).toEqual([1, 1, 0]);
    expect(results.some((result: { errors: string[] }) => result.errors.length > 0)).toBe(true);
    expect(() => execFileSync(process.execPath, ["scripts/check-repository-integrity.mjs", "not-a-group"], { cwd: root, stdio: "pipe" })).toThrow();
  });

  it("generates deterministically, detects missing/stale output and never writes in check mode", async () => {
    const directory = await temporary();
    await mkdir(path.join(directory, "site"));
    await mkdir(path.join(directory, "scripts"));
    await symlink(path.join(root, ".git"), path.join(directory, ".git"));
    for (const file of ["package.json", "site/index.html", "scripts/build-action.mjs"]) await writeFile(path.join(directory, file), await readFile(path.join(root, file)));
    expect((await generateProjectState({ directory, check: true })).length).toBeGreaterThan(0);
    expect(await stat(path.join(directory, "docs")).catch(() => null)).toBeNull();
    await generateProjectState({ directory });
    expect(await generateProjectState({ directory, check: true })).toEqual([]);
    const outputs = await generatedOutputs(directory);
    await generateProjectState({ directory });
    expect(await generatedOutputs(directory)).toEqual(outputs);
    const file = path.join(directory, "site/generated/project-state.json");
    await writeFile(file, "stale");
    expect((await generateProjectState({ directory, check: true })).join("\n")).toContain("site/generated/project-state.json");
    expect(await readFile(file, "utf8")).toBe("stale");
    await rm(file);
    expect((await generateProjectState({ directory, check: true })).join("\n")).toContain("missing or stale");
  });
  it("generates portable catalogues across checkout paths and checks both outputs read-only", async () => {
    const outputs: string[] = [];
    for (let index = 0; index < 2; index++) {
      const directory = await temporary();
      await mkdir(path.join(directory, "docs/engineering-specs"), { recursive: true });
      const contract = await readFile("conformance/valid/minimal.engineering-spec.md", "utf8");
      await writeFile(path.join(directory, "docs/engineering-specs/contract.engineering-spec.md"), `${contract}\n~~~engineering-x-notes\nnote: preserved extension\n~~~\n`);
      expect(await generateSite({ directory, check: true })).toHaveLength(2);
      expect(await stat(path.join(directory, "site")).catch(() => null)).toBeNull();
      await generateSite({ directory });
      expect(await generateSite({ directory, check: true })).toEqual([]);
      const catalogue = await readFile(path.join(directory, "site/catalogue.json"), "utf8");
      expect(catalogue).not.toContain(directory);
      outputs.push(catalogue);
      const explorer = path.join(directory, "site/explorer.html");
      await writeFile(explorer, "stale");
      expect(await generateSite({ directory, check: true })).toHaveLength(1);
      expect(await readFile(explorer, "utf8")).toBe("stale");
    }
    expect(outputs[0]).toBe(outputs[1]);
  });
});
