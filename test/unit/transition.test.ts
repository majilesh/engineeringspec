import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { transitionStatus } from "../../src/cli/transition.js";

const source = `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-transition
title: Transition fixture
status: approved
owners: [{team: test}]
---

Keep this prose byte-for-byte.

\`\`\`engineering-source-refs
- {id: SRC-1, type: document, ref: test}
\`\`\`

\`\`\`engineering-targets
- {id: TARGET-1, paths: [src/**], change_policy: modify}
\`\`\`

\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Stay safe, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`

\`\`\`engineering-verification
- {id: VER-1, proves: [CON-1], kind: test}
\`\`\`
`;

describe("lifecycle transition", () => {
  it("previews without writing and writes only the status when explicit", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-transition-"));
    const file = path.join(root, "change.engineering-spec.md");
    await writeFile(file, source);
    expect(await transitionStatus(file, "implemented")).toMatchObject({ from: "approved", to: "implemented", written: false });
    expect(await readFile(file, "utf8")).toBe(source);
    expect(await transitionStatus(file, "implemented", true)).toMatchObject({ written: true });
    expect(await readFile(file, "utf8")).toBe(source.replace("status: approved", "status: implemented"));
  });

  it("rejects unsafe lifecycle jumps", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-transition-"));
    const file = path.join(root, "change.engineering-spec.md");
    await writeFile(file, source);
    await expect(transitionStatus(file, "draft")).rejects.toThrow("not allowed");
  });

  it("preserves CRLF content outside the status scalar", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-transition-"));
    const file = path.join(root, "change.engineering-spec.md");
    const crlf = source.replace(/\n/gu, "\r\n");
    await writeFile(file, crlf);
    await transitionStatus(file, "implemented", true);
    expect(await readFile(file, "utf8")).toBe(crlf.replace("status: approved", "status: implemented"));
  });
});
