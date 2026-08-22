import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gitShowToplevel } from "../gate/loadSpec.js";
import { assertSafeRepoPath } from "../gate/collectDiff.js";
import type { ChangedFile, ChangeKind } from "../gate/types.js";
import { closureSemanticDigest } from "../normalizer/digest.js";
import { parseRepositoryConfig, REPOSITORY_CONFIG_PATH } from "../config/repositoryConfig.js";
import { loadRoutingCandidates } from "../routing/loadCandidates.js";
import { routeChanges } from "../routing/route.js";
import type { HistoricalSnapshotEvaluation, ReplayOperation } from "./types.js";
import { RepositorySnapshotReader } from "./snapshot.js";
import type { EngineeringSpec } from "../model/types.js";
import type { Diagnostic } from "../diagnostics/Diagnostic.js";
import { Codes } from "../diagnostics/codes.js";

const MAX_FIXTURE_BYTES=1024*1024;
const MAX_FIXTURE_CHANGES=10_000;
const KINDS=new Set<ChangeKind>(["added","modified","deleted","renamed"]);

function fixtureDigest(bytes:Uint8Array):string{return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;}
function declaredDigest(value:unknown):string|undefined{
  if(typeof value==="string") return value.toLowerCase();
  if(value&&typeof value==="object"&&typeof (value as {value?:unknown}).value==="string") return `sha256:${String((value as {value:string}).value).toLowerCase()}`;
  return undefined;
}
async function validateSnapshotReferences(reader:RepositorySnapshotReader,spec:EngineeringSpec,label:string):Promise<Diagnostic[]>{
  const diagnostics:Diagnostic[]=[];
  const references=[...spec.sourceRefs.filter(item=>item.path).map(item=>({id:item.id,path:item.path!,digest:item.digest})),...(spec.contracts??[]).filter(item=>item.path).map(item=>({id:item.id,path:item.path!,digest:item.digest}))];
  for(const reference of references){
    try{
      const bytes=await reader.readBytes(reference.path);
      const expected=declaredDigest(reference.digest);
      const actual=`sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      if(expected&&expected!==actual) diagnostics.push({code:Codes.invalidDigest,severity:"error",file:label,message:`Snapshot-local reference ${reference.id} digest mismatch at ${reader.sha}:${reference.path}`});
    }catch(error){diagnostics.push({code:Codes.profileUnavailable,severity:"error",file:label,message:`Snapshot-local reference ${reference.id} is unavailable at ${reader.sha}:${reference.path}; workspace content was not consulted: ${error instanceof Error?error.message:String(error)}`});}
  }
  return diagnostics;
}
function parseFixture(bytes:Uint8Array):ChangedFile[]{
  if(bytes.byteLength>MAX_FIXTURE_BYTES) throw new Error("Replay changes fixture exceeds 1 MiB");
  const parsed:unknown=JSON.parse(Buffer.from(bytes).toString("utf8"));
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)) throw new Error("Replay changes fixture must be an object");
  const object=parsed as Record<string,unknown>;
  if(Object.keys(object).some(key=>key!=="changes")) throw new Error("Replay changes fixture contains unknown properties");
  if(!Array.isArray(object.changes)||object.changes.length>MAX_FIXTURE_CHANGES) throw new Error("Replay changes fixture must contain at most 10,000 changes");
  return object.changes.map((raw,index)=>{
    if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error(`Replay change ${index} must be an object`);
    const item=raw as Record<string,unknown>;
    if(Object.keys(item).some(key=>!["path","kind","fromPath"].includes(key))) throw new Error(`Replay change ${index} contains unknown properties`);
    if(typeof item.path!=="string"||typeof item.kind!=="string"||!KINDS.has(item.kind as ChangeKind)) throw new Error(`Replay change ${index} has invalid path or kind`);
    assertSafeRepoPath(item.path);
    if(item.fromPath!==undefined){if(typeof item.fromPath!=="string") throw new Error(`Replay change ${index} has invalid fromPath`);assertSafeRepoPath(item.fromPath);}
    if(item.kind==="renamed"&&typeof item.fromPath!=="string") throw new Error(`Replay rename ${index} requires fromPath`);
    return {path:item.path,kind:item.kind as ChangeKind,...(typeof item.fromPath==="string"?{fromPath:item.fromPath}:{})};
  });
}

export async function replayHistorical(options:{contractId:string;at:string;operation:ReplayOperation;headAt?:string;changesFile?:string;cwd?:string}):Promise<HistoricalSnapshotEvaluation>{
  if(options.headAt&&options.changesFile) throw new Error("--head-at and --changes-file are mutually exclusive");
  if(!options.headAt&&!options.changesFile) throw new Error("Replay requires --head-at or --changes-file");
  const root=await gitShowToplevel(options.cwd);
  const snapshot=await RepositorySnapshotReader.open(options.at,root);
  const configText=await snapshot.tryReadText(REPOSITORY_CONFIG_PATH);
  const config=configText===undefined
    ? {specDirectory:"docs/engineering-specs",strict:true,trustedVerifiers:{}}
    : parseRepositoryConfig(configText,`${snapshot.sha}:${REPOSITORY_CONFIG_PATH}`);
  const loaded=await loadRoutingCandidates({baseSha:snapshot.sha,directory:config.specDirectory,strict:config.strict,cwd:root,snapshotReader:snapshot});
  const matches=loaded.candidates.filter(candidate=>candidate.spec.metadata.id===options.contractId);
  if(matches.length!==1) throw new Error(`Historical snapshot ${snapshot.sha} contains ${matches.length} contracts with id ${JSON.stringify(options.contractId)}; exactly one is required`);
  const selected=matches[0]!;
  let changed:ChangedFile[];
  let candidateSha:string|undefined;
  let changesFixtureDigest:string|undefined;
  if(options.headAt){
    const candidate=await RepositorySnapshotReader.open(options.headAt,root);
    candidateSha=candidate.sha;
    changed=await snapshot.changedPaths(candidate);
  }else{
    const bytes=await readFile(options.changesFile!);
    changesFixtureDigest=fixtureDigest(bytes);
    changed=parseFixture(bytes);
  }
  const routed=routeChanges(loaded.candidates,changed,["approved"]);
  const diagnostics=[...loaded.diagnostics,...await validateSnapshotReferences(snapshot,selected.spec,`${snapshot.sha}:${selected.path}`),...routed.diagnostics];
  const ownsEveryPath=routed.routes.length>0&&routed.routes.every(route=>route.decision==="selected"&&route.selected?.specId===options.contractId);
  const ready=loaded.valid&&selected.spec.metadata.status==="approved"&&ownsEveryPath&&!diagnostics.some(item=>item.severity==="error");
  return {
    format:"engineering-spec-historical-snapshot-evaluation",formatVersion:"0.1",valid:ready,operation:options.operation,
    authorityMode:"historical_read_only",currentAuthorityGranted:false,snapshotSha:snapshot.sha,
    ...(candidateSha?{candidateSha}:{}),...(changesFixtureDigest?{changesFixtureDigest}:{}),
    repositoryConfig:{snapshotSha:snapshot.sha,...(config.trustedBase?{configuredTrustedBaseRef:config.trustedBase}:{}),specDirectory:config.specDirectory,strict:config.strict},
    contract:{id:selected.spec.metadata.id,revision:selected.spec.metadata.specRevision,status:selected.spec.metadata.status,semanticDigest:closureSemanticDigest(selected.spec),path:selected.path},
    changed,routing:{valid:ready,routes:routed.routes,sequencing:routed.sequencing??[]},
    lifecycleReadiness:{operation:options.operation,ready,writePermitted:false,reason:ready?"Historical simulation is ready; no current authority is granted.":"Historical simulation failed closed; no current authority is granted."},
    diagnostics,
    limitations:["Historical replay grants no current implementation authority.","Replay did not modify the repository, index, worktree, configuration, contracts, or refs.","Specification runners and trusted verifier commands were not executed."],
  };
}
