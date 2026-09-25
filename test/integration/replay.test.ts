import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe,expect,it } from "vitest";
import { createProgram } from "../../src/cli/program.js";
import { runCli } from "../support/runCli.js";

describe("replay CLI",()=>{
  it("reports historical read-only identity and exposes no write options",async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),"es-replay-cli-"));await mkdir(path.join(root,"specs"));
    await writeFile(path.join(root,"engineering-spec.json"),JSON.stringify({specDirectory:"specs",strict:true,trustedBase:"origin/main",trustedVerifiers:{}}));
    await writeFile(path.join(root,"specs","a.engineering-spec.md"),`---
spec_format: engineering-spec
spec_format_version: "0.1"
spec_revision: 1
id: ES-replay-cli
title: Replay CLI
status: approved
owners: [{team: test}]
---
\`\`\`engineering-source-refs
[{id: SRC-1, type: other, ref: test}]
\`\`\`
\`\`\`engineering-targets
[{id: TARGET-1, paths: [src/a.ts], change_policy: modify}]
\`\`\`
\`\`\`engineering-constraints
[{id: CON-1, level: must, statement: Safe., enforcement: {kind: test, verifier_ref: VER-1}}]
\`\`\`
\`\`\`engineering-verification
[{id: VER-1, proves: [CON-1], kind: test}]
\`\`\`
`);
    execFileSync("git",["init","-q",root]);execFileSync("git",["-C",root,"add","."]);execFileSync("git",["-C",root,"-c","user.name=Test","-c","user.email=test@example.com","commit","-qm","base"]);
    const sha=execFileSync("git",["-C",root,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
    const changes=path.join(root,"changes.json");await writeFile(changes,JSON.stringify({changes:[{path:"src/a.ts",kind:"modified"}]}));
    const result=runCli(root,["replay","ES-replay-cli","--at",sha,"--changes-file",changes,"--operation","review","--format","json"]);
    expect(result.code).toBe(0);expect(JSON.parse(result.out)).toMatchObject({authorityMode:"historical_read_only",currentAuthorityGranted:false,valid:true});
    const replay=createProgram(()=>{}).commands.find(command=>command.name()==="replay")!;
    expect(replay.options.map(option=>option.long)).not.toEqual(expect.arrayContaining(["--write-closure","--write","--force","--staged","--worktree","--prefer"]));
  });
});
