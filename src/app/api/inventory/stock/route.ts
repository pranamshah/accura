import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const stock = await sql`
    SELECT i.id, i.name, i.code, i.hsn_code, i.category, i.opening_stock, i.opening_rate, i.reorder_level,
      u.symbol as unit,
      COALESCE(pu.qty, 0) as in_qty, COALESCE(pu.amt, 0) as in_amt,
      COALESCE(so.qty, 0) as out_qty, COALESCE(so.amt, 0) as out_amt
    FROM items i
    LEFT JOIN units u ON i.unit_id = u.id
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as qty, SUM(il.amount) as amt FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'PURCHASE' AND v.status = 'ACTIVE' AND v.company_id = ${companyId}
      GROUP BY il.item_id
    ) pu ON pu.item_id = i.id
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as qty, SUM(il.amount) as amt FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'SALES' AND v.status = 'ACTIVE' AND v.company_id = ${companyId}
      GROUP BY il.item_id
    ) so ON so.item_id = i.id
    WHERE i.company_id = ${companyId} AND i.is_active = true
    ORDER BY i.name ASC
  `;

  const result = (stock as {
    opening_stock: number; opening_rate: number; in_qty: number; in_amt: number;
    out_qty: number; out_amt: number; reorder_level: number | null;
  }[]).map((item) => {
    const currentQty = item.opening_stock + item.in_qty - item.out_qty;
    const currentValue = (item.opening_stock * item.opening_rate) + item.in_amt - item.out_amt;
    return {
      ...item,
      inQty: item.in_qty,
      outQty: item.out_qty,
      currentQty,
      currentValue,
      avgRate: currentQty > 0 ? currentValue / currentQty : 0,
      isLow: item.reorder_level !== null && currentQty <= item.reorder_level,
    };
  });

  return NextResponse.json({ stock: result, total: result.length });
}
