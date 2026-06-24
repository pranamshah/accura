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
        g.name as group_name, g.nature,
        COALESCE(SUM(l.opening_balance * CASE WHEN l.opening_balance_type = 'DEBIT' THEN 1 ELSE -1 END), 0) as opening_net,
        COALESCE(SUM(CASE WHEN ve.type = 'DEBIT' THEN ve.amount ELSE -ve.amount END), 0) as tx_net
      FROM ledger_groups g
      LEFT JOIN ledgers l ON l.group_id = g.id AND l.is_active = true
      LEFT JOIN voucher_entries ve ON ve.ledger_id = l.id
      LEFT JOIN vouchers v ON v.id = ve.voucher_id AND v.status != 'CANCELLED' AND v.date <= ${asOf}
      WHERE g.company_id = ${companyId}
      GROUP BY g.name, g.nature
      ORDER BY g.nature, g.name
    `;

    const assets: Array<{ groupName: string; nature: string; balance: number }> = [];
    const liabilities: Array<{ groupName: string; nature: string; balance: number }> = [];
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const r of rows) {
      const balance = Math.abs(parseFloat(r.opening_net) + parseFloat(r.tx_net));
      if (r.nature === 'ASSETS') {
        assets.push({ groupName: r.group_name, nature: r.nature, balance });
        totalAssets += balance;
      } else if (r.nature === 'LIABILITIES') {
        liabilities.push({ groupName: r.group_name, nature: r.nature, balance });
        totalLiabilities += balance;
      }
    }

    return NextResponse.json({ assets, liabilities, totalAssets, totalLiabilities, asOf });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
