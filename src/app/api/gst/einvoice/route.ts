import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { buildEInvoicePayload } from '@/lib/gst';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const voucherId = searchParams.get('voucherId');

  if (!companyId || !voucherId) {
    return NextResponse.json({ error: 'companyId and voucherId required' }, { status: 400 });
  }

  const voucherRows = await sql`SELECT * FROM vouchers WHERE id = ${voucherId} LIMIT 1`;
  const companyRows = await sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`;

  if (voucherRows.length === 0 || companyRows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const voucher = voucherRows[0] as { id: string };
  const company = companyRows[0] as { gstin: string | null; name: string; address: string | null; city: string | null; state: string | null; state_code: string | null; pincode: string | null };

  const entries = await sql`
    SELECT ve.*, l.name as ledger_name, l.gstin as ledger_gstin, l.address, l.city, l.state, l.state_code, l.pincode
    FROM voucher_entries ve JOIN ledgers l ON ve.ledger_id = l.id
    WHERE ve.voucher_id = ${voucherId}
  `;
  const gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ${voucherId}`;
  const inventoryLines = await sql`
    SELECT il.*, i.name as item_name FROM inventory_lines il JOIN items i ON il.item_id = i.id WHERE il.voucher_id = ${voucherId}
  `;

  const buyerEntry = (entries as { type: string; ledger_name: string; ledger_gstin: string | null; address: string | null; city: string | null; state: string | null; state_code: string | null; pincode: string | null }[]).find((e) => e.type === 'DEBIT');

  const voucherWithDetails = { ...voucher, entries: entries.map((e) => ({ ...e, ledger: { name: (e as { ledger_name: string }).ledger_name, gstin: (e as { ledger_gstin: string }).ledger_gstin } })), gstLines, inventoryLines: inventoryLines.map((il) => ({ ...il, item: { name: (il as { item_name: string }).item_name } })) };

  const payload = buildEInvoicePayload(
    voucherWithDetails as Parameters<typeof buildEInvoicePayload>[0],
    {
      gstin: company.gstin || '',
      name: company.name,
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      stateCode: company.state_code || '33',
      pincode: company.pincode || '600001',
    },
    {
      gstin: buyerEntry?.ledger_gstin || undefined,
      name: buyerEntry?.ledger_name || 'Consumer',
      address: buyerEntry?.address || '',
      city: buyerEntry?.city || '',
      state: buyerEntry?.state || '',
      stateCode: buyerEntry?.state_code || '33',
      pincode: buyerEntry?.pincode || '600001',
    }
  );

  return NextResponse.json({ payload, voucher: voucherWithDetails });
}
