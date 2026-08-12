import { isEngineeringSpecFilename } from "../discovery/discover.js";
import { listGitTreePaths, readGitBlob, resolveCommitSha, resolveGitRelativeDirectory } from "../gate/loadSpec.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { digest } from "../normalizer/digest.js";
import { normalize } from "../normalizer/normalize.js";
import { briefDisplaySafe, buildChangeBrief, type ChangeBrief } from "../query/changeBrief.js";
import { validateMarkdown } from "../validator/validateFile.js";
import { displaySafe, markdownCode, markdownText } from "./render.js";

const MAX_PREPARE_CANDIDATES = 10_000;

export interface PrepareOptions {
  contractId: string;
  specDirectory: string;
  base: string;
  strict?: boolean;
  cwd?: string;
}

export interface BlockedPrepareReport {
  result: "blocked";
  permission: "none";
  reason: string;
  action: string;
  authority: {
    kind: "base_pinned";
    baseRef: string;
    baseSha: string;
    specDirectory: string;
  };
  contract: { id: string };
  diagnostics: Array<{ code: string; severity: string; message: string; file?: string }>;
}

export type PrepareReport = ChangeBrief | BlockedPrepareReport;

function blocked(
  options: PrepareOptions,
  baseSha: string,
  directory: string,
  reason: string,
  action: string,
  diagnostics: BlockedPrepareReport["diagnostics"] = [],
): BlockedPrepareReport {
  return {
    result: "blocked",
    permission: "none",
    reason: briefDisplaySafe(reason),
    action: briefDisplaySafe(action),
    authority: {
      kind: "base_pinned",
      baseRef: briefDisplaySafe(options.base),
      baseSha: briefDisplaySafe(baseSha),
      specDirectory: briefDisplaySafe(directory),
    },
    contract: { id: briefDisplaySafe(options.contractId) },
    diagnostics: diagnostics.map((item) => ({
      code: briefDisplaySafe(item.code),
      severity: briefDisplaySafe(item.severity),
      message: briefDisplaySafe(item.message),
      ...(item.file ? { file: briefDisplaySafe(item.file) } : {}),
    })),
  };
}

export async function prepareChange(options: PrepareOptions): Promise<PrepareReport> {
  const baseSha = await resolveCommitSha(options.base, options.cwd);
  const directory = await resolveGitRelativeDirectory(options.specDirectory, options.cwd);
  const paths = (await listGitTreePaths(baseSha, directory, options.cwd))
    .filter(isEngineeringSpecFilename)
    .sort(compareCodePoints);
  if (paths.length > MAX_PREPARE_CANDIDATES) {
    return blocked(
      options,
      baseSha,
      directory,
      `Contract candidate limit exceeded (${paths.length} > ${MAX_PREPARE_CANDIDATES}).`,
      "Narrow the base-pinned specification directory and rerun prepare.",
    );
  }
  const matches: Array<{ path: string; spec: NonNullable<Awaited<ReturnType<typeof validateMarkdown>>["spec"]> }> = [];
  const diagnostics: BlockedPrepareReport["diagnostics"] = [];

  for (const candidatePath of paths) {
    const label = `${baseSha}:${candidatePath}`;
    const validation = await validateMarkdown(await readGitBlob(baseSha, candidatePath, options.cwd), label, { resolveProfiles: false });
    diagnostics.push(...validation.diagnostics.map((item) => ({
      code: item.code,
      severity: item.severity,
      message: item.message,
      ...(item.file ? { file: item.file } : {}),
    })));
    const failed = !validation.spec
      || validation.diagnostics.some((item) => item.severity === "error")
      || Boolean(options.strict && validation.diagnostics.some((item) => item.severity === "warning"));
    if (!failed && validation.spec?.metadata.id === options.contractId) {
      matches.push({ path: candidatePath, spec: validation.spec });
    }
  }

  const loadFailed = diagnostics.some((item) => item.severity === "error")
    || Boolean(options.strict && diagnostics.some((item) => item.severity === "warning"));
  if (loadFailed) {
    return blocked(
      options,
      baseSha,
      directory,
      "The trusted base contract set did not validate cleanly.",
      "Resolve base-tree validation diagnostics before requesting implementation authority.",
      diagnostics,
    );
  }
  if (matches.length === 0) {
    return blocked(
      options,
      baseSha,
      directory,
      `Contract ${options.contractId} was not found in the trusted base directory.`,
      "Confirm the exact contract ID and merge it into the selected base before rerunning prepare.",
    );
  }
  if (matches.length > 1) {
    return blocked(
      options,
      baseSha,
      directory,
      `Contract ${options.contractId} is ambiguous in the trusted base directory.`,
      "Remove duplicate contract identities in a contract-only governance change.",
    );
  }

  const match = matches[0]!;
  const spec = normalize(match.spec);
  return buildChangeBrief(spec, {
    baseRef: options.base,
    baseSha,
    specPath: match.path,
    specDigest: digest(spec),
  });
}

