import { URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';
// Run separately from EngineeringSpec. All Git operations target a new temporary fixture.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {binding, envelope} from './evidence.mjs';

const source = fileURLToPath(new URL('.', import.meta.url));
const cli = resolve(source, '../../dist/cli.js');
const repo = mkdtempSync(join(tmpdir(),'checkout-fixture-'));
const out = mkdtempSync(join(tmpdir(),'checkout-evidence-'));
const env = {...process.env, GIT_AUTHOR_NAME:'Checkout fixture', GIT_COMMITTER_NAME:'Checkout fixture',
 GIT_AUTHOR_EMAIL:'fixture@example.invalid', GIT_COMMITTER_EMAIL:'fixture@example.invalid',
 GIT_AUTHOR_DATE:'2000-01-01T00:00:00Z', GIT_COMMITTER_DATE:'2000-01-01T00:00:00Z'};
function run(command, args) {
  return execFileSync(command,args,{cwd:repo,env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
}
const git = (...args) => run('git',args);
const simulate = (...args) => JSON.parse(run(process.execPath,[join(source,'simulate.mjs'),...args]));
const review = (...args) => run(process.execPath,[cli,'review','--spec-dir','specs','--base','main','--format','html',...args]);
const model = html => JSON.parse(html.match(/<script id="verification-brief" type="application\/json">([^<]+)<\/script>/)[1]);
const save = (name, value) => writeFileSync(join(out,name),JSON.stringify(value)+'\n');
function commit(message) {
  git('add','.');
  git('-c','commit.gpgsign=false','commit','-qm',message);
}

git('init','-q','--initial-branch=main');
mkdirSync(join(repo,'specs'));
copyFileSync(join(source,'checkout.contract'),join(repo,'specs/receipt.engineering-spec.md'));
writeFileSync(join(repo,'checkout.mjs'),'// Checkout recovery entry point\n');
writeFileSync(join(repo,'engineering-spec.json'),JSON.stringify({specDirectory:'specs',trustedBase:'main',strict:true}));
commit('Approve receipt guarantee');
git('switch','-qc','checkout');
let failure, before, beforeBytes;
const summary = {};
for (const version of ['buggy','fixed']) {
  copyFileSync(join(source,version+'.mjs'),join(repo,'checkout.mjs'));
  commit('Checkout recovery: '+version);
  const brief = model(review());
  const corpus = simulate('corpus');
  const failed = corpus.runs.filter(r=>r.verdict==='failed');
  if(version==='buggy') {
    assert(failed.length > 0);
    failure = failed[0];
    save('schedule.json',failure.plan);
  } else assert.equal(failed.length,0);

  const replay = simulate('replay',join(out,'schedule.json'));
  assert.deepEqual(replay.runs[0],corpus.runs[failure.plan.seed]);
  assert.equal(replay.runs[0].verdict,version==='buggy'?'failed':'passed');
  save(version+'-replay.json',replay);
  const artifact = version+'-corpus.json';
  save(artifact,{...corpus,binding:binding(brief)});
  const bytes = readFileSync(join(out,artifact));
  const evidence = envelope(brief,artifact,bytes);
  const evidencePath = join(out,version+'-evidence.json');
  save(version+'-evidence.json',evidence);
  const html = review('--evidence',evidencePath);
  assert.equal(model(html).contracts[0].verification[0].state,evidence.verification[0].state);
  writeFileSync(join(out,version+'-brief.html'),html);
  summary[version]={revision:corpus.revision,passed:128-failed.length,failed:failed.length};
  if(version==='buggy') {before=brief; beforeBytes=bytes;}
  else {
    assert.throws(()=>envelope(brief,artifact,beforeBytes),/stale evidence binding/);
    const stale = envelope(before,'buggy-corpus.json',beforeBytes);
    stale.authority.specRevision++;
    save('invalid.json',stale);
    assert.throws(()=>review('--evidence',join(out,'invalid.json')));
    save('invalid.json',{...failure.plan,version:0});
    assert.throws(()=>simulate('replay',join(out,'invalid.json')));
  }
}
save('summary.json',summary);
console.log(JSON.stringify({repo,out,seed:failure.plan.seed,summary},null,2));
