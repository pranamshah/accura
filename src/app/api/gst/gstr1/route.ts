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

    const vouchers = await sql`
      SELECT v.*, l.name as party_name, l.gstin as party_gstin, l.state as party_state
      FROM vouchers v
      LEFT JOIN ledgers l ON v.party_ledger_id = l.id
      WHERE v.company_id = ${companyId} AND v.type = 'SALES' AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      ORDER BY v.date
    `;

    const gstLines = await sql`
      SELECT gl.*, v.id as v_id
      FROM gst_lines gl
      JOIN vouchers v ON v.id = gl.voucher_id
      WHERE v.company_id = ${companyId} AND v.type = 'SALES' AND v.status != 'CANCELLED'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
    `;

    const gstMap: Record<string, typeof gstLines> = {};
    for (const g of gstLines) { (gstMap[g.v_id] = gstMap[g.v_id] || []).push(g); }

    const b2b = [];
    const b2cl = [];
    let totalTaxable = 0;
    let totalTax = 0;

    for (const v of vouchers) {
      const lines = gstMap[v.id] ?? [];
      const taxable = lines.reduce((s, g) => s + parseFloat(g.taxable_value), 0);
      const igst = lines.reduce((s, g) => s + parseFloat(g.igst_amount), 0);
      const cgst = lines.reduce((s, g) => s + parseFloat(g.cgst_amount), 0);
      const sgst = lines.reduce((s, g) => s + parseFloat(g.sgst_amount), 0);
      const tax = igst + cgst + sgst;

      totalTaxable += taxable;
      totalTax += tax;

      if (v.party_gstin) {
        b2b.push({ gstin: v.party_gstin, invoiceNo: v.number, date: v.date, invoiceType: 'Regular', taxable, igst, cgst, sgst });
      } else if (taxable >= 250000 && igst > 0) {
        b2cl.push({ invoiceNo: v.number, date: v.date, pos: v.place_of_supply ?? '', taxable, igst });
      }
    }

    return NextResponse.json({ b2b, b2cl, totalTaxable, totalTax });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
