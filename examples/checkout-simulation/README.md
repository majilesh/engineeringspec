# Replay a lost checkout receipt

From the EngineeringSpec repository root, run `npm ci`, `npm run build` and `node examples/checkout-simulation/demo.mjs`. Requires Git and Node. The command creates a temporary Git fixture and a separate evidence directory. It prints both paths. It fails if an acceptance assertion fails.

The fixture has its own approved receipt constraint and verifier. Its base branch pins the contract, and two clean commits contain the buggy and corrected recovery implementations. The reported revision IDs belong to this fixture. The simulator models an idempotent bank, a receipt store keyed by order, a virtual clock and one retry. Seeds 0–127 repeat combinations of response tick and one-tick fault window. The sample counts describe that corpus.

To replay one schedule independently, set DEMO to the absolute path of this example in the source checkout. From the printed temporary fixture directory, select the buggy or fixed revision printed in the summary, then run:

```sh
node "$DEMO/simulate.mjs" replay "$DEMO/captured/schedule.json"
```

The demo asserts exact trace equality within each revision. Across revisions it checks the outcome under the same external decisions. It rejects an incompatible schedule, a stale run binding and an evidence envelope with a mismatched contract revision. A separate adapter binds each corpus to its tested Git revision, contract and verifier and hashes the external artifact. The CLI consumes the existing evidence format without executing any verifier. The supplied states describe the controlled fixture.

The captured directory contains the two full corpora, individual replays, schedule, summary, evidence envelopes and offline verification briefs. Download each HTML brief to view it locally.
