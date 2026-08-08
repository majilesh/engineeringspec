import { describe, expect, it } from "vitest";
import { matchTargetGlob, validateTargetGlob } from "../../src/path/targetGlob.js";

describe("targetGlob dialect", () => {
  it("allows boring patterns", () => {
    expect(validateTargetGlob("src/**")).toBeUndefined();
    expect(validateTargetGlob("src/*.ts")).toBeUndefined();
    expect(validateTargetGlob("src/?/a.ts")).toBeUndefined();
    expect(matchTargetGlob("src/a/b.ts", "src/**")).toBe(true);
    expect(matchTargetGlob("src/a.ts", "src/*.ts")).toBe(true);
  });

  it("rejects negation, braces, extglob, character classes, parent segments, and backslashes", () => {
    expect(validateTargetGlob("!src/private/**")).toMatch(/negation/);
    expect(validateTargetGlob("#{src,test}/**")).toMatch(/#/);
    expect(validateTargetGlob("src/{a,b}/**")).toMatch(/brace/);
    expect(validateTargetGlob("src/@(foo|bar).ts")).toMatch(/extglob/);
    expect(validateTargetGlob("src/[ab].ts")).toMatch(/character class/);
    expect(validateTargetGlob("src/../secret/**")).toMatch(/\.\./);
    expect(validateTargetGlob("../secret/**")).toMatch(/\.\./);
    expect(validateTargetGlob("src\\secret/**")).toMatch(/backslash/);
  });

  it("does not treat leading ! as minimatch negation when matching", () => {
    // Invalid patterns should be rejected at validate time; matcher still nonegate.
    expect(matchTargetGlob("src/a.ts", "!src/**")).toBe(false);
  });
});
