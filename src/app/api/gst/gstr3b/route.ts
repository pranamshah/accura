import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    // Outward (Sales)
    const outwardLines = await sql`
      SELECT gl.*
      FROM gst_lines gl
      JOIN vouchers v ON v.id = gl.voucher_id
      WHERE v.company_id = ${companyId} AND v.type = 'SALES' AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
    `;

    const outwardTaxable = outwardLines.reduce((s, g) => s + parseFloat(g.taxable_value), 0);
    const outwardIGST = outwardLines.reduce((s, g) => s + parseFloat(g.igst_amount), 0);
    const outwardCGST = outwardLines.reduce((s, g) => s + parseFloat(g.cgst_amount), 0);
    const outwardSGST = outwardLines.reduce((s, g) => s + parseFloat(g.sgst_amount), 0);

    // Inward ITC (Purchases)
    const itcLines = await sql`
      SELECT gl.*
      FROM gst_lines gl
      JOIN vouchers v ON v.id = gl.voucher_id
      WHERE v.company_id = ${companyId} AND v.type = 'PURCHASE' AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
    `;

    const itcIGST = itcLines.reduce((s, g) => s + parseFloat(g.igst_amount), 0);
    const itcCGST = itcLines.reduce((s, g) => s + parseFloat(g.cgst_amount), 0);
    const itcSGST = itcLines.reduce((s, g) => s + parseFloat(g.sgst_amount), 0);

    return NextResponse.json({
      outwardTaxable, outwardIGST, outwardCGST, outwardSGST,
      itcIGST, itcCGST, itcSGST,
      zeroRatedTaxable: 0, nonGST: 0,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
