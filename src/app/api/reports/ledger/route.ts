import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const ledgerId = searchParams.get('ledgerId');
  const ledgerName = searchParams.get('ledgerName');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let targetLedgerId = ledgerId;
    if (!targetLedgerId && ledgerName && companyId) {
      const rows = await sql`SELECT id FROM ledgers WHERE company_id = ${companyId} AND LOWER(name) LIKE LOWER(${ledgerName + '%'}) LIMIT 1`;
      targetLedgerId = rows[0]?.id;
    }
    if (!targetLedgerId) return NextResponse.json({ rows: [], openingBalance: 0, closingBalance: 0 });

    const [ledger] = await sql`SELECT * FROM ledgers WHERE id = ${targetLedgerId}`;
    if (!ledger) return NextResponse.json({ rows: [], openingBalance: 0, closingBalance: 0 });

    const entries = await sql`
      SELECT ve.*, v.id as vid, v.date, v.number, v.type as vtype, v.narration as v_narration,
        ve.type as entry_type,
        (SELECT name FROM ledgers WHERE id = (
          SELECT ledger_id FROM voucher_entries WHERE voucher_id = v.id AND ledger_id != ${targetLedgerId} LIMIT 1
        )) as contra_ledger
      FROM voucher_entries ve
      JOIN vouchers v ON v.id = ve.voucher_id
      WHERE ve.ledger_id = ${targetLedgerId}
        AND v.status = 'ACTIVE'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      ORDER BY v.date, v.created_at
    `;

    const openingBalance = parseFloat(ledger.opening_balance);
    const obType = ledger.opening_balance_type;
    let runningBalance = obType === 'DEBIT' ? openingBalance : -openingBalance;

    const rows = entries.map((e) => {
      const debit = e.entry_type === 'DEBIT' ? parseFloat(e.amount) : 0;
      const credit = e.entry_type === 'CREDIT' ? parseFloat(e.amount) : 0;
      runningBalance += debit - credit;
      return {
        voucherId: e.vid,
        date: e.date,
        voucherNumber: e.number,
        voucherType: e.vtype,
        particulars: e.contra_ledger ?? e.v_narration ?? '-',
        debit,
        credit,
        balance: Math.abs(runningBalance),
        balanceType: runningBalance >= 0 ? 'DEBIT' : 'CREDIT',
      };
    });

    return NextResponse.json({
      rows,
      openingBalance,
      closingBalance: Math.abs(runningBalance),
      closingBalanceType: runningBalance >= 0 ? 'DEBIT' : 'CREDIT',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
