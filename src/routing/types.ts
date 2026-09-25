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
  /** Present only for standing authority (RFC 0014 §4); change authority omits it. */
  authorityKind?: "standing";
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

export type LegacyRouteDecision = "selected" | "uncovered" | "ambiguous" | "denied";

/** Legacy decisions plus RFC 0014 policy decisions, which appear only when a mode is configured. */
export type RouteDecision = LegacyRouteDecision | "standing" | "exempt" | "ungoverned" | "protected_unauthorized";


export interface EnforcementResult {
  /** `legacy` when the trusted base configures no mode; `bootstrap_advisory` only for first adoption. */
  mode: "legacy" | "advisory" | "standard" | "controlled" | "bootstrap_advisory";
  /** Drives exit codes only. Authorization (`valid`, receipts, closure) never follows an advisory pass. */
  outcome: "pass" | "fail" | "error";
  enforced: boolean;
  /** Present only when a bootstrap mode was requested: whether the trusted base allowed it. */
  bootstrap?: "honored" | "ignored";
  /** Present only when a valid selector narrowed routing to one contract. */
  selectedContract?: string;
}

export interface PathRoute {
  path: string;
  kind: ChangeKind;
  decision: LegacyRouteDecision;
  selected?: RoutingClaim;
  allows: RoutingClaim[];
  denies: RoutingClaim[];
  claims: RoutingClaim[];
  sequencing?: SequencingAuditRecord[];
}

/** A routed path as reported: legacy routing output, or a policy decision when a mode is configured. */
export type ReportedRoute = Omit<PathRoute, "decision"> & { decision: RouteDecision };

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
  routes: ReportedRoute[];
  diagnostics: Diagnostic[];
  sequencing: SequencingAuditRecord[];
  enforcement: EnforcementResult;
}
