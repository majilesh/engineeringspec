import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packageVersion } from "../../src/cli/version.js";

describe("packageVersion", () => {
  it("matches package.json", () => {
    const expected = (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version;
    expect(packageVersion()).toBe(expected);
  });
});
