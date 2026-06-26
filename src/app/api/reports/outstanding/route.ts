import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const type = searchParams.get('type'); // 'receivable' or 'payable'
  const ledgerId = searchParams.get('ledgerId'); // single-ledger bill-wise lookup
  const asOf = searchParams.get('asOf') || new Date().toISOString().split('T')[0];

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    // ── SINGLE-LEDGER mode: for bill-wise allocation popup in voucher entry ──
    if (ledgerId) {
      const vouchers = await sql`
        SELECT v.number AS voucher_number, v.date, v.type,
               SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE 0 END) AS debit_total,
               SUM(CASE WHEN ve.type = 'CREDIT' THEN ve.amount ELSE 0 END) AS credit_total
        FROM vouchers v
        JOIN voucher_entries ve ON ve.voucher_id = v.id
        WHERE ve.ledger_id = ${ledgerId}
          AND v.company_id = ${companyId}
          AND v.status != 'CANCELLED'
          AND v.date <= ${asOf}
        GROUP BY v.id, v.number, v.date, v.type
        ORDER BY v.date DESC
        LIMIT 50
      `;

      const bills = vouchers.map(v => ({
        voucherNumber: v.voucher_number,
        date: String(v.date).split('T')[0],
        type: v.type,
        amount: parseFloat(v.debit_total) || parseFloat(v.credit_total),
        pending: parseFloat(v.debit_total) || parseFloat(v.credit_total), // simplified: full amount
      }));

      return NextResponse.json({ bills });
    }

    // ── ALL-LEDGERS mode: receivables / payables report ──
    const groupName = type === 'receivable' ? 'Sundry Debtors' : 'Sundry Creditors';

    const ledgers = await sql`
      SELECT l.id, l.name, l.opening_balance, l.opening_balance_type
      FROM ledgers l
      JOIN ledger_groups g ON l.group_id = g.id
      WHERE l.company_id = ${companyId} AND g.name = ${groupName} AND l.is_active = true
    `;

    const rows = [];
    let total = 0;

    for (const ledger of ledgers) {
      const entries = await sql`
        SELECT ve.amount, ve.type, ve.bill_ref, ve.bill_date, v.date, v.number
        FROM voucher_entries ve
        JOIN vouchers v ON v.id = ve.voucher_id
        WHERE ve.ledger_id = ${ledger.id} AND v.status != 'CANCELLED' AND v.date <= ${asOf}
        ORDER BY v.date
      `;

      let balance = parseFloat(ledger.opening_balance);
      if (ledger.opening_balance_type === 'CREDIT') balance = -balance;
      for (const e of entries) {
        balance += e.type === 'DEBIT' ? parseFloat(e.amount) : -parseFloat(e.amount);
      }

      if (Math.abs(balance) > 0.01) {
        const bills = entries
          .filter((e) => e.bill_ref)
          .map((e) => ({
            billRef: e.bill_ref,
            voucherNumber: e.number,
            billDate: e.bill_date,
            amount: parseFloat(e.amount),
            ageDays: Math.floor((new Date(asOf).getTime() - new Date(e.date).getTime()) / 86400000),
          }));

        rows.push({ ledgerId: ledger.id, ledgerName: ledger.name, totalDue: Math.abs(balance), bills });
        total += Math.abs(balance);
      }
    }

    return NextResponse.json({ rows, total });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
