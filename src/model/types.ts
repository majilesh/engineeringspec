export type Status = "draft" | "proposed" | "approved" | "implemented" | "superseded" | "rejected";
export interface Position { line: number; column: number; offset?: number }
export interface SourceLocation { file: string; start: Position; end: Position }
export interface Owner { team?: string; person?: string }
export interface ProfileReference { name: string; version: string }
export interface RepositoryReference { ref: string }
export interface DigestReference { algorithm?: "sha256"; value?: string }
export interface EngineeringSpecMetadata {
  specFormat: "engineering-spec"; specFormatVersion: string; specRevision: number; id: string;
  title: string; status: Status; owners: Owner[]; createdAt?: string; updatedAt?: string;
  repository?: RepositoryReference; baseRevision?: string; profiles?: ProfileReference[];
  supersedes?: string[]; extensions?: Record<string, unknown>;
}
export interface SourceReference { id: string; type: "productspec"|"github_issue"|"jira"|"linear"|"incident"|"adr"|"security_finding"|"regulation"|"document"|"other"; path?: string; ref?: string; uri?: string; revision?: string|number; digest?: DigestReference|string; itemIds?: string[]; title?: string }
export interface TargetSurface { id: string; component?: string; repository?: string; paths: string[]; changePolicy: "modify"|"create"|"delete"|"read_only"|"interface_only"|"observe"; owner?: string; notes?: string }
export interface EngineeringDecision { id: string; title: string; decision: string; rationale?: string; consequences?: string[]; alternatives?: Array<{name:string; reasonRejected?:string}>; status?: "proposed"|"accepted"|"superseded"; adrRef?: string }
export interface TechnicalContract { id: string; kind: "openapi"|"asyncapi"|"json_schema"|"protobuf"|"graphql_schema"|"database_migration"|"infrastructure"|"policy"|"other"; path?: string; uri?: string; digest?: DigestReference|string; compatibility?: "backward_compatible"|"forward_compatible"|"breaking"|"not_applicable"|"unknown"; satisfies?: string[]; description?: string }
export type ConstraintEnforcement = {kind:"policy";adapter:string;ruleRef:string}|{kind:"test";verifierRef:string}|{kind:"contract";contractRef:string}|{kind:"review";reviewerRole:string}|{kind:"none";reason?:string};
export interface EngineeringConstraint { id:string; level:"must"|"must_not"|"should"|"should_not"|"escalate"; statement:string; appliesTo?:string[]; satisfies?:string[]; severity?:"error"|"warning"|"info"; enforcement?:ConstraintEnforcement; exceptionRequires?:string[] }
export interface VerificationRunner { type:"command"|"reference"|"manual"|"external"; argv?:string[]; reference?:string; workingDirectory?:string; timeoutSeconds?:number; network?:"deny"|"allow"; environment?:Record<string,string> }
export interface VerificationExpectation { exitCode?:number; resultFormat?:"junit"|"sarif"|"json"|"text"|"custom"; artifact?:string; threshold?:{metric:string;operator:">="|">"|"<="|"<"|"==";value:number;unit?:string;scope?:string} }
export interface VerificationObligation { id:string; proves:string[]; kind:"test"|"static_analysis"|"schema_check"|"policy"|"performance"|"security"|"ai_eval"|"human_review"|"runtime_observation"; runner?:VerificationRunner; expected?:VerificationExpectation; definitionRef?:string; resultRequired?:boolean; description?:string }
export interface RolloutControl { strategy:"none"|"feature_flag"|"canary"|"blue_green"|"rolling"|"migration"|"manual"; flag?:string; migrationOrder?:string[]; observability?:string[]; rollback?:{maxMinutes?:number;actions:string[];owner?:string} }
export interface EvidenceRequirement { id:string; type:"test_result"|"static_analysis"|"benchmark"|"review"|"deployment"|"runtime_metric"|"attestation"|"other"; verifierRef?:string; artifact?:string; requiredForStatus?:"approved"|"implemented"; retentionDays?:number }
export interface ExceptionRecord { id:string; constraintRef:string; reason:string; approvedBy:string[]; scope?:string[]; expiresAt?:string; createdAt?:string }
export interface PreservedProseSection { markdown:string; location?:SourceLocation }
export interface EngineeringSpec { metadata:EngineeringSpecMetadata; sourceRefs:SourceReference[]; targets:TargetSurface[]; decisions?:EngineeringDecision[]; contracts?:TechnicalContract[]; constraints?:EngineeringConstraint[]; verification:VerificationObligation[]; rollout?:RolloutControl; evidence?:EvidenceRequirement[]; exceptions?:ExceptionRecord[]; prose:PreservedProseSection[]; extensions?:Record<string,unknown> }
export interface LocatedId { id:string; location:SourceLocation }
