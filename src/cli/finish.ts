import { realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveRepositoryConfig } from "../config/repositoryConfig.js";
import { collectGitWorktreeDiff } from "../gate/collectDiff.js";
import { gitShowToplevel, readGitBlob } from "../gate/loadSpec.js";
import { digest } from "../normalizer/digest.js";
import { normalize } from "../normalizer/normalize.js";
import { readEvidenceFile, type ImplementationReceipt, type VerificationEvidence } from "../evidence/receipt.js";
import { buildPrMetadata, type PrMetadata } from "../evidence/prMetadata.js";
import { validateMarkdown } from "../validator/validateFile.js";
import { packageVersion } from "./version.js";
import { prepareChange } from "./prepare.js";
import { buildReview, type ReviewReport } from "./review.js";
import { transitionStatus } from "./transition.js";

export interface FinishReport {
  result: "ready" | "blocked";
  review: ReviewReport;
  receipt?: ImplementationReceipt;
  pr?: PrMetadata;
  closureWritten: boolean;
}

export async function finishContract(options: { contractId: string; base?: string; cwd?: string; staged?: boolean; evidence?: string; writeClosure?: boolean; output?: string }): Promise<FinishReport> {
  if (options.staged && options.writeClosure) throw new Error("--write-closure cannot be combined with --staged because finish never stages files");
  const root = await gitShowToplevel(options.cwd);
  let resolvedOutput: string | undefined;
  if (options.output) {
    const outputPath = path.resolve(options.cwd ?? process.cwd(), options.output);
    const physicalRoot = await realpath(root);
    const physicalParent = await realpath(path.dirname(outputPath));
    const relative = path.relative(physicalRoot, path.join(physicalParent, path.basename(outputPath)));
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
      throw new Error("--output must be outside the Git worktree so generated metadata cannot invalidate its own complete-state digest");
    }
    resolvedOutput = outputPath;
  }
  const config = await resolveRepositoryConfig({ ...(options.base ? { base: options.base } : {}), ...(options.cwd ? { cwd: options.cwd } : {}) });
  const brief = await prepareChange({ contractId: options.contractId, specDirectory: config.config.specDirectory, base: config.baseSha, strict: config.config.strict, ...(options.cwd ? { cwd: options.cwd } : {}) });
  let review = await buildReview({ specDirectory: config.config.specDirectory, base: config.baseSha, strict: config.config.strict, staged: Boolean(options.staged), worktree: !options.staged, allowContractOnly: true, ...(options.cwd ? { cwd: options.cwd } : {}) });
  if (brief.result === "blocked" || !review.valid) return { result: "blocked", review, closureWritten: false };
  let closureWritten = false;
  if (options.writeClosure) {
    await transitionStatus(path.join(root, brief.authority.specPath), "implemented", true);
    closureWritten = true;
    review = await buildReview({ specDirectory: config.config.specDirectory, base: config.baseSha, strict: config.config.strict, staged: Boolean(options.staged), worktree: !options.staged, allowContractOnly: true, ...(options.cwd ? { cwd: options.cwd } : {}) });
    if (!review.valid) return { result: "blocked", review, closureWritten };
  }
  const candidate = review.contracts.find((item) => item.id === options.contractId);
  const baseSpec = await validateMarkdown(await readGitBlob(config.baseSha, brief.authority.specPath, options.cwd), `${config.baseSha}:${brief.authority.specPath}`);
  if (!candidate || !baseSpec.spec) return { result: "blocked", review, closureWritten };
  const specRevision = baseSpec.spec.metadata.specRevision;
  const semanticDigest = digest(normalize(baseSpec.spec));
  const expectedIds = new Set(candidate.verification.map((item) => item.id));
  const supplied = options.evidence ? await readEvidenceFile(options.evidence, expectedIds, {
    baseSha: config.baseSha,
    contractId: options.contractId,
    specRevision,
    semanticDigest,
    changeDigest: review.changedDigest,
  }) : [];
  const byId = new Map(supplied.map((item) => [item.verifierId, item]));
  const verification: VerificationEvidence[] = candidate.verification.map((item) => byId.get(item.id)
    ?? { verifierId: item.id, state: config.config.trustedVerifiers[`${options.contractId}#${item.id}`] ? "mapped" : "not_run" });
  const full = await collectGitWorktreeDiff({ base: config.baseSha, head: "HEAD", ...(options.cwd ? { cwd: options.cwd } : {}) });
  const completeWorkingState = !options.staged;
  const receipt: ImplementationReceipt = {
    format: "engineering-spec-implementation-receipt",
    formatVersion: "0.2",
    generatedAt: new Date().toISOString(),
    cliVersion: packageVersion(),
    authority: { baseSha: config.baseSha, contractId: options.contractId, specRevision, semanticDigest },
    change: { digest: review.changedDigest, completeWorkingState, excludedPaths: completeWorkingState ? 0 : Math.max(0, full.length - review.workingState.changed) },
    authorization: {
      valid: review.valid,
      classification: review.classification,
      limitations: [
        "Specification-declared runners were not executed.",
        ...(completeWorkingState ? [] : ["Scoped staged result excludes other working-tree changes and is not a complete-worktree claim."]),
      ],
    },
    verification,
  };
  const pr = buildPrMetadata(receipt);
  if (resolvedOutput) await writeFile(resolvedOutput, `${JSON.stringify({ receipt, pr }, null, 2)}\n`, "utf8");
  return { result: "ready", review, receipt, pr, closureWritten };
}
