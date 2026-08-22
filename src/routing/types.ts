import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { ChangedFile, ChangeKind } from "../gate/types.js";
import type { EngineeringSpec, Status } from "../model/types.js";
import type { CoverageLevel } from "../query/coverage.js";
import type { GovernanceReport } from "./governance.js";

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
  specRevision:number;
  semanticDigest:string;
}

export interface RoutingClaim {
  specId: string;
  specPath: string;
  targetIds: string[];
  specRevision:number;
  semanticDigest:string;
}

export interface SequencingAuditRecord {
  trustedBaseSha?: string;
  controller: { specId:string; specPath:string; specRevision:number; semanticDigest:string };
  referenced: { specId:string; specPath?:string; specRevision:number; semanticDigest:string };
  path:string;
  applied:boolean;
  reason:string;
  remainingPositiveClaims:RoutingClaim[];
  denyClaims:RoutingClaim[];
}

export interface PathRoute {
  path: string;
  kind: ChangeKind;
  decision: "selected" | "uncovered" | "ambiguous" | "denied";
  selected?: RoutingClaim;
  allows: RoutingClaim[];
  denies: RoutingClaim[];
  claims: RoutingClaim[];
  sequencing?: SequencingAuditRecord[];
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
  governance: GovernanceReport;
  candidates: RoutingCandidateSummary[];
  coverage: {
    status: CoverageLevel;
    specs: Array<{ specId: string; status: CoverageLevel }>;
  };
  routes: PathRoute[];
  diagnostics: Diagnostic[];
  sequencing: SequencingAuditRecord[];
}
