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
      SELECT
        i.id as item_id, i.name as item_name,
        COALESCE(i.group_name, i.category, 'Primary') as group_name,
        COALESCE(i.unit, 'Nos') as unit,
        i.opening_stock, i.opening_rate,
        COALESCE(SUM(CASE WHEN v.type IN ('PURCHASE','GOODS_RECEIPT','OPENING_BALANCE') THEN il.quantity ELSE 0 END), 0) as inward_qty,
        COALESCE(SUM(CASE WHEN v.type IN ('SALES','DELIVERY_NOTE') THEN il.quantity ELSE 0 END), 0) as outward_qty
      FROM items i
      LEFT JOIN inventory_lines il ON il.item_id = i.id
      LEFT JOIN vouchers v ON v.id = il.voucher_id AND v.status != 'CANCELLED'
      WHERE i.company_id = ${companyId} AND i.is_active = true
      GROUP BY i.id, i.name, i.group_name, i.category, i.unit, i.opening_stock, i.opening_rate
      ORDER BY i.name
    `;

    const result = rows.map((r) => {
      const closingQty = parseFloat(r.opening_stock) + parseFloat(r.inward_qty) - parseFloat(r.outward_qty);
      const rate = parseFloat(r.opening_rate);
      return {
        itemId: r.item_id,
        itemName: r.item_name,
        groupName: r.group_name,
        unit: r.unit,
        openingQty: parseFloat(r.opening_stock),
        openingValue: parseFloat(r.opening_stock) * rate,
        inwardQty: parseFloat(r.inward_qty),
        outwardQty: parseFloat(r.outward_qty),
        closingQty,
        closingValue: closingQty * rate,
        rate,
      };
    });

    return NextResponse.json({ rows: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
