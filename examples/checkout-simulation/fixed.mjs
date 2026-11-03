// Both bank replies confirm payment. Reconcile the local receipt idempotently.
export function recover(bankReply, receipts, order) {
  if (bankReply === 'charged' || bankReply === 'already charged') receipts.add(order);
}
