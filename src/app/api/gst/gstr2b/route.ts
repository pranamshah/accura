import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (!companyId || !month || !year) {
    return NextResponse.json({ error: 'companyId, month, year required' }, { status: 400 });
  }

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

  const vouchers = await sql`
    SELECT v.* FROM vouchers v
    WHERE v.company_id = ${companyId} AND v.type = 'PURCHASE' AND v.status = 'ACTIVE'
      AND v.date >= ${startDate} AND v.date <= ${endDate}
  `;

  const vIds = (vouchers as { id: string }[]).map((v) => v.id);
  let entries: unknown[] = [];
  let gstLines: unknown[] = [];
  if (vIds.length > 0) {
    entries = await sql`SELECT ve.*, l.name as ledger_name, l.gstin as ledger_gstin FROM voucher_entries ve JOIN ledgers l ON ve.ledger_id = l.id WHERE ve.voucher_id = ANY(${vIds})`;
    gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ANY(${vIds})`;
  }

  return NextResponse.json({
    purchases: (vouchers as { id: string; number: string; date: string; total_amount: number }[]).map((v) => ({
      voucherId: v.id,
      number: v.number,
      date: v.date,
      supplierName: (entries as { voucher_id: string; type: string; ledger_name: string }[]).find((e) => e.voucher_id === v.id && e.type === 'CREDIT')?.ledger_name || '',
      supplierGstin: (entries as { voucher_id: string; type: string; ledger_gstin: string }[]).find((e) => e.voucher_id === v.id && e.type === 'CREDIT')?.ledger_gstin || '',
      taxableValue: (gstLines as { voucher_id: string; taxable_value: number }[]).filter((g) => g.voucher_id === v.id).reduce((s, l) => s + l.taxable_value, 0),
      igst: (gstLines as { voucher_id: string; igst_amount: number }[]).filter((g) => g.voucher_id === v.id).reduce((s, l) => s + l.igst_amount, 0),
      cgst: (gstLines as { voucher_id: string; cgst_amount: number }[]).filter((g) => g.voucher_id === v.id).reduce((s, l) => s + l.cgst_amount, 0),
      sgst: (gstLines as { voucher_id: string; sgst_amount: number }[]).filter((g) => g.voucher_id === v.id).reduce((s, l) => s + l.sgst_amount, 0),
      totalValue: v.total_amount,
      matched: false,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { companyId: string; jsonData: Record<string, unknown>; month: string; year: string };
  const { companyId, jsonData, month, year } = body;

  if (!companyId || !jsonData) {
    return NextResponse.json({ error: 'companyId and jsonData required' }, { status: 400 });
  }

  // Try update first, then insert
  const existing = await sql`
    SELECT id FROM gst_returns WHERE company_id = ${companyId} AND type = 'GSTR2B' AND period = ${month} AND year = ${parseInt(year)} LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`UPDATE gst_returns SET json_data = ${JSON.stringify(jsonData)}, status = 'FILED' WHERE id = ${(existing[0] as { id: string }).id}`;
  } else {
    await sql`
      INSERT INTO gst_returns (id, company_id, type, period, year, status, json_data)
      VALUES (gen_random_uuid()::text, ${companyId}, 'GSTR2B', ${month}, ${parseInt(year)}, 'FILED', ${JSON.stringify(jsonData)})
    `;
  }

  return NextResponse.json({ success: true, message: 'GSTR-2B uploaded successfully' });
}
