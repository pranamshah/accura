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

  const receiptsRows = await sql`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM vouchers
    WHERE company_id = ${companyId} AND type IN ('RECEIPT','CONTRA') AND status = 'ACTIVE'
      ${from ? sql`AND date >= ${from}` : sql``}
      ${to ? sql`AND date <= ${to}` : sql``}
  `;

  const paymentsRows = await sql`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM vouchers
    WHERE company_id = ${companyId} AND type IN ('PAYMENT','CONTRA') AND status = 'ACTIVE'
      ${from ? sql`AND date >= ${from}` : sql``}
      ${to ? sql`AND date <= ${to}` : sql``}
  `;

  const cashLedgers = await sql`
    SELECT l.* FROM ledgers l JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.company_id = ${companyId} AND lg.name IN ('Cash-in-Hand','Bank Accounts')
  `;

  const openingCash = (cashLedgers as { opening_balance: number; opening_balance_type: string }[])
    .reduce((s, l) => l.opening_balance_type === 'DEBIT' ? s + l.opening_balance : s - l.opening_balance, 0);

  const cashInflows = Number((receiptsRows[0] as { total: string }).total);
  const cashOutflows = Number((paymentsRows[0] as { total: string }).total);

  return NextResponse.json({
    openingBalance: openingCash,
    inflows: [{ category: 'Receipts from Customers', amount: cashInflows }],
    outflows: [{ category: 'Payments to Suppliers', amount: cashOutflows }],
    netCashFlow: cashInflows - cashOutflows,
    closingBalance: openingCash + cashInflows - cashOutflows,
  });
}
