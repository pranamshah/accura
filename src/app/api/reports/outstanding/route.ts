import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const type = searchParams.get('type') || 'receivable';
  const asOf = searchParams.get('asOf');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const groupName = type === 'receivable' ? 'Sundry Debtors' : 'Sundry Creditors';

  const rows = await sql`
    SELECT
      l.id, l.name, l.opening_balance, l.opening_balance_type, l.gstin, l.mobile_no as phone,
      l.credit_days, l.credit_limit,
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
    WHERE l.company_id = ${companyId} AND l.is_active = true AND lg.name = ${groupName}
  `;

  const results = (rows as { id: string; name: string; opening_balance: number; opening_balance_type: string; gstin: string | null; phone: string | null; credit_days: number | null; credit_limit: number | null; dr_total: number; cr_total: number }[])
    .map((r) => {
      const drTotal = r.dr_total + (r.opening_balance_type === 'DEBIT' ? r.opening_balance : 0);
      const crTotal = r.cr_total + (r.opening_balance_type === 'CREDIT' ? r.opening_balance : 0);
      const balance = type === 'receivable' ? drTotal - crTotal : crTotal - drTotal;
      return {
        ledgerId: r.id,
        ledgerName: r.name,
        gstin: r.gstin,
        phone: r.phone,
        balance,
        creditDays: r.credit_days,
        creditLimit: r.credit_limit,
      };
    })
    .filter((r) => r.balance > 0.01);

  return NextResponse.json({
    type,
    outstanding: results.sort((a, b) => b.balance - a.balance),
    total: results.reduce((s, r) => s + r.balance, 0),
  });
}
