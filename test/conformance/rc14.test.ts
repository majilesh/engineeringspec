import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseRepositoryConfig } from "../../src/config/repositoryConfig.js";

describe("RC14 conformance vectors", () => {
  it("accepts trusted argv configuration and rejects repository traversal", async () => {
    const valid = await readFile("conformance/repository-config/valid.json", "utf8");
    const invalid = await readFile("conformance/repository-config/invalid-traversal.json", "utf8");
    expect(parseRepositoryConfig(valid)).toMatchObject({ specDirectory: "docs/engineering-specs", strict: true });
    expect(() => parseRepositoryConfig(invalid)).toThrow("safe repository-relative path");
  });

  it("keeps the authority and evidence vectors explicit and versionable", async () => {
    const close = JSON.parse(await readFile("conformance/authority-diff/monotonic-close.json", "utf8"));
    const evidence = JSON.parse(await readFile("conformance/evidence/mismatched-binding.json", "utf8"));
    expect(close).toMatchObject({ from: "approved", to: "implemented", semanticChange: false, expected: "safe_monotonic_close" });
    expect(evidence.authority.baseSha).toBe("wrong");
  });
});
