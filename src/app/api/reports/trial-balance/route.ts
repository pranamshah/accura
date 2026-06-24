import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const asOf = searchParams.get('asOf') || new Date().toISOString().split('T')[0];
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    const rows = await sql`
      SELECT
        l.id, l.name as ledger_name, l.opening_balance, l.opening_balance_type,
        g.name as group_name, g.nature,
        COALESCE(SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE 0 END), 0) as tx_debit,
        COALESCE(SUM(CASE WHEN ve.type = 'CREDIT' THEN ve.amount ELSE 0 END), 0) as tx_credit
      FROM ledgers l
      JOIN ledger_groups g ON l.group_id = g.id
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED' AND v.date <= ${asOf}
      WHERE l.company_id = ${companyId} AND l.is_active = true
      GROUP BY l.id, l.name, l.opening_balance, l.opening_balance_type, g.name, g.nature
      ORDER BY g.nature, g.name, l.name
    `;

    let totalDebit = 0;
    let totalCredit = 0;

    const result = rows.map((r) => {
      const ob = parseFloat(r.opening_balance);
      const txDr = parseFloat(r.tx_debit);
      const txCr = parseFloat(r.tx_credit);
      let debit = 0;
      let credit = 0;

      if (r.opening_balance_type === 'DEBIT') {
        const net = ob + txDr - txCr;
        if (net >= 0) debit = net;
        else credit = Math.abs(net);
      } else {
        const net = ob + txCr - txDr;
        if (net >= 0) credit = net;
        else debit = Math.abs(net);
      }

      totalDebit += debit;
      totalCredit += credit;

      return { ledgerName: r.ledger_name, groupName: r.group_name, nature: r.nature, debit, credit, balance: Math.abs(debit - credit), balanceType: debit > credit ? 'DEBIT' : 'CREDIT' };
    });

    return NextResponse.json({ rows: result, totalDebit, totalCredit });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
