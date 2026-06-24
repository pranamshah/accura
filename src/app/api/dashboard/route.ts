import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  // Helper: compute ledger balance from DB
  async function getLedgerBalance(ledgerId: string, openingBalance: number, openingType: string) {
    const drRows = await sql`
      SELECT COALESCE(SUM(ve.amount), 0) as total
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.ledger_id = ${ledgerId} AND ve.type = 'DEBIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE'
    `;
    const crRows = await sql`
      SELECT COALESCE(SUM(ve.amount), 0) as total
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.ledger_id = ${ledgerId} AND ve.type = 'CREDIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE'
    `;
    const drTotal = Number((drRows[0] as { total: string }).total) + (openingType === 'DEBIT' ? openingBalance : 0);
    const crTotal = Number((crRows[0] as { total: string }).total) + (openingType === 'CREDIT' ? openingBalance : 0);
    return drTotal - crTotal;
  }

  // 1. Cash & Bank balances
  const cashLedgers = await sql`
    SELECT l.*, lg.name as group_name FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.company_id = ${companyId}
      AND lg.name IN ('Cash-in-Hand', 'Bank Accounts')
      AND l.is_active = true
  `;

  let cashBalance = 0;
  let bankBalance = 0;
  for (const l of cashLedgers as { id: string; opening_balance: number; opening_balance_type: string; group_name: string }[]) {
    const balance = await getLedgerBalance(l.id, l.opening_balance, l.opening_balance_type);
    if (l.group_name === 'Cash-in-Hand') cashBalance += balance;
    else bankBalance += balance;
  }

  // 2. Today's vouchers
  const today = new Date().toISOString().split('T')[0];
  const todayVouchersRaw = await sql`
    SELECT type, COUNT(*) as cnt FROM vouchers
    WHERE company_id = ${companyId} AND date::date = ${today}::date AND status = 'ACTIVE'
    GROUP BY type
  `;
  const todayVouchers: Record<string, number> = {};
  for (const v of todayVouchersRaw as { type: string; cnt: string }[]) {
    todayVouchers[v.type] = Number(v.cnt);
  }

  // 3. Outstanding receivables
  const debtors = await sql`
    SELECT l.* FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.company_id = ${companyId} AND lg.name = 'Sundry Debtors' AND l.is_active = true
    LIMIT 5
  `;
  const topReceivables = await Promise.all(
    (debtors as { id: string; name: string; opening_balance: number; opening_balance_type: string }[]).map(async (l) => {
      const balance = await getLedgerBalance(l.id, l.opening_balance, l.opening_balance_type);
      return { ledgerName: l.name, amount: Math.max(0, balance) };
    })
  );

  // 4. Outstanding payables
  const creditors = await sql`
    SELECT l.* FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.company_id = ${companyId} AND lg.name = 'Sundry Creditors' AND l.is_active = true
    LIMIT 5
  `;
  const topPayables = await Promise.all(
    (creditors as { id: string; name: string; opening_balance: number; opening_balance_type: string }[]).map(async (l) => {
      const balance = await getLedgerBalance(l.id, l.opening_balance, l.opening_balance_type);
      return { ledgerName: l.name, amount: Math.abs(Math.min(0, balance)) };
    })
  );

  // 5. GST liability
  const gstOutputLedgers = await sql`SELECT * FROM ledgers WHERE company_id = ${companyId} AND name IN ('CGST Output','SGST Output','IGST Output')`;
  const gstInputLedgers = await sql`SELECT * FROM ledgers WHERE company_id = ${companyId} AND name IN ('CGST Input','SGST Input','IGST Input')`;
  let gstOutput = 0;
  let gstInput = 0;
  for (const l of gstOutputLedgers as { id: string; opening_balance: number; opening_balance_type: string }[]) {
    gstOutput += Math.abs(await getLedgerBalance(l.id, l.opening_balance, l.opening_balance_type));
  }
  for (const l of gstInputLedgers as { id: string; opening_balance: number; opening_balance_type: string }[]) {
    gstInput += Math.abs(await getLedgerBalance(l.id, l.opening_balance, l.opening_balance_type));
  }
  const gstLiability = Math.max(0, gstOutput - gstInput);

  // 6. Monthly revenue (last 6 months)
  const monthlyRevenue: Array<{ month: string; revenue: number; expense: number }> = [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const salesRows = await sql`SELECT COALESCE(SUM(total_amount),0) as total FROM vouchers WHERE company_id = ${companyId} AND type = 'SALES' AND status = 'ACTIVE' AND date >= ${start} AND date <= ${end}`;
    const purchaseRows = await sql`SELECT COALESCE(SUM(total_amount),0) as total FROM vouchers WHERE company_id = ${companyId} AND type = 'PURCHASE' AND status = 'ACTIVE' AND date >= ${start} AND date <= ${end}`;

    monthlyRevenue.push({
      month: `${months[d.getMonth()]} ${d.getFullYear()}`,
      revenue: Number((salesRows[0] as { total: string }).total),
      expense: Number((purchaseRows[0] as { total: string }).total),
    });
  }

  // 7. Stock alerts
  const items = await sql`
    SELECT i.*, COALESCE(pu.qty,0) as purchased_qty, COALESCE(so.qty,0) as sold_qty
    FROM items i
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as qty FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'PURCHASE' AND v.status = 'ACTIVE' GROUP BY il.item_id
    ) pu ON pu.item_id = i.id
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as qty FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'SALES' AND v.status = 'ACTIVE' GROUP BY il.item_id
    ) so ON so.item_id = i.id
    WHERE i.company_id = ${companyId} AND i.reorder_level IS NOT NULL AND i.is_active = true
    LIMIT 10
  `;

  const stockAlerts: Array<{ itemName: string; currentStock: number; reorderLevel: number }> = [];
  for (const item of items as { name: string; opening_stock: number; purchased_qty: number; sold_qty: number; reorder_level: number }[]) {
    const currentStock = item.opening_stock + item.purchased_qty - item.sold_qty;
    if (currentStock <= item.reorder_level) {
      stockAlerts.push({ itemName: item.name, currentStock, reorderLevel: item.reorder_level });
    }
  }

  // 8. TDS due
  const tdsLedger = await sql`SELECT * FROM ledgers WHERE company_id = ${companyId} AND name = 'TDS Payable' LIMIT 1`;
  let tdsDue = 0;
  if (tdsLedger.length > 0) {
    const l = tdsLedger[0] as { id: string; opening_balance: number; opening_balance_type: string };
    tdsDue = Math.abs(await getLedgerBalance(l.id, l.opening_balance, l.opening_balance_type));
  }

  // 9. Recent transactions
  const recentVouchers = await sql`
    SELECT id, date, type, number, total_amount, narration
    FROM vouchers
    WHERE company_id = ${companyId} AND status = 'ACTIVE'
    ORDER BY created_at DESC
    LIMIT 10
  `;

  return NextResponse.json({
    cashBalance,
    bankBalance,
    todayVouchers,
    topReceivables: topReceivables.sort((a, b) => b.amount - a.amount).slice(0, 5),
    topPayables: topPayables.sort((a, b) => b.amount - a.amount).slice(0, 5),
    gstLiability,
    monthlyRevenue,
    stockAlerts,
    tdsDue,
    recentTransactions: recentVouchers,
    anomalies: [],
  });
}
