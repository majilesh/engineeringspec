import { execFileSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import * as next from "../../src/cli/next.js";
import { createProgram } from "../../src/cli/program.js";
import type { ChangeClassification } from "../../src/routing/governance.js";

function report(classification: ChangeClassification = "none"): next.NextReport {
  const candidates = [
    { path: "specs/live.engineering-spec.md", digest: "digest", specId: "ES-live", status: "approved" as const, eligible: true, specRevision: 1, semanticDigest: "digest" },
    { path: "specs/old.engineering-spec.md", digest: "digest", specId: "ES-old", status: "implemented" as const, eligible: false, specRevision: 1, semanticDigest: "digest" },
    { path: "specs/draft.engineering-spec.md", digest: "digest", specId: "ES-draft", status: "draft" as const, eligible: false, specRevision: 1, semanticDigest: "digest" },
    { path: "specs/proposal.engineering-spec.md", digest: "digest", specId: "ES-proposal", status: "proposed" as const, eligible: false, specRevision: 1, semanticDigest: "digest" },
  ];
  return {
    valid: true, analysisValid: true, workflowState: "implement", permission: "implementation", cliVersion: "test",
    command: "engineeringspec work ES-live",
    config: { baseRef: "main", baseSha: "a".repeat(40), source: "trusted_base", path: "engineering-spec.json", workspaceDrift: false, warnings: [], specDirectory: "specs", strict: true, trustedVerifierIds: [] },
    recommendation: { code: "work", reason: "ready", diagnostics: [], command: "engineeringspec work ES-live" },
    status: {
      valid: true, base: "main", baseSha: "a".repeat(40), candidateDirectory: "specs", candidates: candidates.length,
      lifecycle: { draft: 1, proposed: 1, approved: 1, implemented: 1, superseded: 0, rejected: 0 },
      workingState: { changed: 0, selected: 0, violations: 0 }, selectedContracts: [], routedTargets: [],
      coverage: { status: "complete", specs: [] }, next: { stage: "implement", message: "ready" },
      routing: {
        valid: true, base: "main", baseSha: "a".repeat(40), head: "HEAD", headSha: "b".repeat(40), candidateDirectory: "specs",
        requiredStatuses: ["approved"], changedDigest: "digest", changed: [], governance: { enabled: true, classification },
        candidates, coverage: { status: "complete", specs: [] }, routes: [], diagnostics: [], sequencing: [],
      },
    },
  };
}

describe("compact next projection", () => {
  it.each(["none", "contract_only", "implementation", "implementation_with_monotonic_close"] as const)("projects %s without deriving permission from it", (classification) => {
    const full = report(classification);
    full.permission = "none";
    const before = JSON.stringify(full);
    expect(next.nextTicket(full)).toEqual({
      permission: "none", workflowState: "implement", currentChangeClassification: classification,
      command: full.command, approvedIds: ["ES-live"], proposedIds: ["ES-draft", "ES-proposal"], blockers: [],
    });
    expect(JSON.stringify(full)).toBe(before);
    expect(next.nextText(full)).toContain(`currentChangeClassification: ${classification}`);
    expect(next.nextText(full)).toContain("approvedIds: ES-live");
    expect(next.nextText(full)).toContain("proposedIds: ES-draft, ES-proposal");
    expect(next.nextText(full)).not.toContain("ES-old");
  });

  it.each(["uncovered", "denied", "ambiguous"] as const)("renders an executable, shell-safe %s explanation without selecting a preferred contract", (decision) => {
    const full = report("implementation");
    full.workflowState = "blocked";
    full.permission = "none";
    const hostilePath = "src/a'$(echo injected); file.ts";
    full.status.routing.routes = [{ path: hostilePath, kind: "added", decision, allows: [], denies: [], claims: [] }];
    full.status.routing.diagnostics = [{ code: "ESRT002", severity: "error", message: "blocked", file: hostilePath }];
    const ticket = next.nextTicket(full);
    const argv = execFileSync("sh", ["-c", `set -- ${ticket.command}; printf '%s\\n' "$@"`], { encoding: "utf8" }).trimEnd().split("\n");
    expect(argv).toEqual(["engineeringspec", "explain", "--spec-dir", "specs", "--base", "a".repeat(40), "--path", hostilePath, "--change-kind", "added", "--strict"]);
    expect(ticket.blockers).toEqual([{ code: "ESRT002", message: "blocked", path: hostilePath }]);
    expect(full.command).toBe("engineeringspec work ES-live");
  });

  it.each([true, false])("keeps the full JSON and exit behavior under --verbose (valid=%s)", async (valid) => {
    const full = report();
    full.valid = valid;
    const action = vi.spyOn(next, "nextAction").mockResolvedValue(full);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      for (const verbose of [false, true]) {
        let exitCode = -1;
        await createProgram((value) => { exitCode = value; }).parseAsync(["node", "engineeringspec", "next", "--format", "json", ...(verbose ? ["--verbose"] : [])]);
        expect(JSON.parse(String(log.mock.calls.at(-1)![0]))).toEqual(verbose ? full : next.nextTicket(full));
        expect(exitCode).toBe(valid ? 0 : 1);
      }
    } finally { action.mockRestore(); log.mockRestore(); }
  });
});
