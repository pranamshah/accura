import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { exportTrialBalance, exportGSTR1, exportStockSummary, exportDayBook } from '@/lib/excel';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from') || new Date(new Date().getFullYear(), 3, 1).toISOString();
  const to = searchParams.get('to') || new Date().toISOString();

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const companyRows = await sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`;
  if (companyRows.length === 0) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const company = companyRows[0] as { name: string; gstin: string | null };

  let buffer: Buffer;
  let filename: string;

  if (type === 'trial-balance') {
    const rows = await sql`
      SELECT l.id, l.name as ledger_name, l.opening_balance, l.opening_balance_type,
        lg.name as group_name, lg.nature,
        COALESCE(dr.total, 0) as dr_total, COALESCE(cr.total, 0) as cr_total
      FROM ledgers l JOIN ledger_groups lg ON l.group_id = lg.id
      LEFT JOIN (SELECT ve.ledger_id, SUM(ve.amount) as total FROM voucher_entries ve JOIN vouchers v ON ve.voucher_id = v.id WHERE ve.type = 'DEBIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE' GROUP BY ve.ledger_id) dr ON dr.ledger_id = l.id
      LEFT JOIN (SELECT ve.ledger_id, SUM(ve.amount) as total FROM voucher_entries ve JOIN vouchers v ON ve.voucher_id = v.id WHERE ve.type = 'CREDIT' AND v.company_id = ${companyId} AND v.status = 'ACTIVE' GROUP BY ve.ledger_id) cr ON cr.ledger_id = l.id
      WHERE l.company_id = ${companyId} AND l.is_active = true
    `;

    const tbRows = (rows as { opening_balance: number; opening_balance_type: string; dr_total: number; cr_total: number; ledger_name: string; group_name: string; nature: string }[])
      .map((r) => {
        const drTotal = r.dr_total + (r.opening_balance_type === 'DEBIT' ? r.opening_balance : 0);
        const crTotal = r.cr_total + (r.opening_balance_type === 'CREDIT' ? r.opening_balance : 0);
        return { ledgerName: r.ledger_name, groupName: r.group_name, nature: r.nature as 'ASSETS'|'LIABILITIES'|'INCOME'|'EXPENSES', debit: Math.max(0, drTotal - crTotal), credit: Math.max(0, crTotal - drTotal) };
      })
      .filter((r) => r.debit > 0 || r.credit > 0);

    buffer = await exportTrialBalance(tbRows, { name: company.name }, `${new Date(from).toLocaleDateString('en-IN')} to ${new Date(to).toLocaleDateString('en-IN')}`);
    filename = 'trial-balance.xlsx';
  } else if (type === 'gstr1') {
    const month = searchParams.get('month') || String(new Date().getMonth() + 1);
    const year = searchParams.get('year') || String(new Date().getFullYear());

    const vouchers = await sql`SELECT v.* FROM vouchers v WHERE v.company_id = ${companyId} AND v.type = 'SALES' AND v.status = 'ACTIVE' AND v.date >= ${new Date(parseInt(year), parseInt(month)-1, 1).toISOString()} AND v.date <= ${new Date(parseInt(year), parseInt(month), 0).toISOString()}`;
    const vIds = (vouchers as { id: string }[]).map((v) => v.id);
    const entries = vIds.length > 0 ? await sql`SELECT ve.*, l.name as ledger_name, l.gstin as ledger_gstin FROM voucher_entries ve JOIN ledgers l ON ve.ledger_id = l.id WHERE ve.voucher_id = ANY(${vIds})` : [];
    const gstLines = vIds.length > 0 ? await sql`SELECT * FROM gst_lines WHERE voucher_id = ANY(${vIds})` : [];

    const vouchersWithDetails = (vouchers as { id: string }[]).map((v) => ({
      ...v,
      entries: (entries as { voucher_id: string; ledger_name: string; ledger_gstin: string }[]).filter((e) => e.voucher_id === v.id).map((e) => ({ ...e, ledger: { name: e.ledger_name, gstin: e.ledger_gstin } })),
      gstLines: (gstLines as { voucher_id: string }[]).filter((g) => g.voucher_id === v.id),
    }));

    buffer = await exportGSTR1(vouchersWithDetails as Parameters<typeof exportGSTR1>[0], { name: company.name, gstin: company.gstin || undefined }, `${month}/${year}`);
    filename = `gstr1-${month}-${year}.xlsx`;
  } else if (type === 'stock') {
    const stock = await sql`
      SELECT i.*, u.symbol as unit_symbol, u.name as unit_name,
        COALESCE(pu.qty, 0) as purchased_qty, COALESCE(so.qty, 0) as sold_qty
      FROM items i LEFT JOIN units u ON i.unit_id = u.id
      LEFT JOIN (SELECT il.item_id, SUM(il.quantity) as qty FROM inventory_lines il JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'PURCHASE' AND v.status = 'ACTIVE' GROUP BY il.item_id) pu ON pu.item_id = i.id
      LEFT JOIN (SELECT il.item_id, SUM(il.quantity) as qty FROM inventory_lines il JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'SALES' AND v.status = 'ACTIVE' GROUP BY il.item_id) so ON so.item_id = i.id
      WHERE i.company_id = ${companyId} AND i.is_active = true ORDER BY i.name
    `;

    const itemsWithStock = (stock as { opening_stock: number; purchased_qty: number; sold_qty: number; unit_id: string | null; unit_symbol: string; unit_name: string }[]).map((item) => ({
      ...item,
      currentStock: item.opening_stock + item.purchased_qty - item.sold_qty,
      unit: item.unit_id ? { id: item.unit_id, symbol: item.unit_symbol, name: item.unit_name } : null,
    }));

    buffer = await exportStockSummary(itemsWithStock as Parameters<typeof exportStockSummary>[0], { name: company.name });
    filename = 'stock-summary.xlsx';
  } else if (type === 'daybook') {
    const vouchers = await sql`SELECT v.* FROM vouchers v WHERE v.company_id = ${companyId} AND v.status = 'ACTIVE' AND v.date >= ${from} AND v.date <= ${to} ORDER BY v.date ASC`;
    const vIds = (vouchers as { id: string }[]).map((v) => v.id);
    const entries = vIds.length > 0 ? await sql`SELECT ve.*, l.name as ledger_name FROM voucher_entries ve JOIN ledgers l ON ve.ledger_id = l.id WHERE ve.voucher_id = ANY(${vIds})` : [];

    const vouchersWithEntries = (vouchers as { id: string }[]).map((v) => ({
      ...v,
      entries: (entries as { voucher_id: string; ledger_name: string }[]).filter((e) => e.voucher_id === v.id).map((e) => ({ ...e, ledger: { name: e.ledger_name } })),
    }));

    buffer = await exportDayBook(vouchersWithEntries as Parameters<typeof exportDayBook>[0], { name: company.name }, { from: new Date(from).toLocaleDateString('en-IN'), to: new Date(to).toLocaleDateString('en-IN') });
    filename = 'daybook.xlsx';
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
