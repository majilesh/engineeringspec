import { describe, expect, it } from "vitest";
import { canonicalize, compareCodePoints, canonicalJson } from "../../src/normalizer/canonicalize.js";

describe("canonicalize code-point ordering", () => {
  it("orders mixed-case keys by Unicode code point, not locale collation", () => {
    expect(compareCodePoints("ES-ABC", "ES-abc")).toBe(-1);
    expect(compareCodePoints("CON-10", "CON-2")).toBe(-1);
    const keys = Object.keys(
      canonicalize({ z: 1, a: 1, A: 1, "CON-10": 1, "CON-2": 1 }) as object,
    );
    expect(keys).toEqual(["A", "CON-10", "CON-2", "a", "z"]);
  });

  it("is stable for digest-relevant JSON", () => {
    const once = canonicalJson({ B: 1, a: 2, A: 3 });
    const twice = canonicalJson({ A: 3, a: 2, B: 1 });
    expect(once).toBe(twice);
    expect(once.indexOf('"A"')).toBeLessThan(once.indexOf('"B"'));
    expect(once.indexOf('"B"')).toBeLessThan(once.indexOf('"a"'));
  });

  it("orders supplementary-plane keys by code point, not UTF-16 code unit", () => {
    // U+1D54A (MATHEMATICAL DOUBLE-STRUCK CAPITAL S) > U+E000 (private use)
    // under true code points, but JS string < puts the surrogate pair first.
    const astral = "\u{1D54A}";
    const bmp = "\uE000";
    expect(astral < bmp).toBe(true);
    expect(compareCodePoints(astral, bmp)).toBe(1);
    const keys = Object.keys(canonicalize({ [astral]: 1, [bmp]: 1 }) as object);
    expect(keys).toEqual([bmp, astral]);
  });
});
