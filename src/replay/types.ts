import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import type { ChangedFile } from "../gate/types.js";
import type { PathRoute, SequencingAuditRecord } from "../routing/types.js";

export type ReplayOperation="review"|"finish-readiness";

export interface HistoricalSnapshotEvaluation {
  format:"engineering-spec-historical-snapshot-evaluation";
  formatVersion:"0.1";
  valid:boolean;
  operation:ReplayOperation;
  authorityMode:"historical_read_only";
  currentAuthorityGranted:false;
  snapshotSha:string;
  candidateSha?:string;
  changesFixtureDigest?:string;
  repositoryConfig:{snapshotSha:string;configuredTrustedBaseRef?:string;specDirectory:string;strict:boolean};
  contract?:{id:string;revision:number;status:string;semanticDigest:string;path:string};
  changed:ChangedFile[];
  routing:{valid:boolean;routes:PathRoute[];sequencing:SequencingAuditRecord[]};
  lifecycleReadiness:{operation:ReplayOperation;ready:boolean;writePermitted:false;reason:string};
  diagnostics:Diagnostic[];
  limitations:string[];
}
