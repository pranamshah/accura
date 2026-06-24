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
      l.id, l.name as ledger_name, l.opening_balance, l.opening_balance_type,
      lg.name as group_name, lg.nature,
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
    ORDER BY lg.nature, l.name
  `;

  type Row = { opening_balance: number; opening_balance_type: string; dr_total: number; cr_total: number; ledger_name: string; group_name: string; nature: string };
  const filtered = (rows as Row[])
    .map((r) => {
      const drTotal = r.dr_total + (r.opening_balance_type === 'DEBIT' ? r.opening_balance : 0);
      const crTotal = r.cr_total + (r.opening_balance_type === 'CREDIT' ? r.opening_balance : 0);
      return {
        ledgerName: r.ledger_name,
        groupName: r.group_name,
        nature: r.nature,
        debit: Math.max(0, drTotal - crTotal),
        credit: Math.max(0, crTotal - drTotal),
      };
    })
    .filter((r) => r.debit > 0 || r.credit > 0);

  return NextResponse.json({
    rows: filtered,
    totalDebit: filtered.reduce((s, r) => s + r.debit, 0),
    totalCredit: filtered.reduce((s, r) => s + r.credit, 0),
  });
}
