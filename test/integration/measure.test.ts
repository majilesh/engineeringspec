import { describe, expect, it } from "vitest";
import { createProgram } from "../../src/cli/program.js";

describe("measure CLI", () => {
  it("exposes explicit immutable refs and privacy controls", () => {
    let code = 0;
    const program = createProgram((value) => { code = value; });
    expect(code).toBe(0);
    const command = program.commands.find((item) => item.name() === "measure");
    expect(command?.options.map((item) => item.long)).toEqual(expect.arrayContaining(["--spec-dir", "--base", "--head", "--include-paths", "--output"]));
  });
});
