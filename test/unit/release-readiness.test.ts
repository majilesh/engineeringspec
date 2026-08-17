import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { CURRENT_ACTION_SHA } from "../../src/adoption/releases.js";

const RC14_ACTION_SHA = "ed2f0acaaa220baa574e97a200535373eca5aa0b";

describe("RC14 release readiness", () => {
  it("pins generated enforcement to the reviewed immutable RC14 runtime", async () => {
    expect(CURRENT_ACTION_SHA).toBe(RC14_ACTION_SHA);
    expect(CURRENT_ACTION_SHA).toMatch(/^[0-9a-f]{40}$/u);
    const governance = await readFile("src/routing/governance.ts", "utf8");
    const selection = await readFile("src/routing/select.ts", "utf8");
    expect(governance).toContain('"implementation_with_monotonic_close"');
    expect(selection).toContain("approved-to-implemented monotonic close");
    expect(selection).toContain("did not authorize any implementation path");
  });

  it("keeps the two-PR journey and safe finish output consistent in primary docs", async () => {
    const tutorial = await readFile("docs/first-change-tutorial.md", "utf8");
    const readme = await readFile("README.md", "utf8");
    expect(tutorial).toContain("PR 1 — grant authority");
    expect(tutorial).toContain("PR 2 — spend authority and close exactly");
    expect(tutorial).toContain("implementation_with_monotonic_close");
    expect(tutorial).toContain("--path 'src/settings/**'");
    expect(tutorial).toContain("--output docs/engineering-specs/ES-dark-mode.engineering-spec.md");
    expect(tutorial).toContain("Use `--from-diff` instead only when an existing non-empty working change is being brought under governance");
    expect(tutorial).not.toContain("After the implementation merges");
    expect(tutorial).not.toContain("A mixed spec-and-code closure must fail");
    expect(readme).toContain("--output ../engineering-spec-receipt.json");
    expect(readme).not.toContain("--output engineering-spec-receipt.json");
  });

  it("states that next analysis is not authority throughout the normal journey", async () => {
    for (const file of [
      "README.md",
      "docs/getting-started.md",
      "docs/first-change-tutorial.md",
      "docs/lifecycle.md",
      "docs/agent-integration.md",
      "docs/cli-reference.md",
      "skills/engineering-spec/SKILL.md",
    ]) {
      const source = await readFile(file, "utf8");
      expect(source, file).toContain("next");
      expect(source, file).toContain("permission");
      expect(source, file).toContain("work");
    }
  });

  it("documents the downstream control-plane authority boundary", async () => {
    const source = await readFile("docs/agent-control-plane.md", "utf8");
    expect(source).toContain("runtimeAuthority ⊆ approvedEngineeringSpecAuthority");
    expect(source).toContain("childAuthority ⊆ parentRuntimeAuthority ⊆ approvedContractAuthority");
    expect(source).toContain("The control plane consumes reviewed EngineeringSpec authority. It does not manufacture authority.");
    expect(source).toContain("Specification runners remain inert");
    expect(source).toContain("independently usable with Git, the CLI, CI, and human review");
    expect(source).toContain("does not replace repository-wide routing");
    expect(source).toContain("candidate-set identity or digest");
    expect(source).toContain("routing policy and version");
    expect(source).toContain("cross-contract deny-overrides, ambiguity detection, and uncovered-path failure");
    expect(source).toContain("same immutable approved candidate set used by repository enforcement");
  });

  it("organizes commands by developer, advanced, enforcement, and measurement use", async () => {
    const source = await readFile("docs/cli-reference.md", "utf8");
    expect(source).toContain("## Daily developer and coding-agent workflow");
    expect(source).toContain("## Advanced inspection and troubleshooting");
    expect(source).toContain("## CI and enforcement primitives");
    expect(source).toContain("## Measurement and research");
  });

  it("documents non-self-referential RC14 release pin choreography", async () => {
    const source = await readFile("docs/maintaining-specs.md", "utf8");
    expect(source).toContain("RC runtime/version anchor");
    expect(source).toContain("sets `CURRENT_ACTION_SHA`, examples, and tests to the anchor SHA");
    expect(source).toContain("full-history checkout");
    expect(source).toContain("Checking only the current checkout does not prove the pinned commit has those capabilities");
  });
});
