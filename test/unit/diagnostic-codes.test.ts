import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { Codes } from "../../src/diagnostics/codes.js";
import { validateBytes } from "../../src/validator/validateFile.js";

describe("diagnostic code registry", () => {
  it("assigns one stable code to each condition", () => {
    const entries = Object.entries(Codes);
    const duplicates = entries.filter(([, code], index) => entries.findIndex(([, candidate]) => candidate === code) !== index);
    expect(duplicates).toEqual([]);
  });

  it("is the only source-code location that defines diagnostic literals", async () => {
    const files = (await readdir("src", { recursive: true }))
      .filter((file) => file.endsWith(".ts"))
      .map((file) => `src/${file}`);
    const defining = [];
    for (const file of files) {
      if (/ES[A-Z]+[0-9]{3}/.test(await readFile(file, "utf8"))) defining.push(file);
    }
    expect(defining).toEqual(["src/diagnostics/codes.ts"]);
  });

  it("distinguishes invalid UTF-8 from normalized key collisions", async () => {
    const result = await validateBytes(Uint8Array.from([0xff, 0xfe]), "invalid.engineering-spec.md");
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["ESP010"]);
  });
});
