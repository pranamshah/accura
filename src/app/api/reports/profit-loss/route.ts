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

    // Group-level totals
    const groupRows = await sql`
      SELECT
        g.id as group_id, g.name as group_name, g.nature, g.parent_id,
        COALESCE(SUM(
          CASE WHEN ve.type = 'CREDIT' THEN ve.amount ELSE -ve.amount END
        ), 0) as net
      FROM ledger_groups g
      LEFT JOIN ledgers l ON l.group_id = g.id AND l.is_active = true
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to   ? sql`AND v.date <= ${to}`   : sql``}
      WHERE g.company_id = ${companyId} AND g.nature IN ('INCOME', 'EXPENSES')
      GROUP BY g.id, g.name, g.nature, g.parent_id
      ORDER BY g.nature, g.name
    `;

    // Ledger-level breakdown (for drill-down display)
    const ledgerRows = await sql`
      SELECT
        l.id, l.name as ledger_name, g.id as group_id,
        COALESCE(SUM(
          CASE WHEN ve.type = 'CREDIT' THEN ve.amount ELSE -ve.amount END
        ), 0) as net
      FROM ledgers l
      JOIN ledger_groups g ON g.id = l.group_id AND g.nature IN ('INCOME', 'EXPENSES')
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to   ? sql`AND v.date <= ${to}`   : sql``}
      WHERE l.company_id = ${companyId} AND l.is_active = true AND g.company_id = ${companyId}
      GROUP BY l.id, l.name, g.id
      ORDER BY l.name
    `;

    // Build ledger map per group
    const ledgersByGroup: Record<string, { name: string; balance: number }[]> = {};
    for (const r of ledgerRows) {
      const net = parseFloat(r.net);
      if (Math.abs(net) < 0.005) continue; // skip zero-balance ledgers
      if (!ledgersByGroup[r.group_id]) ledgersByGroup[r.group_id] = [];
      ledgersByGroup[r.group_id].push({ name: r.ledger_name, balance: Math.abs(net) });
    }

    const income: Array<{ groupName: string; balance: number; ledgers: { name: string; balance: number }[] }> = [];
    const expenses: Array<{ groupName: string; balance: number; ledgers: { name: string; balance: number }[] }> = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const r of groupRows) {
      const balance = Math.abs(parseFloat(r.net));
      const ledgers = ledgersByGroup[r.group_id] ?? [];
      if (r.nature === 'INCOME') {
        income.push({ groupName: r.group_name, balance, ledgers });
        totalIncome += balance;
      } else {
        expenses.push({ groupName: r.group_name, balance, ledgers });
        totalExpenses += balance;
      }
    }

    return NextResponse.json({ income, expenses, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
