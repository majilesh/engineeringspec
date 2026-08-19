import type { ChangedFile } from "../gate/types.js";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { readGitBlob } from "../gate/loadSpec.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { normalize } from "../normalizer/normalize.js";
import { validateMarkdown } from "../validator/validateFile.js";
import { workflowStatus, type WorkflowStatusReport } from "./status.js";
import { displaySafe, markdownCode, markdownText } from "./render.js";
import { authorityDiffMarkdown, authorityDiffText, type AuthorityDiff } from "../authority/diff.js";

export interface ReviewOptions {
  specDirectory: string;
  base: string;
  head?: string;
  strict?: boolean;
  staged?: boolean;
  worktree?: boolean;
  changed?: ChangedFile[];
  cwd?: string;
  allowContractOnly?: boolean;
}

export interface ReviewContract {
  id: string;
  title: string;
  status: Status;
  path: string;
  targetIds: string[];
  constraints: Array<{ id: string; level: string; statement: string }>;
  verification: Array<{ id: string; kind: string; proves: string[] }>;
}

export interface ReviewReport {
  valid: boolean;
  authority: "base_pinned";
  baseSha: string;
  headSha: string;
  changedDigest: string;
  classification: string;
  workingState: WorkflowStatusReport["workingState"];
  coverage: WorkflowStatusReport["coverage"];
  next: WorkflowStatusReport["next"];
  routes: WorkflowStatusReport["routing"]["routes"];
  contracts: ReviewContract[];
  authorityDiffs: AuthorityDiff[];
  diagnostics: Diagnostic[];
}

function selectedTargets(status: WorkflowStatusReport): Map<string, Set<string>> {
  const selected = new Map<string, Set<string>>();
  for (const route of status.routing.routes) {
    if (route.decision !== "selected" || !route.selected) continue;
    const targets = selected.get(route.selected.specId) ?? new Set<string>();
    for (const target of route.selected.targetIds) targets.add(target);
    selected.set(route.selected.specId, targets);
  }
  return selected;
}

export async function buildReview(options: ReviewOptions): Promise<ReviewReport> {
  const status = await workflowStatus({
    specDirectory: options.specDirectory,
    base: options.base,
    ...(options.head ? { head: options.head } : {}),
    strict: Boolean(options.strict),
    staged: Boolean(options.staged),
    ...(options.worktree === undefined ? {} : { worktree: options.worktree }),
    ...(options.changed ? { changed: options.changed } : {}),
    ...(options.cwd ? { cwd: options.cwd } : {}),
    allowContractOnly: Boolean(options.allowContractOnly),
  });
  const selected = selectedTargets(status);
  const contracts: ReviewContract[] = [];
  for (const [specId, targetSet] of [...selected].sort(([left], [right]) => compareCodePoints(left, right))) {
    const candidate = status.routing.candidates.find((item) => item.specId === specId && item.eligible);
    if (!candidate) throw new Error(`Selected base contract ${specId} is unavailable`);
    const validation = await validateMarkdown(
      await readGitBlob(status.baseSha, candidate.path, options.cwd),
      `${status.baseSha}:${candidate.path}`,
      { resolveProfiles: false },
    );
    const failed = !validation.spec
      || validation.diagnostics.some((item) => item.severity === "error")
      || (options.strict && validation.diagnostics.some((item) => item.severity === "warning"));
    if (failed) {
      throw new Error(`Selected base contract ${specId} failed validation`);
    }
    const spec = normalize(validation.spec!);
    const constraints = (spec.constraints ?? [])
      .filter((constraint) => !constraint.appliesTo?.length || constraint.appliesTo.some((id) => targetSet.has(id)))
      .map((constraint) => ({ id: constraint.id, level: constraint.level, statement: constraint.statement }))
      .sort((left, right) => compareCodePoints(left.id, right.id));
    const relevant = new Set(constraints.map((constraint) => constraint.id));
    const verification = spec.verification
      .filter((item) => item.proves.some((id) => relevant.has(id)))
      .map((item) => ({ id: item.id, kind: item.kind, proves: [...item.proves].sort(compareCodePoints) }))
      .sort((left, right) => compareCodePoints(left.id, right.id));
    contracts.push({
      id: spec.metadata.id,
      title: spec.metadata.title,
      status: spec.metadata.status,
      path: candidate.path,
      targetIds: [...targetSet].sort(compareCodePoints),
      constraints,
      verification,
    });
  }
  return {
    valid: status.valid,
    authority: "base_pinned",
    baseSha: status.baseSha,
    headSha: status.routing.headSha,
    changedDigest: status.routing.changedDigest,
    classification: status.routing.governance.classification,
    workingState: status.workingState,
    coverage: status.coverage,
    next: status.next,
    routes: status.routing.routes,
    contracts,
    authorityDiffs: status.routing.governance.authorityDiffs ?? [],
    diagnostics: status.routing.diagnostics.map((item) => ({
      code: item.code,
      severity: item.severity,
      message: item.message,
      ...(item.file ? { file: item.file } : {}),
    })),
  };
}

