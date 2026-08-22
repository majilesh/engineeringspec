import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { isEngineeringSpecFilename } from "../discovery/discover.js";
import { listGitTreePaths, readGitBlob, resolveGitRelativeDirectory } from "../gate/loadSpec.js";
import { digest } from "../normalizer/digest.js";
import { normalize } from "../normalizer/normalize.js";
import { validateMarkdown } from "../validator/validateFile.js";
import type { LoadedRoutingCandidate } from "./types.js";
import type { RepositoryContentReader } from "../profiles/productspec/validate.js";

export const MAX_ROUTING_CANDIDATES = 10_000;

export function assertRoutingCandidateLimit(candidateCount: number): void {
  if (candidateCount > MAX_ROUTING_CANDIDATES) {
    throw new Error(`Routing candidate limit exceeded (${candidateCount} > ${MAX_ROUTING_CANDIDATES})`);
  }
}

export interface LoadedCandidateSet {
  directory: string;
  candidates: LoadedRoutingCandidate[];
  diagnostics: Diagnostic[];
  valid: boolean;
}

export async function loadRoutingCandidates(options: {
  baseSha: string;
  directory: string;
  strict?: boolean;
  cwd?: string;
  snapshotReader?: RepositoryContentReader & { listPaths(directory:string):Promise<string[]> };
}): Promise<LoadedCandidateSet> {
  const directory = options.snapshotReader ? options.directory : await resolveGitRelativeDirectory(options.directory, options.cwd);
  const paths = (options.snapshotReader
    ? await options.snapshotReader.listPaths(directory)
    : await listGitTreePaths(options.baseSha, directory, options.cwd)).filter(isEngineeringSpecFilename);
  assertRoutingCandidateLimit(paths.length);
  const candidates: LoadedRoutingCandidate[] = [];
  const diagnostics: Diagnostic[] = [];
  let candidateFailed = false;
  for (const candidatePath of paths) {
    const label = `${options.baseSha}:${candidatePath}`;
    const content = options.snapshotReader
      ? Buffer.from(await options.snapshotReader.readBytes(candidatePath)).toString("utf8")
      : await readGitBlob(options.baseSha, candidatePath, options.cwd);
    const validation = await validateMarkdown(content, label, options.snapshotReader
      ? { resolveProfiles: true, strictExternal: true, repositoryContentReader: options.snapshotReader }
      : { resolveProfiles: false });
    diagnostics.push(...validation.diagnostics);
    const failed = !validation.spec
      || validation.diagnostics.some((item) => item.severity === "error")
      || Boolean(options.strict && validation.diagnostics.some((item) => item.severity === "warning"));
    candidateFailed ||= failed;
    if (!failed && validation.spec) {
      const spec = normalize(validation.spec);
      candidates.push({ path: candidatePath, digest: digest(spec), spec });
    }
  }
  return {
    directory,
    candidates,
    diagnostics,
    valid: !candidateFailed && !diagnostics.some((item) => item.severity === "error")
      && !(options.strict && diagnostics.some((item) => item.severity === "warning")),
  };
}
