import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const categoryFilter = searchParams.get('categoryFilter');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const rows = await sql`
    SELECT
      i.id,
      i.name,
      i.code,
      i.hsn_code as "hsnCode",
      i.category,
      u.symbol as "unitSymbol",
      COALESCE(i.opening_stock, 0) as "openingStock",
      COALESCE(i.opening_rate, 0) as "openingRate",
      i.reorder_level as "reorderLevel",
      COALESCE(pur.purchased_qty, 0) as "purchasedQty",
      COALESCE(sol.sold_qty, 0) as "soldQty"
    FROM items i
    LEFT JOIN units u ON i.unit_id = u.id
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as purchased_qty
      FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id
      WHERE v.company_id = ${companyId}
        AND v.status = 'ACTIVE'
        AND v.type IN ('PURCHASE', 'GOODS_RECEIPT')
      GROUP BY il.item_id
    ) pur ON pur.item_id = i.id
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as sold_qty
      FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id
      WHERE v.company_id = ${companyId}
        AND v.status = 'ACTIVE'
        AND v.type IN ('SALES', 'DELIVERY_NOTE')
      GROUP BY il.item_id
    ) sol ON sol.item_id = i.id
    WHERE i.company_id = ${companyId}
      AND i.is_active = true
      ${categoryFilter && categoryFilter !== 'All' ? sql`AND i.category = ${categoryFilter}` : sql``}
    ORDER BY i.name ASC
  `;

  const items = (rows as {
    id: string;
    name: string;
    code: string | null;
    hsnCode: string | null;
    category: string | null;
    unitSymbol: string | null;
    openingStock: number;
    openingRate: number;
    reorderLevel: number | null;
    purchasedQty: number;
    soldQty: number;
  }[]).map((row) => {
    const currentStock = row.openingStock + row.purchasedQty - row.soldQty;
    const currentValue = currentStock * row.openingRate;
    const isLow = row.reorderLevel !== null && currentStock <= row.reorderLevel;
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      hsnCode: row.hsnCode,
      category: row.category,
      unitSymbol: row.unitSymbol,
      openingStock: row.openingStock,
      openingRate: row.openingRate,
      reorderLevel: row.reorderLevel,
      purchasedQty: row.purchasedQty,
      soldQty: row.soldQty,
      currentStock,
      currentValue,
      isLow,
    };
  });

  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + i.currentValue, 0);
  const lowStockCount = items.filter((i) => i.isLow).length;

  return NextResponse.json({ items, totalItems, totalValue, lowStockCount });
}
