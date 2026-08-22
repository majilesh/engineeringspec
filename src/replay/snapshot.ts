import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertSafeRepoPath, parseNameStatusZ } from "../gate/collectDiff.js";
import type { ChangedFile } from "../gate/types.js";
import { parseGitPathListZ } from "../gate/loadSpec.js";
import { compareCodePoints } from "../normalizer/canonicalize.js";
import type { RepositoryContentReader } from "../profiles/productspec/validate.js";
import type { ResolvedTrustedBaseCommit, TrustedBaseRef } from "../config/repositoryConfig.js";

const execFileAsync = promisify(execFile);
const MAX_BLOB_BYTES = 4 * 1024 * 1024;
const MAX_GIT_OUTPUT = 16 * 1024 * 1024;
const IMMUTABLE_COMMIT = /^[0-9a-f]{40}$/u;

export type HistoricalSnapshotCommit = string & { readonly __historicalSnapshotCommit: unique symbol };

export interface HistoricalSnapshotIdentity {
  sha: HistoricalSnapshotCommit;
  configuredTrustedBaseRef?: string;
  authorityMode: "historical_read_only";
  currentAuthorityGranted: false;
}

async function git(args:string[],cwd:string,maxBuffer=MAX_GIT_OUTPUT):Promise<string> {
  const {stdout}=await execFileAsync("git",args,{cwd,encoding:"utf8",maxBuffer});
  return stdout;
}

export async function resolveTrustedBaseCommit(ref:TrustedBaseRef,cwd:string):Promise<ResolvedTrustedBaseCommit> {
  const sha=(await git(["rev-parse","--verify",`${ref}^{commit}`],cwd)).trim();
  return sha as ResolvedTrustedBaseCommit;
}

export async function resolveHistoricalCommit(value:string,cwd:string):Promise<HistoricalSnapshotCommit> {
  if (!IMMUTABLE_COMMIT.test(value)) throw new Error("Historical snapshots require a full lowercase 40-character commit SHA");
  const sha=(await git(["rev-parse","--verify",`${value}^{commit}`],cwd)).trim();
  if (sha!==value) throw new Error(`Historical snapshot ${JSON.stringify(value)} did not resolve to that exact commit`);
  const type=(await git(["cat-file","-t",sha],cwd)).trim();
  if(type!=="commit") throw new Error(`Historical snapshot ${sha} is ${type}, not a commit`);
  return sha as HistoricalSnapshotCommit;
}

export class RepositorySnapshotReader implements RepositoryContentReader {
  readonly sha:HistoricalSnapshotCommit;
  readonly root:string;

  private constructor(root:string,sha:HistoricalSnapshotCommit){this.root=root;this.sha=sha;}

  static async open(value:string,cwd:string):Promise<RepositorySnapshotReader>{
    return new RepositorySnapshotReader(cwd,await resolveHistoricalCommit(value,cwd));
  }

  async readBytes(repoPath:string):Promise<Uint8Array>{
    assertSafeRepoPath(repoPath);
    try {
      const {stdout}=await execFileAsync("git",["show",`${this.sha}:${repoPath}`],{
        cwd:this.root,encoding:"buffer",maxBuffer:MAX_BLOB_BYTES,
      });
      return new Uint8Array(stdout as Buffer);
    } catch(error) {
      throw new Error(`Snapshot ${this.sha} does not contain readable blob ${JSON.stringify(repoPath)}: ${error instanceof Error?error.message:String(error)}`);
    }
  }

  async readText(repoPath:string):Promise<string>{
    return Buffer.from(await this.readBytes(repoPath)).toString("utf8");
  }

  async tryReadText(repoPath:string):Promise<string|undefined>{
    assertSafeRepoPath(repoPath);
    try{await execFileAsync("git",["cat-file","-e",`${this.sha}:${repoPath}`],{cwd:this.root,encoding:"utf8",maxBuffer:1024});}
    catch(error){const code=(error as {code?:number}).code;if(code===128) return undefined;throw error;}
    return this.readText(repoPath);
  }

  async listPaths(directory:string):Promise<string[]>{
    if(directory!==".") assertSafeRepoPath(directory);
    const args=["ls-tree","-r","-z","--name-only",this.sha];
    if(directory!==".") args.push("--",`:(literal)${directory}`);
    return parseGitPathListZ(await git(args,this.root)).sort(compareCodePoints);
  }

  async changedPaths(candidate:RepositorySnapshotReader):Promise<ChangedFile[]>{
    const output=await git(["diff","-z","--name-status","--find-renames",this.sha,candidate.sha],this.root);
    return parseNameStatusZ(output);
  }
}
