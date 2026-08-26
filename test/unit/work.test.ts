import { describe, expect, it, vi } from "vitest";
import * as work from "../../src/cli/work.js";
import { buildChangeBrief } from "../../src/query/changeBrief.js";
import { createProgram } from "../../src/cli/program.js";

function report(approved = true): work.WorkReport {
  const brief = buildChangeBrief({
    metadata: { specFormat: "engineering-spec", specFormatVersion: "0.1", specRevision: 2, id: "ES-ticket", title: "Ticket", status: approved ? "approved" : "proposed", owners: [{ team: "test" }] },
    sourceRefs: [{ id: "SRC-1", type: "other", ref: "test" }],
    targets: [
      { id: "TARGET-1", paths: ["src/**"], changePolicy: "interface_only" },
      { id: "TARGET-2", paths: ["src/secret/**"], changePolicy: "read_only" },
    ],
    constraints: [{ id: "CON-1", level: "escalate", statement: "Confirm compatibility", enforcement: { kind: "review", reviewerRole: "maintainer" } }],
    contracts: [{ id: "CONTRACT-1", kind: "json_schema", path: "schema.json" }],
    verification: [{ id: "VER-1", kind: "test", proves: ["CON-1"], runner: { type: "command", argv: ["must-not-run", "secret-runner"] } }], prose: [],
  }, { baseRef: "main", baseSha: "a".repeat(40), specPath: "specs/ticket.engineering-spec.md", specDigest: "sha256:base" });
  return {
    result: brief.result, cliVersion: "test", intendedChangeDigest: "not_available_before_changes", limitations: ["inert"], brief,
    config: { baseRef: "main", baseSha: "a".repeat(40), source: "trusted_base", path: "engineering-spec.json", workspaceDrift: false, warnings: [], specDirectory: "specs", strict: true, trustedVerifierIds: [] },
  };
}

describe("compact work projection", () => {
  it("retains base identity, policies, protected paths and obligations without runner data or predictions", () => {
    const full = report();
    const before = JSON.stringify(full);
    const ticket = work.workTicket(full);
    expect(ticket).toMatchObject({ result: "ready", permission: "implementation", contractId: "ES-ticket", baseSha: "a".repeat(40), specRevision: 2, semanticDigest: "sha256:base",
      writablePaths: [{ path: "src/**", targetId: "TARGET-1", changePolicy: "interface_only", enforcementNote: expect.stringContaining("path-level") }],
      protectedPaths: [{ path: "src/secret/**", targetId: "TARGET-2", changePolicy: "read_only" }],
      constraints: [{ id: "CON-1", level: "escalate", statement: "Confirm compatibility" }],
      verifiers: [{ id: "VER-1", proves: ["CON-1"] }],
      technicalContracts: [{ id: "CONTRACT-1", kind: "json_schema", locator: "schema.json" }],
    });
    expect(ticket.stopWhen).toContain("CON-1: Confirm compatibility");
    for (const field of ["lane", "expectedLane", "finishMode", "currentChangeClassification", "brief", "routing"]) expect(ticket).not.toHaveProperty(field);
    expect(JSON.stringify(ticket)).not.toContain("secret-runner");
    expect(JSON.stringify(full)).toBe(before);
  });

  it("preserves a blocked preparation and exposes no writable authority", () => {
    const ticket = work.workTicket(report(false));
    expect(ticket).toMatchObject({ result: "blocked", permission: "none", writablePaths: [] });
    expect(ticket.reason).toContain("proposed");
    expect(ticket.command).toContain("approval-only");
  });

  it("projects a missing-contract preparation without inventing identity or surfaces", () => {
    const full = report();
    full.result = "blocked";
    full.brief = { result: "blocked", permission: "none", reason: "Missing", action: "Merge approval", authority: { kind: "base_pinned", baseRef: "main", baseSha: "a".repeat(40), specDirectory: "specs" }, contract: { id: "ES-missing" }, diagnostics: [] };
    expect(work.workTicket(full)).toMatchObject({ result: "blocked", permission: "none", contractId: "ES-missing", writablePaths: [], protectedPaths: [], constraints: [], verifiers: [], reason: "Missing", command: "Merge approval" });
    expect(work.workTicket(full)).not.toHaveProperty("semanticDigest");
  });

  it.each([true, false])("restores the exact full work JSON and exit behavior under --verbose (approved=%s)", async (approved) => {
    const full = report(approved);
    const action = vi.spyOn(work, "workOnContract").mockResolvedValue(full);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      for (const verbose of [false, true]) {
        let exitCode = -1;
        await createProgram((value) => { exitCode = value; }).parseAsync(["node", "engineeringspec", "work", "ES-ticket", "--format", "json", ...(verbose ? ["--verbose"] : [])]);
        expect(JSON.parse(String(log.mock.calls.at(-1)![0]))).toEqual(verbose ? full : work.workTicket(full));
        expect(exitCode).toBe(approved ? 0 : 1);
      }
    } finally { action.mockRestore(); log.mockRestore(); }
  });
});
