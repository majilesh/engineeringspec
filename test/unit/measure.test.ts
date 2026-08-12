import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { measureScope } from "../../src/measurement/measure.js";

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

async function repository(): Promise<{ root: string; base: string; head: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "es-measure-"));
  await mkdir(path.join(root, "docs", "engineering-specs"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "a.ts"), "export const a=1;\n");
  await writeFile(path.join(root, "src", "delete.ts"), "delete me\n");
  await writeFile(path.join(root, "src", "rename-old.ts"), "rename me\n");
  await writeFile(path.join(root, "src", "readonly.ts"), "protected\n");
  await writeFile(path.join(root, "docs", "engineering-specs", "change.engineering-spec.md"), `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-measure
title: Measure
status: approved
owners: [{team: test}]
---
# Measure
\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: test}
\`\`\`
\`\`\`engineering-targets
- id: TARGET-existing
  paths: [src/a.ts]
  change_policy: modify
- id: TARGET-create
  paths: [src/new/**]
  change_policy: create
- id: TARGET-delete
  paths: [src/delete.ts]
  change_policy: delete
- id: TARGET-rename
  paths: [src/rename-*.ts]
  change_policy: modify
- id: TARGET-broad
  paths: [src/**]
  change_policy: modify
- id: TARGET-deny
  paths: [src/readonly.ts]
  change_policy: read_only
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Stay in scope, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: {type: command, argv: [must-never-run, secret-runner-payload]}
\`\`\`
`);
  git(root, ["init", "-q"]);
  git(root, ["add", "."]);
  git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
  const base = git(root, ["rev-parse", "HEAD"]);
  await mkdir(path.join(root, "src", "new"), { recursive: true });
  await writeFile(path.join(root, "src", "a.ts"), "export const a=2;\n");
  execFileSync("git", ["-C", root, "rm", "-q", "src/delete.ts"]);
  execFileSync("git", ["-C", root, "mv", "src/rename-old.ts", "src/rename-new.ts"]);
  await writeFile(path.join(root, "src", "new", "b.ts"), "export const b=1;\n");
  await writeFile(path.join(root, "src", "readonly.ts"), "attempted change\n");
  await writeFile(path.join(root, "outside.txt"), "outside\n");
  git(root, ["add", "."]);
  git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "head"]);
  return { root, base, head: git(root, ["rev-parse", "HEAD"]) };
}

