import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { ChangedFile, ChangeKind } from "../gate/types.js";
import type { EngineeringSpec, Status } from "../model/types.js";
import type { CoverageLevel } from "../query/coverage.js";

export interface LoadedRoutingCandidate {
  path: string;
  digest: string;
  spec: EngineeringSpec;
}

export interface RoutingCandidateSummary {
  path: string;
  digest: string;
  specId: string;
  status: Status;
  eligible: boolean;
}

export interface RoutingClaim {
  specId: string;
  specPath: string;
  targetIds: string[];
}

export interface PathRoute {
  path: string;
  kind: ChangeKind;
  decision: "selected" | "uncovered" | "ambiguous" | "denied";
  selected?: RoutingClaim;
  claims: RoutingClaim[];
}

export interface RoutingReport {
  valid: boolean;
  base: string;
  baseSha: string;
  head: string;
  headSha: string;
  candidateDirectory: string;
  requiredStatuses: Status[];
  changedDigest: string;
  changed: ChangedFile[];
  candidates: RoutingCandidateSummary[];
  coverage: {
    status: CoverageLevel;
    specs: Array<{ specId: string; status: CoverageLevel }>;
  };
  routes: PathRoute[];
  diagnostics: Diagnostic[];
}