function markdownSafe(value: string): string {
  return markdownText(value);
}

export function prepareText(report: PrepareReport): string {
  if (report.result === "blocked") {
    return [
      "prepare: blocked",
      "permission: none",
      `contract: ${displaySafe(report.contract.id)}`,
      `authority: base ${displaySafe(report.authority.baseSha)}`,
      `reason: ${displaySafe(report.reason ?? "Implementation authority is unavailable.")}`,
      `action: ${displaySafe(report.action ?? "Resolve the contract lifecycle or base authority and rerun prepare.")}`,
      ...("diagnostics" in report ? report.diagnostics.map((item) => `${displaySafe(item.severity)}: ${displaySafe(item.code)} ${displaySafe(item.message)}`) : []),
    ].join("\n");
  }
  return [
    "prepare: ready",
    "permission: implementation",
    `contract: ${displaySafe(report.contract.id)} — ${displaySafe(report.contract.title)}; revision ${report.contract.specRevision} (${displaySafe(report.contract.status)})`,
    `authority: base ${displaySafe(report.authority.baseSha)}; ${displaySafe(report.authority.specPath)}; ${displaySafe(report.authority.specDigest)}`,
    ...(report.contract.repository ? [`repository: ${displaySafe(report.contract.repository)}`] : []),
    ...(report.contract.declaredBaseRevision ? [`declared base revision: ${displaySafe(report.contract.declaredBaseRevision)}`] : []),
    "read access: repository reading is allowed for correctness",
    "write access: only the declared writable surfaces below; all other paths are not writable",
    "routing: final path authorization remains subject to multi-contract select/check",
    ...report.writableSurfaces.flatMap((item) => [
      `writable: ${displaySafe(item.id)} (${displaySafe(item.changePolicy)}) ${item.paths.map(displaySafe).join(", ")}`,
      ...(item.component ? [`writable component: ${displaySafe(item.id)} ${displaySafe(item.component)}`] : []),
      ...(item.notes ? [`writable note: ${displaySafe(item.id)} ${displaySafe(item.notes)}`] : []),
      ...(item.enforcementNote ? [`writable enforcement note: ${displaySafe(item.id)} ${displaySafe(item.enforcementNote)}`] : []),
    ]),
    ...report.protectedSurfaces.flatMap((item) => [
      `protected: ${displaySafe(item.id)} (${displaySafe(item.changePolicy)}) ${item.paths.map(displaySafe).join(", ")}`,
      ...(item.notes ? [`protected note: ${displaySafe(item.id)} ${displaySafe(item.notes)}`] : []),
    ]),
    ...report.constraints.map((item) => `obligation: ${displaySafe(item.id)} (${displaySafe(item.level)}) ${displaySafe(item.statement)}`),
    ...report.technicalContracts.map((item) => `technical contract: ${displaySafe(item.id)} (${displaySafe(item.kind)})${item.locator ? ` ${displaySafe(item.locator)}` : ""}${item.compatibility ? `; compatibility ${displaySafe(item.compatibility)}` : ""}`),
    ...report.verification.map((item) => `verification: ${displaySafe(item.id)} (${displaySafe(item.kind)}; runner inert) proves ${item.proves.map(displaySafe).join(", ")}`),
    ...report.sourceIntent.map((item) => `source: ${displaySafe(item.id)} (${displaySafe(item.type)}) ${displaySafe(item.locator)}${item.title ? `; ${displaySafe(item.title)}` : ""}${item.revision !== undefined ? `; revision ${displaySafe(String(item.revision))}` : ""}${item.digest ? `; ${displaySafe(item.digest)}` : "; digest unavailable"}`),
    ...(report.unresolvedQuestions.length > 0
      ? report.unresolvedQuestions.map((item) => `unresolved: ${displaySafe(item.id)} ${displaySafe(item.question)}`)
      : ["unresolved: none declared"]),
  ].join("\n");
}

