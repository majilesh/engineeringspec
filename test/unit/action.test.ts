import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

describe("GitHub Action runtime (VER-ACTION)", () => {
  it("runs the committed bundle without installing or compiling at runtime and declares outputs", async () => {
    const text = await readFile("action.yml", "utf8");
    const action = parse(text) as { outputs: Record<string, { value: string }>; runs: { using: string; steps: Array<{ run?: string }> } };
    const scripts = action.runs.steps.map((step) => step.run ?? "").join("\n");
    expect(scripts).not.toMatch(/npm (ci|install)|\btsc\b|npm run build/u);
    expect(scripts).toContain('node "$GITHUB_ACTION_PATH/action/cli.mjs"');
    expect(scripts).not.toContain("dist/cli.js");
    expect(Object.keys(action.outputs).sort()).toEqual(["classification", "mode", "result", "selected-contract"]);
    const bundle = await readFile("action/cli.mjs", "utf8");
    expect(bundle.startsWith("#!/usr/bin/env node\n/* eslint-disable */")).toBe(true);
  });
});
