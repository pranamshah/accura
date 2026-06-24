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
        g.nature, g.name as group_name,
        COALESCE(SUM(l.opening_balance * CASE WHEN l.opening_balance_type = 'DEBIT' THEN 1 ELSE -1 END), 0) as opening_net,
        COALESCE(SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE -ve.amount END), 0) as tx_net
      FROM ledger_groups g
      LEFT JOIN ledgers l ON l.group_id = g.id AND l.is_active = true
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED' AND v.date <= ${asOf}
      WHERE g.company_id = ${companyId}
      GROUP BY g.nature, g.name
    `;

    const groups: Record<string, number> = {};
    for (const r of rows) {
      groups[r.group_name] = parseFloat(r.opening_net) + parseFloat(r.tx_net);
    }

    const currentAssets = (groups['Current Assets'] ?? 0) + (groups['Cash-in-Hand'] ?? 0) + (groups['Bank Accounts'] ?? 0) + (groups['Sundry Debtors'] ?? 0) + (groups['Stock-in-Hand'] ?? 0);
    const currentLiabilities = (groups['Current Liabilities'] ?? 0) + (groups['Duties & Taxes'] ?? 0);
    const totalAssets = Object.entries(groups).filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0);
    const totalLiabilities = Math.abs(Object.entries(groups).filter(([, v]) => v < 0).reduce((s, [, v]) => s + v, 0));
    const equity = totalAssets - totalLiabilities;
    const totalIncome = Math.abs(groups['Sales Accounts'] ?? 0) + Math.abs(groups['Direct Income'] ?? 0) + Math.abs(groups['Indirect Income'] ?? 0);
    const totalExpenses = Math.abs(groups['Purchase Accounts'] ?? 0) + Math.abs(groups['Direct Expenses'] ?? 0) + Math.abs(groups['Indirect Expenses'] ?? 0);
    const grossProfit = totalIncome - Math.abs(groups['Purchase Accounts'] ?? 0) - Math.abs(groups['Direct Expenses'] ?? 0);
    const netProfit = totalIncome - totalExpenses;

    return NextResponse.json({
      currentRatio: currentLiabilities ? currentAssets / currentLiabilities : 0,
      quickRatio: currentLiabilities ? (currentAssets - Math.abs(groups['Stock-in-Hand'] ?? 0)) / currentLiabilities : 0,
      debtEquityRatio: equity ? totalLiabilities / equity : 0,
      grossProfitRatio: totalIncome ? grossProfit / totalIncome : 0,
      netProfitRatio: totalIncome ? netProfit / totalIncome : 0,
      returnOnEquity: equity ? netProfit / equity : 0,
      returnOnAssets: totalAssets ? netProfit / totalAssets : 0,
      workingCapital: currentAssets - currentLiabilities,
      totalAssets,
      totalLiabilities,
      totalIncome,
      grossProfit,
      netProfit,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
