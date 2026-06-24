import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';

const itemSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  alias: z.string().optional(),
  code: z.string().optional(),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
  unitId: z.string().optional(),
  category: z.string().optional(),
  igstRate: z.number().default(0),
  cgstRate: z.number().default(0),
  sgstRate: z.number().default(0),
  cessRate: z.number().default(0),
  openingStock: z.number().default(0),
  openingRate: z.number().default(0),
  reorderLevel: z.number().optional(),
  maxStock: z.number().optional(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const search = searchParams.get('search') || '';

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const items = await sql`
    SELECT i.*, u.name as unit_name, u.symbol as unit_symbol,
      COALESCE(pu.qty, 0) as purchased_qty, COALESCE(so.qty, 0) as sold_qty
    FROM items i
    LEFT JOIN units u ON i.unit_id = u.id
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as qty FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'PURCHASE' AND v.status = 'ACTIVE' GROUP BY il.item_id
    ) pu ON pu.item_id = i.id
    LEFT JOIN (
      SELECT il.item_id, SUM(il.quantity) as qty FROM inventory_lines il
      JOIN vouchers v ON il.voucher_id = v.id WHERE v.type = 'SALES' AND v.status = 'ACTIVE' GROUP BY il.item_id
    ) so ON so.item_id = i.id
    WHERE i.company_id = ${companyId} AND i.is_active = true
      ${search ? sql`AND i.name ILIKE ${'%' + search + '%'}` : sql``}
    ORDER BY i.name ASC
  `;

  const itemsWithStock = (items as { opening_stock: number; purchased_qty: number; sold_qty: number; unit_name: string; unit_symbol: string; unit_id: string }[]).map((item) => ({
    ...item,
    currentStock: item.opening_stock + item.purchased_qty - item.sold_qty,
    unit: item.unit_id ? { id: item.unit_id, name: item.unit_name, symbol: item.unit_symbol } : null,
  }));

  return NextResponse.json({ items: itemsWithStock, total: items.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const rows = await sql`
    INSERT INTO items (id, company_id, name, alias, code, hsn_code, sac_code, unit_id, category,
      igst_rate, cgst_rate, sgst_rate, cess_rate, opening_stock, opening_rate, reorder_level, max_stock, description)
    VALUES (gen_random_uuid()::text, ${d.companyId}, ${d.name}, ${d.alias ?? null}, ${d.code ?? null},
      ${d.hsnCode ?? null}, ${d.sacCode ?? null}, ${d.unitId ?? null}, ${d.category ?? null},
      ${d.igstRate}, ${d.cgstRate}, ${d.sgstRate}, ${d.cessRate},
      ${d.openingStock}, ${d.openingRate}, ${d.reorderLevel ?? null}, ${d.maxStock ?? null}, ${d.description ?? null})
    RETURNING *
  `;

  const item = rows[0] as { unit_id: string | null };
  let unit = null;
  if (item.unit_id) {
    const unitRows = await sql`SELECT * FROM units WHERE id = ${item.unit_id} LIMIT 1`;
    unit = unitRows[0];
  }

  return NextResponse.json({ item: { ...item, unit } }, { status: 201 });
}
