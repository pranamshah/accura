import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  // Fetch all ledgers with their group nature and opening balances + period movements
  const rows = await sql`
    SELECT
      l.opening_balance,
      l.opening_balance_type,
      lg.nature,
      lg.name as group_name,
      COALESCE(dr.total, 0) as dr_total,
      COALESCE(cr.total, 0) as cr_total
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    LEFT JOIN (
      SELECT ve.ledger_id, SUM(ve.amount) as total
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.type = 'DEBIT'
        AND v.company_id = ${companyId}
        AND v.status = 'ACTIVE'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      GROUP BY ve.ledger_id
    ) dr ON dr.ledger_id = l.id
    LEFT JOIN (
      SELECT ve.ledger_id, SUM(ve.amount) as total
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.type = 'CREDIT'
        AND v.company_id = ${companyId}
        AND v.status = 'ACTIVE'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      GROUP BY ve.ledger_id
    ) cr ON cr.ledger_id = l.id
    WHERE l.company_id = ${companyId}
      AND l.is_active = true
      AND lg.nature IN ('ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES')
  `;

  type LedgerRow = {
    opening_balance: number;
    opening_balance_type: string;
    nature: string;
    group_name: string;
    dr_total: number;
    cr_total: number;
  };

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  // Current assets / liabilities heuristic: groups whose name contains
  // common current-asset/liability keywords
  const currentAssetKeywords = ['current', 'cash', 'bank', 'receivable', 'debtor', 'stock', 'inventory', 'advance', 'prepaid', 'loan'];
  const currentLiabilityKeywords = ['current', 'payable', 'creditor', 'overdraft', 'short', 'outstanding', 'tax payable', 'duties'];

  let currentAssets = 0;
  let currentLiabilities = 0;

  for (const r of rows as LedgerRow[]) {
    const ob = r.opening_balance ?? 0;
    const obType = r.opening_balance_type ?? 'DEBIT';
    const dr = r.dr_total + (obType === 'DEBIT' ? ob : 0);
    const cr = r.cr_total + (obType === 'CREDIT' ? ob : 0);

    const groupLower = (r.group_name ?? '').toLowerCase();

    if (r.nature === 'ASSETS') {
      // Assets increase with debit
      const balance = Math.max(dr - cr, 0);
      totalAssets += balance;
      if (currentAssetKeywords.some((k) => groupLower.includes(k))) {
        currentAssets += balance;
      }
    } else if (r.nature === 'LIABILITIES') {
      // Liabilities increase with credit
      const balance = Math.max(cr - dr, 0);
      totalLiabilities += balance;
      if (currentLiabilityKeywords.some((k) => groupLower.includes(k))) {
        currentLiabilities += balance;
      }
    } else if (r.nature === 'INCOME') {
      const balance = Math.max(cr - dr, 0);
      totalIncome += balance;
    } else if (r.nature === 'EXPENSES') {
      const balance = Math.max(dr - cr, 0);
      totalExpenses += balance;
    }
  }

  const netProfit = totalIncome - totalExpenses;
  const equity = totalAssets - totalLiabilities;

  // Ratio calculations with safe-divide
  const safe = (n: number, d: number) => (d !== 0 ? n / d : 0);

  const currentRatio = safe(currentAssets, currentLiabilities);
  const debtToEquity = safe(totalLiabilities, equity > 0 ? equity : 1);
  const grossProfitMargin = safe((totalIncome - totalExpenses), totalIncome) * 100;
  const netProfitMargin = safe(netProfit, totalIncome) * 100;
  const returnOnAssets = safe(netProfit, totalAssets) * 100;

  return NextResponse.json({
    currentRatio,
    debtToEquity,
    grossProfitMargin,
    netProfitMargin,
    returnOnAssets,
    totalAssets,
    totalLiabilities,
    totalIncome,
    totalExpenses,
    netProfit,
    currentAssets,
    currentLiabilities,
  });
}
