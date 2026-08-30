import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCatalogue,
  catalogueHtml,
} from "../../src/catalogue/catalogue.js";

const source = `---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-catalogue
title: Searchable payments change
status: approved
owners: [{team: payments}]
---
\`\`\`engineering-source-refs
- {id: SRC-1, type: document, ref: intent}
\`\`\`
\`\`\`engineering-targets
- {id: TARGET-1, component: api, paths: [src/payments/**], change_policy: modify}
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Preserve safety, enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- id: VER-1
  proves: [CON-1]
  kind: test
  runner: {type: command, argv: [secret-command, secret-payload]}
\`\`\`
`;

describe("contract catalogue", () => {
  it("is deterministic, searchable, path-aware, and omits runner payloads", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "es-catalogue-"));
    await writeFile(path.join(root, "change.engineering-spec.md"), source);
    const report = await buildCatalogue(root, {
      query: "payments",
      path: "src/payments/card.ts",
      strict: true,
    });
    expect(report).toMatchObject({
      valid: true,
      documents: 1,
      entries: [{ id: "ES-catalogue", owners: ["payments"] }],
    });
    expect(JSON.stringify(report)).not.toContain("secret-payload");
    const html = catalogueHtml(report);
    expect(html).toContain("EngineeringSpec Explorer");
    expect(html).toContain("Contract Explorer");
    expect(html).toContain(
      "This view explains contracts; it grants no authority.",
    );
    expect(html).toContain("/assets/lockup.svg");
    expect(html).toContain("--forest:#1e3a2f");
    expect(html).not.toContain("secret-payload");
    const hostile = {
      ...report,
      entries: [
        { ...report.entries[0]!, title: "</script><script>alert(1)</script>" },
      ],
    };
    expect(catalogueHtml(hostile)).not.toContain(
      "</script><script>alert(1)</script>",
    );
    expect(catalogueHtml(hostile)).toContain("\\u003c/script>");
  });
});
