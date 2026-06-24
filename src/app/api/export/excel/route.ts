import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'vouchers';
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    let rows: Record<string, unknown>[] = [];
    let filename = 'export.csv';
    let headers: string[] = [];

    if (type === 'gstr1') {
      const vouchers = await sql`
        SELECT v.number, v.date, l.gstin, l.name as party, v.total_amount,
          (SELECT SUM(gl.taxable_value) FROM gst_lines gl WHERE gl.voucher_id = v.id) as taxable,
          (SELECT SUM(gl.igst_amount) FROM gst_lines gl WHERE gl.voucher_id = v.id) as igst,
          (SELECT SUM(gl.cgst_amount) FROM gst_lines gl WHERE gl.voucher_id = v.id) as cgst,
          (SELECT SUM(gl.sgst_amount) FROM gst_lines gl WHERE gl.voucher_id = v.id) as sgst
        FROM vouchers v
        LEFT JOIN ledgers l ON v.party_ledger_id = l.id
        WHERE v.company_id = ${companyId} AND v.type = 'SALES' AND v.status != 'CANCELLED'
          ${from ? sql`AND v.date >= ${from}` : sql``}
          ${to ? sql`AND v.date <= ${to}` : sql``}
        ORDER BY v.date
      `;
      rows = vouchers as Record<string, unknown>[];
      headers = ['Invoice No.', 'Date', 'Party GSTIN', 'Party Name', 'Total', 'Taxable', 'IGST', 'CGST', 'SGST'];
      filename = 'gstr1.csv';
    } else {
      const vouchers = await sql`
        SELECT v.number, v.date, v.type, l.name as party, v.total_amount, v.narration
        FROM vouchers v
        LEFT JOIN ledgers l ON v.party_ledger_id = l.id
        WHERE v.company_id = ${companyId} AND v.status != 'CANCELLED'
          ${from ? sql`AND v.date >= ${from}` : sql``}
          ${to ? sql`AND v.date <= ${to}` : sql``}
        ORDER BY v.date DESC
      `;
      rows = vouchers as Record<string, unknown>[];
      headers = ['Voucher No.', 'Date', 'Type', 'Party', 'Amount', 'Narration'];
      filename = 'vouchers.csv';
    }

    // Build CSV
    const csvLines = [headers.join(',')];
    for (const r of rows) {
      const vals = Object.values(r).map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`);
      csvLines.push(vals.join(','));
    }
    const csv = csvLines.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
