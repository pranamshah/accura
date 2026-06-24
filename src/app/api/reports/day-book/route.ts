import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRows } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const type = searchParams.get('type');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    const rows = await sql`
      SELECT v.*, l.name as party_name, l.gstin as party_gstin,
        (SELECT SUM(gl.taxable_value) FROM gst_lines gl WHERE gl.voucher_id = v.id) as subtotal,
        (SELECT SUM(gl.total_tax) FROM gst_lines gl WHERE gl.voucher_id = v.id) as tax_amount
      FROM vouchers v
      LEFT JOIN ledgers l ON v.party_ledger_id = l.id
      WHERE v.company_id = ${companyId}
        AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
        ${type ? sql`AND v.type = ${type}` : sql``}
      ORDER BY v.date DESC, v.created_at DESC
    `;
    return NextResponse.json({ vouchers: transformRows(rows) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
