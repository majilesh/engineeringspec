import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import console from "node:console";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repositoryRoot, "dist", "cli.js");
const root = mkdtempSync(path.join(os.tmpdir(), "engineeringspec-demo-"));
mkdirSync(path.join(root, "docs", "engineering-specs"), { recursive: true });
mkdirSync(path.join(root, "src"), { recursive: true });

function contract(paths) {
  return `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-demo
title: Demo authorization
status: approved
owners: [{team: demo}]
---

\`\`\`engineering-source-refs
- {id: SRC-1, type: other, ref: local-demo}
\`\`\`

\`\`\`engineering-targets
- id: TARGET-demo
  paths: [${paths.join(", ")}]
  change_policy: modify
\`\`\`

\`\`\`engineering-constraints
- id: CON-demo
  level: must
  statement: Only maintainer-approved demo paths may change.
  applies_to: [TARGET-demo]
  enforcement: {kind: test, verifier_ref: VER-demo}
\`\`\`

\`\`\`engineering-verification
- id: VER-demo
  proves: [CON-demo]
  kind: test
  runner: {type: reference, reference: demo review}
\`\`\`
`;
}

function git(...args) {
  execFileSync("git", ["-C", root, ...args], { stdio: "ignore" });
}

function check(expected) {
  const result = spawnSync(process.execPath, [cli, "review", "--spec-dir", "docs/engineering-specs", "--base", "HEAD", "--strict", "--format", "text"], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== expected) throw new Error(`Expected review exit ${expected}, received ${result.status}`);
}

writeFileSync(path.join(root, "docs", "engineering-specs", "ES-demo.engineeringspec.md"), contract(["src/allowed.ts"]));
git("init", "-q");
git("add", ".");
git("-c", "user.name=Demo", "-c", "user.email=demo@example.invalid", "commit", "-qm", "approve narrow contract");
writeFileSync(path.join(root, "src", "outside.ts"), "export const demo = true;\n");

console.log("\n1. Unauthorized path fails closed");
check(1);

console.log("\n2. A maintainer-approved base widens the exact target");
writeFileSync(path.join(root, "docs", "engineering-specs", "ES-demo.engineeringspec.md"), contract(["src/allowed.ts", "src/outside.ts"]));
git("add", "docs/engineering-specs/ES-demo.engineeringspec.md");
git("-c", "user.name=Demo", "-c", "user.email=demo@example.invalid", "commit", "-qm", "approve widened contract");

console.log("\n3. The same implementation now passes against approved base authority");
check(0);
console.log(`\nDemo complete. Temporary repository: ${root}`);
