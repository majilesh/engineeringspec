import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export function binding(brief) {
  assert.equal(brief.authorized, true);
  assert.equal(brief.evaluation.completeWorkingState, true);
  const contract = brief.contracts.find(c => c.id === 'ES-receipt');
  assert(contract?.verification.some(v => v.verifierId === 'VER-RECEIPT' && v.proves.includes('RECEIPT-ONE')));
  return { authority: { baseSha: brief.baseSha, contractId: contract.id,
    specRevision: contract.specRevision, semanticDigest: contract.semanticDigest },
    changeDigest: brief.changedDigest, revision: brief.headSha };
}

export function envelope(brief, artifact, bytes) {
  const result = JSON.parse(bytes);
  const {revision, ...identity} = binding(brief);
  assert.deepEqual(result.binding, binding(brief), 'stale evidence binding');
  assert.equal(result.revision, revision, 'different tested revision');
  assert.equal(result.runs.length, 128);
  result.runs.forEach((run, seed) => {
    assert.equal(run.plan.seed, seed);
    assert(['passed','failed'].includes(run.verdict));
  });
  return { ...identity, verification: [{verifierId:'VER-RECEIPT',
    state:result.runs.every(r => r.verdict === 'passed') ? 'passed' : 'failed',
    artifact, digest:'sha256:' + createHash('sha256').update(bytes).digest('hex')}] };
}