export function prepareMarkdown(report: PrepareReport): string {
  if (report.result === "blocked") {
    const diagnostics = "diagnostics" in report && report.diagnostics.length > 0
      ? ["", "### Diagnostics", "", ...report.diagnostics.map((item) => `- **${markdownSafe(item.code)}** ${markdownSafe(item.message)}`)]
      : [];
    return [
      "## EngineeringSpec preparation brief",
      "",
      "❌ **Implementation is blocked**",
      "",
      `- Contract: ${markdownCode(report.contract.id)}`,
      `- Authority: base ${markdownCode(report.authority.baseSha)}`,
      `- Reason: ${markdownSafe(report.reason ?? "Implementation authority is unavailable.")}`,
      `- Next action: ${markdownSafe(report.action ?? "Resolve the contract lifecycle or base authority and rerun prepare.")}`,
      ...diagnostics,
      "",
    ].join("\n");
  }
  const lines = [
    "## EngineeringSpec preparation brief",
    "",
    "✅ **Base-pinned implementation authority is ready**",
    "",
    `- Contract: ${markdownCode(report.contract.id)} — ${markdownSafe(report.contract.title)}; revision ${report.contract.specRevision} (${markdownCode(report.contract.status)})`,
    `- Base authority: ${markdownCode(report.authority.baseSha)}`,
    `- Contract path: ${markdownCode(report.authority.specPath)}`,
    `- Contract digest: ${markdownCode(report.authority.specDigest)}`,
    ...(report.contract.repository ? [`- Repository: ${markdownSafe(report.contract.repository)}`] : []),
    ...(report.contract.declaredBaseRevision ? [`- Declared base revision: ${markdownCode(report.contract.declaredBaseRevision)}`] : []),
    "- Reading: repository reading is allowed when needed for correctness",
    "- Writing: only the declared writable surfaces below; all other paths are not writable",
    "- Routing: final path authorization remains subject to multi-contract `select`/`check`",
    "",
    "### Writable surfaces",
    "",
    "| Target | Policy | Paths |",
    "| --- | --- | --- |",
    ...report.writableSurfaces.map((item) => `| ${markdownCode(item.id)} | ${markdownSafe(item.changePolicy)} | ${item.paths.map(markdownCode).join("<br>")} |`),
  ];
  if (report.writableSurfaces.length === 0) lines.push("| — | — | none | ");
  const writableNotes = report.writableSurfaces.flatMap((item) => [
    ...(item.component ? [`- ${markdownCode(item.id)} component: ${markdownSafe(item.component)}`] : []),
    ...(item.notes ? [`- ${markdownCode(item.id)} note: ${markdownSafe(item.notes)}`] : []),
    ...(item.enforcementNote ? [`- ${markdownCode(item.id)} enforcement: **${markdownSafe(item.enforcementNote)}**`] : []),
  ]);
  if (writableNotes.length > 0) lines.push("", "#### Writable-surface notes", "", ...writableNotes);
  if (report.protectedSurfaces.length > 0) {
    lines.push("", "### Protected or read-only surfaces", "", ...report.protectedSurfaces.flatMap((item) => [
      `- ${markdownCode(item.id)} (${markdownSafe(item.changePolicy)}): ${item.paths.map(markdownCode).join(", ")}`,
      ...(item.notes ? [`  - Note: ${markdownSafe(item.notes)}`] : []),
    ]));
  }
  lines.push("", "### Obligations", "", ...report.constraints.map((item) => `- **${markdownSafe(item.id)}** (${markdownSafe(item.level)}): ${markdownSafe(item.statement)}`));
  lines.push("", "### Technical contracts", "", ...(report.technicalContracts.length > 0
    ? report.technicalContracts.map((item) => `- ${markdownCode(item.id)} (${markdownSafe(item.kind)})${item.locator ? `: ${markdownSafe(item.locator)}` : ""}${item.compatibility ? ` — compatibility ${markdownCode(item.compatibility)}` : ""}`)
    : ["None declared."]));
  lines.push("", "### Verification identities", "", ...report.verification.map((item) => `- ${markdownCode(item.id)} (${markdownSafe(item.kind)}; runner inert): proves ${item.proves.map(markdownCode).join(", ")}`));
  lines.push("", "### Source intent", "", ...report.sourceIntent.map((item) => `- ${markdownCode(item.id)} (${markdownSafe(item.type)}): ${markdownSafe(item.locator)}${item.title ? ` — ${markdownSafe(item.title)}` : ""}${item.revision !== undefined ? ` — revision ${markdownSafe(String(item.revision))}` : ""}${item.digest ? ` — ${markdownCode(item.digest)}` : " — digest unavailable"}`));
  lines.push("", "### Unresolved questions", "", ...(report.unresolvedQuestions.length > 0
    ? report.unresolvedQuestions.map((item) => `- **${markdownSafe(item.id)}** ${markdownSafe(item.question)}`)
    : ["None declared through an `escalate` constraint."]));
  lines.push("", "_Declared verifier runners are inert and were not executed or exposed._", "");
  return lines.join("\n");
}
