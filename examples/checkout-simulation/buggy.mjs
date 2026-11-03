// A repeated charge already exists at the bank, but local recovery is unfinished.
export function recover(bankReply, receipts, order) {
  if (bankReply === 'already charged') return;
  receipts.add(order);
}
