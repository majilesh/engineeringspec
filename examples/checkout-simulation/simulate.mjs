import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function schedule(seed) {
  assert(Number.isInteger(seed) && seed >= 0 && seed < 128, 'unsupported seed');
  return {
    version: 1, seed, initial: 'empty bank and receipt store', order: 'order-1',
    scheduler: 'virtual ticks, FIFO', outageStart: seed % 4,
    outageEnd: seed % 4 + 1, replyTick: 1 + (Math.floor(seed / 4) % 3), retryDelay: 2
  };
}

export function attempt(plan, recover) {
  assert.deepEqual(plan, schedule(plan.seed), 'incompatible saved schedule');
  const charges = new Set(), receipts = new Set(), events = [];
  const log = (tick, event) => events.push({ tick, event });
  function charge(tick) {
    const existing = charges.has(plan.order);
    charges.add(plan.order);
    log(tick, existing ? 'bank recognized the idempotency key' : 'bank committed charge');
    return existing ? 'already charged' : 'charged';
  }
  let tick = plan.replyTick;
  let reply = charge(0);
  if (tick >= plan.outageStart && tick < plan.outageEnd) {
    log(tick, 'bank response lost');
    tick += plan.retryDelay;
    log(tick, 'checkout retried');
    reply = charge(tick);
  }
  log(tick, 'checkout received: ' + reply);
  recover(reply, receipts, plan.order);
  log(tick, receipts.has(plan.order) ? 'receipt present after recovery' : 'receipt missing after recovery');
  return { plan, events, chargeCount: charges.size, receiptCount: receipts.size,
    verdict: receipts.size === charges.size ? 'passed' : 'failed' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, input] = process.argv.slice(2);
  assert.equal(execFileSync('git', ['status','--porcelain'], {encoding:'utf8'}), '', 'test a clean fixture revision');
  const revision = execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim();
  const { recover } = await import(pathToFileURL(resolve('checkout.mjs')));
  let runs;
  if (mode === 'corpus') runs = Array.from({length:128}, (_, seed) => attempt(schedule(seed), recover));
  else {
    assert.equal(mode, 'replay');
    runs = [attempt(JSON.parse(readFileSync(input, 'utf8')), recover)];
  }
  console.log(JSON.stringify({revision, runs}));
}
