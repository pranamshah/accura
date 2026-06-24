import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    const rows = await sql`
      SELECT
        g.name as group_name, g.nature,
        COALESCE(SUM(CASE WHEN ve.type = 'CREDIT' THEN ve.amount ELSE -ve.amount END), 0) as net
      FROM ledger_groups g
      LEFT JOIN ledgers l ON l.group_id = g.id AND l.is_active = true
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      WHERE g.company_id = ${companyId} AND g.nature IN ('INCOME', 'EXPENSES')
      GROUP BY g.name, g.nature
      ORDER BY g.nature, g.name
    `;

    const income: Array<{ groupName: string; balance: number }> = [];
    const expenses: Array<{ groupName: string; balance: number }> = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const r of rows) {
      const balance = Math.abs(parseFloat(r.net));
      if (r.nature === 'INCOME') {
        income.push({ groupName: r.group_name, balance });
        totalIncome += balance;
      } else {
        expenses.push({ groupName: r.group_name, balance });
        totalExpenses += balance;
      }
    }

    return NextResponse.json({ income, expenses, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
