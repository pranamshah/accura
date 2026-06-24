import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    // Cash balance
    const cashLedgers = await sql`
      SELECT l.id, l.opening_balance, l.opening_balance_type,
        COALESCE(SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE -ve.amount END), 0) as tx_net
      FROM ledgers l
      JOIN ledger_groups g ON l.group_id = g.id AND g.name = 'Cash-in-Hand'
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
      WHERE l.company_id = ${companyId}
      GROUP BY l.id, l.opening_balance, l.opening_balance_type
    `;
    let cashBalance = 0;
    for (const l of cashLedgers) {
      const net = parseFloat(l.opening_balance) * (l.opening_balance_type === 'DEBIT' ? 1 : -1) + parseFloat(l.tx_net);
      cashBalance += net;
    }

    // Bank balance
    const bankLedgers = await sql`
      SELECT l.id, l.opening_balance, l.opening_balance_type,
        COALESCE(SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE -ve.amount END), 0) as tx_net
      FROM ledgers l
      JOIN ledger_groups g ON l.group_id = g.id AND g.name = 'Bank Accounts'
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
      WHERE l.company_id = ${companyId}
      GROUP BY l.id, l.opening_balance, l.opening_balance_type
    `;
    let bankBalance = 0;
    for (const l of bankLedgers) {
      const net = parseFloat(l.opening_balance) * (l.opening_balance_type === 'DEBIT' ? 1 : -1) + parseFloat(l.tx_net);
      bankBalance += net;
    }

    // Receivables (Sundry Debtors net)
    const receivables = await sql`
      SELECT l.name as ledger_name,
        (l.opening_balance * CASE WHEN l.opening_balance_type = 'DEBIT' THEN 1 ELSE -1 END +
        COALESCE(SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE -ve.amount END), 0)) as balance
      FROM ledgers l
      JOIN ledger_groups g ON l.group_id = g.id AND g.name = 'Sundry Debtors'
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
      WHERE l.company_id = ${companyId}
      GROUP BY l.id, l.name, l.opening_balance, l.opening_balance_type
      HAVING (l.opening_balance * CASE WHEN l.opening_balance_type = 'DEBIT' THEN 1 ELSE -1 END + COALESCE(SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE -ve.amount END), 0)) > 0
      ORDER BY balance DESC LIMIT 5
    `;

    // Payables
    const payables = await sql`
      SELECT l.name as ledger_name,
        ABS(l.opening_balance * CASE WHEN l.opening_balance_type = 'CREDIT' THEN 1 ELSE -1 END +
        COALESCE(SUM(CASE WHEN ve.type = 'CREDIT' THEN ve.amount ELSE -ve.amount END), 0)) as balance
      FROM ledgers l
      JOIN ledger_groups g ON l.group_id = g.id AND g.name = 'Sundry Creditors'
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
      WHERE l.company_id = ${companyId}
      GROUP BY l.id, l.name, l.opening_balance, l.opening_balance_type
      ORDER BY balance DESC LIMIT 5
    `;

    // GST liability
    const gstLiability = await sql`
      SELECT COALESCE(
        SUM(CASE WHEN ve.type = 'CREDIT' THEN ve.amount ELSE -ve.amount END), 0
      ) as balance
      FROM ledgers l
      JOIN ledger_groups g ON l.group_id = g.id AND g.name = 'Duties & Taxes'
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED'
      WHERE l.company_id = ${companyId}
    `;

    // Monthly revenue (last 6 months)
    const monthlyData = await sql`
      SELECT
        TO_CHAR(v.date, 'Mon YY') as month,
        CASE WHEN v.type = 'SALES' THEN SUM(v.total_amount) ELSE 0 END as revenue,
        CASE WHEN v.type = 'PURCHASE' THEN SUM(v.total_amount) ELSE 0 END as expense
      FROM vouchers v
      WHERE v.company_id = ${companyId} AND v.status != 'CANCELLED'
        AND v.type IN ('SALES', 'PURCHASE')
        AND v.date >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(v.date, 'Mon YY'), v.type
      ORDER BY MIN(v.date)
    `;

    // Recent vouchers
    const recentVouchers = await sql`
      SELECT v.id, v.date, v.type, v.number, v.total_amount as amount, l.name as party_name
      FROM vouchers v
      LEFT JOIN ledgers l ON v.party_ledger_id = l.id
      WHERE v.company_id = ${companyId} AND v.status != 'CANCELLED'
      ORDER BY v.created_at DESC LIMIT 10
    `;

    // Monthly aggregation
    const monthMap: Record<string, { month: string; revenue: number; expense: number }> = {};
    for (const r of monthlyData) {
      if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, revenue: 0, expense: 0 };
      monthMap[r.month].revenue += parseFloat(r.revenue) || 0;
      monthMap[r.month].expense += parseFloat(r.expense) || 0;
    }

    return NextResponse.json({
      cashBalance: Math.max(0, cashBalance),
      bankBalance: Math.max(0, bankBalance),
      todayVouchers: {},
      topReceivables: receivables.map((r) => ({ ledgerName: r.ledger_name, amount: parseFloat(r.balance) })),
      topPayables: payables.map((r) => ({ ledgerName: r.ledger_name, amount: parseFloat(r.balance) })),
      gstLiability: Math.max(0, parseFloat(gstLiability[0]?.balance ?? '0')),
      monthlyRevenue: Object.values(monthMap),
      stockAlerts: [],
      tdsDue: 0,
      recentVouchers: recentVouchers.map((v) => ({
        id: v.id, date: v.date, type: v.type, number: v.number,
        amount: parseFloat(v.amount), partyName: v.party_name,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
