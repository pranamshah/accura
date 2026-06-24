import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const rows = await sql`
      SELECT i.id, i.name, i.opening_stock,
        COALESCE(SUM(CASE WHEN v.type IN ('PURCHASE','GOODS_RECEIPT','OPENING_BALANCE') THEN il.quantity ELSE 0 END), 0) as inward,
        COALESCE(SUM(CASE WHEN v.type IN ('SALES','DELIVERY_NOTE') THEN il.quantity ELSE 0 END), 0) as outward
      FROM items i
      LEFT JOIN inventory_lines il ON il.item_id = i.id
      LEFT JOIN vouchers v ON v.id = il.voucher_id AND v.status = 'ACTIVE'
      WHERE i.company_id = ${companyId} AND i.is_active = true
      GROUP BY i.id
    `;
    const stock = rows.map((r) => ({
      itemId: r.id,
      itemName: r.name,
      closingQty: parseFloat(r.opening_stock) + parseFloat(r.inward) - parseFloat(r.outward),
    }));
    return NextResponse.json({ stock });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
