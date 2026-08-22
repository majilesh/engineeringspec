import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { replayHistorical } from "../../src/replay/replay.js";
import { RepositorySnapshotReader } from "../../src/replay/snapshot.js";

function git(root:string,...args:string[]):string{return execFileSync("git",["-C",root,...args],{encoding:"utf8"}).trim();}
async function fixtureRepo(includeProduct=true):Promise<{root:string;sha:string;changes:string}>{
  const root=await mkdtemp(path.join(os.tmpdir(),"es-replay-"));
  await mkdir(path.join(root,"docs","engineering-specs"),{recursive:true});
  await mkdir(path.join(root,"docs","product"),{recursive:true});
  await writeFile(path.join(root,"engineering-spec.json"),JSON.stringify({specDirectory:"docs/engineering-specs",strict:true,trustedBase:"origin/main",trustedVerifiers:{}},null,2));
  if(includeProduct) await writeFile(path.join(root,"docs","product","feature.md"),`---\nspec_format: product-spec\nspec_revision: 4\nid: PS-feature\n---\n\n\`\`\`product-acceptance\n- id: AC-1\n  statement: Historical behavior.\n\`\`\`\n`);
  await writeFile(path.join(root,"docs","engineering-specs","feature.engineering-spec.md"),`---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 4
id: ES-historical
title: Historical contract
status: approved
owners: [{team: test}]
profiles: [{name: productspec, version: "0.1"}]
---
\`\`\`engineering-source-refs
- {id: SRC-1, type: productspec, path: docs/product/feature.md, revision: 4, item_ids: [AC-1]}
\`\`\`
\`\`\`engineering-targets
- {id: TARGET-1, paths: [src/a.ts], change_policy: modify}
\`\`\`
\`\`\`engineering-constraints
- {id: CON-1, level: must, statement: Historical behavior., satisfies: [AC-1], enforcement: {kind: test, verifier_ref: VER-1}}
\`\`\`
\`\`\`engineering-verification
- {id: VER-1, proves: [CON-1], kind: test, runner: {type: command, argv: [node, must-not-run.js]}}
\`\`\`
`);
  git(root,"init","-q");git(root,"add",".");git(root,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","historical base");
  const sha=git(root,"rev-parse","HEAD");
  const changes=path.join(root,"changes.json");
  await writeFile(changes,JSON.stringify({changes:[{path:"src/a.ts",kind:"modified"}]}));
  return {root,sha,changes};
}

describe("historical replay",()=>{
  it("binds config, contracts, ProductSpecs, and routing to one immutable commit",async()=>{
    const {root,sha,changes}=await fixtureRepo();
    await writeFile(path.join(root,"engineering-spec.json"),"{}\n");
    await writeFile(path.join(root,"docs","product","feature.md"),"mutable workspace content\n");
    const before=git(root,"status","--porcelain=v1");
    const result=await replayHistorical({contractId:"ES-historical",at:sha,operation:"finish-readiness",changesFile:changes,cwd:root});
    expect(result).toMatchObject({valid:true,authorityMode:"historical_read_only",currentAuthorityGranted:false,snapshotSha:sha,lifecycleReadiness:{ready:true,writePermitted:false}});
    expect(result.repositoryConfig.configuredTrustedBaseRef).toBe("origin/main");
    expect(result.contract).toMatchObject({id:"ES-historical",revision:4,status:"approved"});
    expect(result.routing.routes[0]).toMatchObject({path:"src/a.ts",decision:"selected",selected:{specId:"ES-historical"}});
    expect(git(root,"status","--porcelain=v1")).toBe(before);
    expect(result.limitations.join(" ")).toContain("not executed");
  });

  it("fails closed when a snapshot-local ProductSpec is absent even if workspace content exists",async()=>{
    const {root,sha,changes}=await fixtureRepo(false);
    await writeFile(path.join(root,"docs","product","feature.md"),"workspace-only ProductSpec\n");
    await expect(replayHistorical({contractId:"ES-historical",at:sha,operation:"review",changesFile:changes,cwd:root})).rejects.toThrow(/contains 0 contracts/u);
  });

  it("requires a full immutable commit and reads blobs without checking out refs",async()=>{
    const {root,sha}=await fixtureRepo();
    await expect(RepositorySnapshotReader.open("HEAD",root)).rejects.toThrow(/full lowercase 40-character commit SHA/u);
    const reader=await RepositorySnapshotReader.open(sha,root);
    expect(await reader.readText("engineering-spec.json")).toContain("origin/main");
    await expect(reader.readText("missing.md")).rejects.toThrow(/does not contain readable blob/u);
    expect(await readFile(path.join(root,"engineering-spec.json"),"utf8")).toContain("origin/main");
  });
});
