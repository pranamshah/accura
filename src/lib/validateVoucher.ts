export interface VoucherEntry {
  ledger_id: string | null;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
}

export interface VoucherValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateVoucher(entries: VoucherEntry[]): VoucherValidationResult {
  const errors: string[] = [];

  const validEntries = entries.filter(e => e.ledger_id && e.amount > 0);

  if (validEntries.length === 0) {
    errors.push('Voucher has no entries. Add at least one debit and one credit entry.');
    return { valid: false, errors };
  }

  const entriesWithAmount = entries.filter(e => e.amount > 0);
  const entriesWithNoLedger = entriesWithAmount.filter(e => !e.ledger_id);
  if (entriesWithNoLedger.length > 0) {
    errors.push(`${entriesWithNoLedger.length} row(s) have an amount but no ledger selected.`);
  }

  const totalDr = validEntries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
  const totalCr = validEntries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);

  if (Math.abs(totalDr - totalCr) > 0.01) {
    errors.push(`Debit (${totalDr.toFixed(2)}) and Credit (${totalCr.toFixed(2)}) are not equal. Difference: ${Math.abs(totalDr - totalCr).toFixed(2)}`);
  }

  const hasDr = validEntries.some(e => e.type === 'DEBIT');
  const hasCr = validEntries.some(e => e.type === 'CREDIT');
  if (!hasDr) errors.push('No debit entry found.');
  if (!hasCr) errors.push('No credit entry found.');

  return { valid: errors.length === 0, errors };
}
