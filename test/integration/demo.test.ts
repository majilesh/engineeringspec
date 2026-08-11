import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("local authorization demo", () => {
  it("documents and implements both fail-closed and approved-base outcomes without credentials", async () => {
    const source = await readFile("scripts/demo.mjs", "utf8");
    expect(source).toContain("Unauthorized path fails closed");
    expect(source).toContain("check(1)");
    expect(source).toContain("same implementation now passes");
    expect(source).toContain("check(0)");
    expect(source).not.toMatch(/fetch\(|https?:\/\//u);
  });
});
