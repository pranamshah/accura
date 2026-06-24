import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const asOf = searchParams.get('asOf');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const rows = await sql`
    SELECT
      l.id, l.name, l.opening_balance, l.opening_balance_type,
      lg.name as group_name, lg.nature, lg.parent_id,
      COALESCE(dr.total, 0) as dr_total,
      COALESCE(cr.total, 0) as cr_total
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    LEFT JOIN (
      SELECT ve.ledger_id, SUM(ve.amount) as total
      FROM voucher_entries ve JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.type = 'DEBIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE'
        ${asOf ? sql`AND v.date <= ${asOf}` : sql``}
      GROUP BY ve.ledger_id
    ) dr ON dr.ledger_id = l.id
    LEFT JOIN (
      SELECT ve.ledger_id, SUM(ve.amount) as total
      FROM voucher_entries ve JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.type = 'CREDIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE'
        ${asOf ? sql`AND v.date <= ${asOf}` : sql``}
      GROUP BY ve.ledger_id
    ) cr ON cr.ledger_id = l.id
    WHERE l.company_id = ${companyId} AND l.is_active = true
      AND lg.nature IN ('ASSETS','LIABILITIES')
  `;

  const groups: Record<string, { name: string; amount: number; nature: string; children: Array<{ name: string; amount: number }> }> = {};

  for (const r of rows as { opening_balance: number; opening_balance_type: string; dr_total: number; cr_total: number; name: string; group_name: string; nature: string }[]) {
    const drTotal = r.dr_total + (r.opening_balance_type === 'DEBIT' ? r.opening_balance : 0);
    const crTotal = r.cr_total + (r.opening_balance_type === 'CREDIT' ? r.opening_balance : 0);
    const balance = Math.abs(drTotal - crTotal);
    if (balance === 0) continue;

    if (!groups[r.group_name]) {
      groups[r.group_name] = { name: r.group_name, amount: 0, nature: r.nature, children: [] };
    }
    groups[r.group_name].children.push({ name: r.name, amount: balance });
    groups[r.group_name].amount += balance;
  }

  const assets = Object.values(groups).filter((g) => g.nature === 'ASSETS' && g.amount > 0);
  const liabilities = Object.values(groups).filter((g) => g.nature === 'LIABILITIES' && g.amount > 0);

  return NextResponse.json({
    assets,
    liabilities,
    totalAssets: assets.reduce((s, a) => s + a.amount, 0),
    totalLiabilities: liabilities.reduce((s, l) => s + l.amount, 0),
  });
}
