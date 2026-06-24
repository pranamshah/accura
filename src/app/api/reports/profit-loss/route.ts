import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const rows = await sql`
    SELECT
      l.id, l.name, lg.nature, lg.name as group_name,
      COALESCE(dr.total, 0) as dr_total,
      COALESCE(cr.total, 0) as cr_total
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    LEFT JOIN (
      SELECT ve.ledger_id, SUM(ve.amount) as total
      FROM voucher_entries ve JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.type = 'DEBIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      GROUP BY ve.ledger_id
    ) dr ON dr.ledger_id = l.id
    LEFT JOIN (
      SELECT ve.ledger_id, SUM(ve.amount) as total
      FROM voucher_entries ve JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.type = 'CREDIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      GROUP BY ve.ledger_id
    ) cr ON cr.ledger_id = l.id
    WHERE l.company_id = ${companyId} AND l.is_active = true
      AND lg.nature IN ('INCOME','EXPENSES')
  `;

  const income: Array<{ name: string; amount: number }> = [];
  const expenses: Array<{ name: string; amount: number }> = [];

  for (const r of rows as { name: string; nature: string; dr_total: number; cr_total: number }[]) {
    if (r.nature === 'INCOME') {
      const amount = r.cr_total - r.dr_total;
      if (amount !== 0) income.push({ name: r.name, amount });
    } else {
      const amount = r.dr_total - r.cr_total;
      if (amount !== 0) expenses.push({ name: r.name, amount });
    }
  }

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  return NextResponse.json({
    income,
    expenses,
    grossProfit: netProfit,
    netProfit,
    totalIncome,
    totalExpenses,
  });
}
