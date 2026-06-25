import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const rows = await sql`
      SELECT v.*, l.name as party_name, l.gstin as party_gstin, l.address as party_address,
             l.mobile_no as party_mobile, l.state as party_state,
             c.name as company_name, c.address as company_address, c.gstin as company_gstin,
             c.state as company_state
      FROM vouchers v
      LEFT JOIN ledgers l ON l.id=v.party_ledger_id
      LEFT JOIN companies c ON c.id=v.company_id
      WHERE v.id=${id}`;

    if (!rows[0]) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    const v = rows[0];

    const invLines = await sql`
      SELECT il.*, i.name as item_name, i.unit, i.hsn_code as item_hsn
      FROM inventory_lines il LEFT JOIN items i ON i.id=il.item_id
      WHERE il.voucher_id=${id}`;

    const gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id=${id}`;

    // Return JSON — client generates PDF with jsPDF
    return NextResponse.json({ voucher: v, inventoryLines: invLines, gstLines });
  } catch (err) {
    console.error('invoice pdf error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
