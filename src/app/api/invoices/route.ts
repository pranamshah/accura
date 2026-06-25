import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const type = searchParams.get('type') || 'ALL';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    let typeFilter = sql`AND v.type IN ('SALES','PURCHASE')`;
    if (type === 'SALES') typeFilter = sql`AND v.type='SALES'`;
    if (type === 'PURCHASE') typeFilter = sql`AND v.type='PURCHASE'`;

    let dateFilter = sql``;
    if (from && to) dateFilter = sql`AND v.date BETWEEN ${from} AND ${to}`;
    else if (from) dateFilter = sql`AND v.date >= ${from}`;
    else if (to) dateFilter = sql`AND v.date <= ${to}`;

    const rows = await sql`
      SELECT v.id, v.number, v.type, v.date::text, v.total_amount, v.narration, v.reference,
             v.place_of_supply, v.gst_applicable, v.created_at::text,
             l.name as party_name, l.gstin as party_gstin, l.address as party_address,
             l.mobile_no as party_mobile
      FROM vouchers v
      LEFT JOIN ledgers l ON l.id=v.party_ledger_id
      WHERE v.company_id=${companyId} ${typeFilter} ${dateFilter}
      ORDER BY v.date DESC, v.created_at DESC
      LIMIT 200`;

    return NextResponse.json({ invoices: rows });
  } catch (err) {
    console.error('invoices GET error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
