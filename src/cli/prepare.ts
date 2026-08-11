import { isEngineeringSpecFilename } from "../discovery/discover.js";
import { listGitTreePaths, readGitBlob, resolveCommitSha, resolveGitRelativeDirectory } from "../gate/loadSpec.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { digest } from "../normalizer/digest.js";
import { normalize } from "../normalizer/normalize.js";
import { buildChangeBrief, type ChangeBrief } from "../query/changeBrief.js";
import { validateMarkdown } from "../validator/validateFile.js";

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
    reason,
    action,
    authority: {
      kind: "base_pinned",
      baseRef: options.base,
      baseSha,
      specDirectory: directory,
    },
    contract: { id: options.contractId },
    diagnostics,
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

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/gu, " ");
}

function markdownSafe(value: string): string {
  return oneLine(value).replaceAll("|", "\\|").replaceAll("`", "\\`");
}

export function prepareText(report: PrepareReport): string {
  if (report.result === "blocked") {
    return [
      "prepare: blocked",
      "permission: none",
      `contract: ${oneLine(report.contract.id)}`,
      `authority: base ${report.authority.baseSha}`,
      `reason: ${oneLine(report.reason ?? "Implementation authority is unavailable.")}`,
      `action: ${oneLine(report.action ?? "Resolve the contract lifecycle or base authority and rerun prepare.")}`,
      ...("diagnostics" in report ? report.diagnostics.map((item) => `${item.severity}: ${item.code} ${oneLine(item.message)}`) : []),
    ].join("\n");
  }
  return [
    "prepare: ready",
    "permission: implementation",
    `contract: ${report.contract.id} revision ${report.contract.specRevision} (${report.contract.status})`,
    `authority: base ${report.authority.baseSha}; ${report.authority.specPath}; ${report.authority.specDigest}`,
    "read access: repository reading is allowed for correctness",
    "write access: only the declared writable surfaces below; all other paths are not writable",
    ...report.writableSurfaces.map((item) => `writable: ${item.id} (${item.changePolicy}) ${item.paths.join(", ")}`),
    ...report.protectedSurfaces.map((item) => `protected: ${item.id} (${item.changePolicy}) ${item.paths.join(", ")}`),
    ...report.constraints.map((item) => `obligation: ${item.id} (${item.level}) ${oneLine(item.statement)}`),
    ...report.verification.map((item) => `verification: ${item.id} (${item.kind}; runner inert) proves ${item.proves.join(", ")}`),
    ...report.sourceIntent.map((item) => `source: ${item.id} (${item.type}) ${item.locator}${item.digest ? `; ${item.digest}` : "; digest unavailable"}`),
    ...(report.unresolvedQuestions.length > 0
      ? report.unresolvedQuestions.map((item) => `unresolved: ${item.id} ${oneLine(item.question)}`)
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
      `- Contract: \`${markdownSafe(report.contract.id)}\``,
      `- Authority: base \`${report.authority.baseSha}\``,
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
    `- Contract: \`${markdownSafe(report.contract.id)}\` revision ${report.contract.specRevision} (\`${report.contract.status}\`)`,
    `- Base authority: \`${report.authority.baseSha}\``,
    `- Contract path: \`${markdownSafe(report.authority.specPath)}\``,
    `- Contract digest: \`${report.authority.specDigest}\``,
    "- Reading: repository reading is allowed when needed for correctness",
    "- Writing: only the declared writable surfaces below; all other paths are not writable",
    "",
    "### Writable surfaces",
    "",
    "| Target | Policy | Paths |",
    "| --- | --- | --- |",
    ...report.writableSurfaces.map((item) => `| \`${markdownSafe(item.id)}\` | ${item.changePolicy} | ${item.paths.map((path) => `\`${markdownSafe(path)}\``).join("<br>")} |`),
  ];
  if (report.writableSurfaces.length === 0) lines.push("| — | — | none | ");
  if (report.protectedSurfaces.length > 0) {
    lines.push("", "### Protected or read-only surfaces", "", ...report.protectedSurfaces.map((item) => `- \`${markdownSafe(item.id)}\` (${item.changePolicy}): ${item.paths.map((path) => `\`${markdownSafe(path)}\``).join(", ")}`));
  }
  lines.push("", "### Obligations", "", ...report.constraints.map((item) => `- **${markdownSafe(item.id)}** (${item.level}): ${markdownSafe(item.statement)}`));
  lines.push("", "### Verification identities", "", ...report.verification.map((item) => `- \`${markdownSafe(item.id)}\` (${item.kind}; runner inert): proves ${item.proves.map((id) => `\`${markdownSafe(id)}\``).join(", ")}`));
  lines.push("", "### Source intent", "", ...report.sourceIntent.map((item) => `- \`${markdownSafe(item.id)}\` (${item.type}): ${markdownSafe(item.locator)}${item.digest ? ` — \`${item.digest}\`` : " — digest unavailable"}`));
  lines.push("", "### Unresolved questions", "", ...(report.unresolvedQuestions.length > 0
    ? report.unresolvedQuestions.map((item) => `- **${markdownSafe(item.id)}** ${markdownSafe(item.question)}`)
    : ["None declared through an `escalate` constraint."]));
  lines.push("", "_Declared verifier runners are inert and were not executed or exposed._", "");
  return lines.join("\n");
}