describe("deterministic scope measurement", () => {
  it("measures committed base/head state without disclosing paths or reading dirt", async () => {
    const { root, base, head } = await repository();
    await writeFile(path.join(root, "dirty.txt"), "not committed\n");
    const receipt = await measureScope({ contractId: "ES-measure", specDirectory: "docs/engineering-specs", base, head, cwd: root });
    expect(receipt).toMatchObject({
      schemaVersion: "0.2",
      baseSha: base,
      headSha: head,
      authority: "base_pinned_repository_routing",
      authorization: "none",
      authorityBreadth: "open_create_namespace",
      counts: {
        approvedWritablePaths: 3,
        actualChangedPaths: 7,
        selectedForRequestedContract: 5,
        selectedForOtherContracts: 0,
        denied: 1,
        ambiguous: 0,
        uncovered: 1,
      },
      metricEligibility: { scopePrecision: false, reason: "open_create_namespace" },
    });
    expect(receipt.paths).toBeUndefined();
    expect(JSON.stringify(receipt)).not.toContain("dirty.txt");
    expect(JSON.stringify(receipt)).not.toContain("src/a.ts");
    expect(JSON.stringify(receipt)).not.toContain("secret-runner-payload");
    const schema = JSON.parse(await readFile("schemas/scope-measurement-0.2.schema.json", "utf8")) as object;
    expect(new Ajv2020({ strict: true }).compile(schema)(receipt)).toBe(true);

    const disclosed = await measureScope({ contractId: "ES-measure", specDirectory: "docs/engineering-specs", base, head, includePaths: true, cwd: root });
    expect(disclosed.paths).toMatchObject({
      actualChanged: ["outside.txt", "src/a.ts", "src/delete.ts", "src/new/b.ts", "src/readonly.ts", "src/rename-new.ts", "src/rename-old.ts"],
      selectedForRequestedContract: ["src/a.ts", "src/delete.ts", "src/new/b.ts", "src/rename-new.ts", "src/rename-old.ts"],
      denied: ["src/readonly.ts"],
      uncovered: ["outside.txt"],
    });
    expect(disclosed.counts).toEqual(receipt.counts);
  });

  it("loads exact immutable base authority and fails closed on duplicate identities", async () => {
    const { root, base, head } = await repository();
    const contractPath = path.join(root, "docs", "engineering-specs", "change.engineering-spec.md");
    const original = await readFile(contractPath, "utf8");
    await writeFile(contractPath, original.replace("status: approved", "status: proposed"));
    expect((await measureScope({ contractId: "ES-measure", specDirectory: "docs/engineering-specs", base, head, cwd: root })).contract.id).toBe("ES-measure");

    await writeFile(contractPath, original);
    const secondPath = path.join(root, "docs", "engineering-specs", "duplicate.engineering-spec.md");
    await writeFile(secondPath, "not an EngineeringSpec\n");
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "invalid"]);
    const invalidBase = git(root, ["rev-parse", "HEAD"]);
    await expect(measureScope({ contractId: "ES-measure", specDirectory: "docs/engineering-specs", base: invalidBase, head: invalidBase, strict: true, cwd: root }))
      .rejects.toThrow("failed validation");

    await writeFile(secondPath, original);
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "duplicate"]);
    const duplicateBase = git(root, ["rev-parse", "HEAD"]);
    await expect(measureScope({ contractId: "ES-measure", specDirectory: "docs/engineering-specs", base: duplicateBase, head: duplicateBase, cwd: root }))
      .rejects.toThrow("is duplicated");
  });

  it("projects repository routing and measures finite authority granted rather than exercised", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-measure-routing-"));
    await mkdir(path.join(root, "specs"));
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "delete.ts"), "delete\n");
    await writeFile(path.join(root, "src", "secret.ts"), "secret\n");
    await writeFile(path.join(root, "src", "ambiguous.ts"), "ambiguous\n");
    const document = (id: string, targets: string): string => `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ${id}
title: ${id}
status: approved
owners: [{team: test}]
---
\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: test}
\`\`\`
\`\`\`engineering-targets
${targets}
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Test, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- {id: VER-1, proves: [CON-1], kind: test}
\`\`\`
`;
    await writeFile(path.join(root, "specs", "requested.engineering-spec.md"), document("ES-requested", `- {id: TARGET-new-1, paths: [src/new-1.ts], change_policy: create}
- {id: TARGET-new-2, paths: [src/new-2.ts], change_policy: create}
- {id: TARGET-modify-absent, paths: [src/modify-absent.ts], change_policy: modify}
- {id: TARGET-interface-absent, paths: [src/interface-absent.ts], change_policy: interface_only}
- {id: TARGET-delete, paths: [src/delete.ts], change_policy: delete}
- {id: TARGET-secret, paths: [src/secret.ts], change_policy: modify}
- {id: TARGET-ambiguous, paths: [src/ambiguous.ts], change_policy: modify}`));
    await writeFile(path.join(root, "specs", "other.engineering-spec.md"), document("ES-other", `- {id: TARGET-other, paths: [src/other.ts], change_policy: modify}
- {id: TARGET-ambiguous, paths: [src/ambiguous.ts], change_policy: modify}`));
    await writeFile(path.join(root, "specs", "deny.engineering-spec.md"), document("ES-deny", "- {id: TARGET-secret, paths: [src/secret.ts], change_policy: read_only}"));
    git(root, ["init", "-q"]);
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "base"]);
    const base = git(root, ["rev-parse", "HEAD"]);
    await writeFile(path.join(root, "src", "new-1.ts"), "new\n");
    await writeFile(path.join(root, "src", "other.ts"), "other\n");
    await writeFile(path.join(root, "src", "uncovered.ts"), "uncovered\n");
    await writeFile(path.join(root, "src", "secret.ts"), "changed\n");
    await writeFile(path.join(root, "src", "ambiguous.ts"), "changed\n");
    execFileSync("git", ["-C", root, "rm", "-q", "src/delete.ts"]);
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "head"]);
    const head = git(root, ["rev-parse", "HEAD"]);

    const receipt = await measureScope({ contractId: "ES-requested", specDirectory: "specs", base, head, includePaths: true, strict: true, cwd: root });
    expect(receipt).toMatchObject({
      authorityBreadth: "finite",
      metricEligibility: { scopePrecision: false, reason: "negative_routing_outcome" },
      counts: {
        approvedWritablePaths: 5,
        actualChangedPaths: 6,
        selectedForRequestedContract: 2,
        selectedForOtherContracts: 1,
        denied: 1,
        ambiguous: 1,
        uncovered: 1,
      },
    });
    expect(receipt.paths?.approvedWritable).toEqual(["src/delete.ts", "src/interface-absent.ts", "src/modify-absent.ts", "src/new-1.ts", "src/new-2.ts"]);
    expect(receipt.paths?.selectedForOtherContracts).toEqual(["src/other.ts"]);
    expect(receipt.candidateSetDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(receipt.routingDecisionDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("classifies explicit repository-wide authority without numeric interpretation claims", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-measure-wide-"));
    await mkdir(path.join(root, "specs"));
    await writeFile(path.join(root, "a.txt"), "a\n");
    await writeFile(path.join(root, "specs", "wide.engineering-spec.md"), `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-wide
title: Wide
status: approved
owners: [{team: test}]
---
\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: test}
\`\`\`
\`\`\`engineering-targets
- {id: TARGET-all, paths: ["**"], change_policy: modify}
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Stay in scope, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- {id: VER-1, proves: [CON-1], kind: test}
\`\`\`
`);
    git(root, ["init", "-q"]);
    git(root, ["add", "."]);
    git(root, ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "wide"]);
    const revision = git(root, ["rev-parse", "HEAD"]);
    const receipt = await measureScope({ contractId: "ES-wide", specDirectory: "specs", base: revision, head: revision, strict: true, cwd: root });
    expect(receipt.authorityBreadth).toBe("repository_wide");
    expect(receipt.limitations.join(" ")).toContain("unavailable");
  });
});
