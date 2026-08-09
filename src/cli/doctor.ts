import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { gitShowToplevel, resolveCommitSha, resolveGitRelativeDirectory } from "../gate/loadSpec.js";
import type { Status } from "../model/types.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import { selectSpecs } from "../routing/select.js";
import { validatePath } from "../validator/validatePath.js";

const MAX_INTEGRATION_FILE_BYTES = 1024 * 1024;
const MAX_WORKFLOW_FILES = 1_000;

export type DoctorCheckStatus = "pass" | "warning" | "fail";

export interface DoctorCheck {
  id: "git-worktree" | "base-ref" | "spec-directory" | "spec-validation" | "base-contracts" | "agent-guidance" | "enforcing-ci";
  status: DoctorCheckStatus;
  message: string;
  remediation?: string;
}

export interface DoctorReport {
  valid: boolean;
  root: string;
  specDirectory: string;
  base: string;
  baseSha?: string;
  candidates: number;
  lifecycle: Record<Status, number>;
  checks: DoctorCheck[];
  diagnostics: Diagnostic[];
}

export interface DoctorOptions {
  root?: string;
  specDirectory?: string;
  base?: string;
  strict?: boolean;
}

function emptyLifecycle(): Record<Status, number> {
  return { draft: 0, proposed: 0, approved: 0, implemented: 0, superseded: 0, rejected: 0 };
}

function failed(id: DoctorCheck["id"], message: string, remediation: string): DoctorCheck {
  return { id, status: "fail", message, remediation };
}

async function boundedText(file: string): Promise<string | undefined> {
  try {
    const details = await stat(file);
    if (!details.isFile() || details.size > MAX_INTEGRATION_FILE_BYTES) return undefined;
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function hasAgentGuidance(root: string): Promise<boolean> {
  const agents = await boundedText(path.join(root, "AGENTS.md"));
  return Boolean(agents?.includes("EngineeringSpec") && agents.includes("check"));
}

async function hasEnforcingCi(root: string): Promise<boolean> {
  const workflowDirectory = path.join(root, ".github", "workflows");
  let entries;
  try {
    entries = await readdir(workflowDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  const workflows = entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort(compareCodePoints);
  if (workflows.length > MAX_WORKFLOW_FILES) return false;
  for (const name of workflows) {
    const source = await boundedText(path.join(workflowDirectory, name));
    if (source?.includes("gate-spec-dir:") && source.includes("gate-base:") && source.includes("approved")) return true;
  }
  return false;
}

export async function diagnoseRepository(options: DoctorOptions = {}): Promise<DoctorReport> {
  const requestedRoot = path.resolve(options.root ?? ".");
  const specDirectory = options.specDirectory ?? "docs/engineering-specs";
  const base = options.base ?? "origin/main";
  const checks: DoctorCheck[] = [];
  const lifecycle = emptyLifecycle();
  const diagnostics: Diagnostic[] = [];
  let root = requestedRoot;
  let baseSha: string | undefined;
  let candidates = 0;

  try {
    root = await gitShowToplevel(requestedRoot);
    checks.push({ id: "git-worktree", status: "pass", message: "Git worktree detected." });
  } catch {
    checks.push(failed("git-worktree", "No Git worktree was detected.", "Run doctor inside the repository that will enforce EngineeringSpec."));
    return { valid: false, root, specDirectory, base, candidates, lifecycle, checks, diagnostics };
  }

  try {
    baseSha = await resolveCommitSha(base, root);
    checks.push({ id: "base-ref", status: "pass", message: `Base ref resolves to ${baseSha}.` });
  } catch {
    checks.push(failed("base-ref", `Base ref ${JSON.stringify(base)} does not resolve.`, "Fetch the trusted default branch or pass --base with an existing ref."));
  }

  let relativeDirectory: string | undefined;
  try {
    relativeDirectory = await resolveGitRelativeDirectory(specDirectory, root);
    const directoryStat = await stat(path.join(root, relativeDirectory));
    if (!directoryStat.isDirectory()) throw new Error("not a directory");
    checks.push({ id: "spec-directory", status: "pass", message: `Specification directory ${relativeDirectory} exists.` });
  } catch {
    checks.push(failed("spec-directory", `Specification directory ${JSON.stringify(specDirectory)} is missing or unsafe.`, "Create the directory with a contract-only change or pass --spec-dir with a safe repository-relative directory."));
  }

  if (relativeDirectory) {
    try {
      const validation = await validatePath(path.join(root, relativeDirectory), { strict: Boolean(options.strict), resolveProfiles: false });
      diagnostics.push(...validation.diagnostics);
      const hasWarnings = validation.diagnostics.some((item) => item.severity === "warning");
      const validationFailed = validation.diagnostics.some((item) => item.severity === "error") || Boolean(options.strict && hasWarnings);
      checks.push(validationFailed
        ? failed("spec-validation", `Workspace specifications have ${validation.errors} error(s) and ${validation.warnings} warning(s).`, "Fix validation diagnostics before proposing or implementing a change.")
        : {
            id: "spec-validation",
            status: hasWarnings ? "warning" : "pass",
            message: `Workspace specifications validate (${validation.files.length} document(s), ${validation.warnings} warning(s)).`,
            ...(hasWarnings ? { remediation: "Review warnings or rerun with --strict to require a warning-free setup." } : {}),
          });
    } catch {
      checks.push(failed("spec-validation", "Workspace specifications could not be validated.", "Check directory permissions and specification filenames."));
    }
  }

  if (baseSha && relativeDirectory) {
    try {
      const routed = await selectSpecs({ directory: relativeDirectory, base: baseSha, changed: [], strict: Boolean(options.strict), cwd: root });
      diagnostics.push(...routed.diagnostics);
      candidates = routed.candidates.length;
      for (const candidate of routed.candidates) lifecycle[candidate.status] += 1;
      checks.push(routed.valid
        ? { id: "base-contracts", status: "pass", message: `Trusted base contains ${candidates} valid contract candidate(s).` }
        : failed("base-contracts", "Trusted-base contract loading failed closed.", "Resolve base-tree validation or duplicate-ID diagnostics before implementation."));
    } catch {
      checks.push(failed("base-contracts", "Trusted-base contracts could not be loaded.", "Confirm the base ref contains the specification directory and fetch missing history."));
    }
  }

  checks.push(await hasAgentGuidance(root)
    ? { id: "agent-guidance", status: "pass", message: "Neutral AGENTS.md guidance is present." }
    : { id: "agent-guidance", status: "warning", message: "Neutral AGENTS.md guidance was not detected.", remediation: "Run adopt --merge --dry-run, review the result, then apply the scaffold." });
  checks.push(await hasEnforcingCi(root)
    ? { id: "enforcing-ci", status: "pass", message: "Approved-only directory gating is configured in GitHub Actions." }
    : { id: "enforcing-ci", status: "warning", message: "Approved-only directory gating was not detected in GitHub Actions.", remediation: "Install and protect the generated EngineeringSpec workflow before relying on merge enforcement." });

  const invalid = checks.some((check) => check.status === "fail")
    || Boolean(options.strict && checks.some((check) => check.status === "warning"));
  return {
    valid: !invalid,
    root,
    specDirectory: relativeDirectory ?? specDirectory,
    base,
    ...(baseSha ? { baseSha } : {}),
    candidates,
    lifecycle,
    checks,
    diagnostics,
  };
}