function safe(value: string): string {
  return markdownText(value);
}

export function reviewMarkdown(report: ReviewReport): string {
  const headline = !report.valid
    ? "❌ **Change is not authorized**"
    : report.classification === "contract_only"
      ? "✅ **Contract-only governance change is valid; it grants no implementation authority**"
      : report.workingState.changed === 0
        ? "✅ **No changed paths to authorize**"
        : "✅ **Change is inside approved scope**";
  const lines = [
    "## EngineeringSpec review",
    "",
    headline,
    "",
    `- Authority: ${markdownCode(report.authority)} at ${markdownCode(report.baseSha)}`,
    `- Change classification: ${markdownCode(report.classification)}`,
    `- Working state: ${report.workingState.changed} changed, ${report.workingState.selected} selected, ${report.workingState.violations} violation(s)`,
    `- Declared coverage: ${markdownCode(report.coverage.status)}`,
    `- Next: **${report.next.stage}** — ${safe(report.next.message)}`,
    "",
    "### Changed paths",
    "",
    "| Path | Kind | Decision | Contract | Targets |",
    "| --- | --- | --- | --- | --- |",
    ...report.routes.map((route) => `| ${markdownCode(route.path)} | ${route.kind} | ${route.decision} | ${safe(route.selected?.specId ?? "—")} | ${safe(route.selected?.targetIds.join(", ") ?? "—")} |`),
  ];
  if (report.routes.length === 0) lines.push("| — | — | no changes | — | — |");
  for (const contract of report.contracts) {
    lines.push("", `### ${safe(contract.id)} — ${safe(contract.title)}`, "", `Targets: ${contract.targetIds.map(markdownCode).join(", ") || "none"}`);
    if (contract.constraints.length > 0) {
      lines.push("", "Obligations:", ...contract.constraints.map((item) => `- **${safe(item.id)}** (${safe(item.level)}): ${safe(item.statement)}`));
    }
    if (contract.verification.length > 0) {
      lines.push("", `Verification identities: ${contract.verification.map((item) => markdownCode(item.id)).join(", ")}`);
    }
  }
  for (const authorityDiff of report.authorityDiffs) lines.push("", authorityDiffMarkdown(authorityDiff));
  if (report.diagnostics.length > 0) {
    lines.push("", "### Diagnostics", "", ...report.diagnostics.map((item) => `- **${safe(item.code)}** ${safe(item.file ? `${item.file}: ${item.message}` : item.message)}`));
  }
  lines.push("", "_This report explains base-pinned authority. It does not execute verifiers or grant approval._", "");
  return lines.join("\n");
}

export function reviewText(report: ReviewReport): string {
  const decision = !report.valid
    ? "not_authorized"
    : report.classification === "contract_only"
      ? "contract_only_no_implementation_authority"
      : report.workingState.changed === 0
        ? "no_changes"
        : "inside_approved_scope";
  return [
    `review: ${report.valid ? "pass" : "fail"}`,
    `decision: ${decision}`,
    `authority: base ${displaySafe(report.baseSha)}`,
    `working state: ${report.workingState.changed} changed, ${report.workingState.selected} selected, ${report.workingState.violations} violations`,
    `classification: ${displaySafe(report.classification)}`,
    `coverage: ${displaySafe(report.coverage.status)}`,
    ...report.routes.map((route) => `${route.decision === "selected" ? "✓" : "x"} ${displaySafe(route.path)} (${displaySafe(route.kind)}): ${displaySafe(route.selected?.specId ?? route.decision)}`),
    ...report.contracts.flatMap((contract) => [
      `contract: ${displaySafe(contract.id)} (${displaySafe(contract.status)}); targets: ${contract.targetIds.map(displaySafe).join(", ") || "none"}`,
      ...contract.constraints.map((item) => `obligation: ${displaySafe(item.id)} (${displaySafe(item.level)}) ${displaySafe(item.statement)}`),
      ...contract.verification.map((item) => `verification: ${displaySafe(item.id)} (${displaySafe(item.kind)}) proves ${item.proves.map(displaySafe).join(", ")}`),
    ]),
    ...report.authorityDiffs.map(authorityDiffText),
    ...report.diagnostics.map((item) => `${displaySafe(item.severity)}: ${displaySafe(item.code)} ${item.file ? `${displaySafe(item.file)}: ` : ""}${displaySafe(item.message)}`),
    `next: ${displaySafe(report.next.stage)} — ${displaySafe(report.next.message)}`,
  ].join("\n");
}
