import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`
    SELECT i.*, u.name as unit_name, u.symbol as unit_symbol
    FROM items i LEFT JOIN units u ON i.unit_id = u.id
    WHERE i.id = ${id} LIMIT 1
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const item = rows[0] as { unit_id: string | null; unit_name: string; unit_symbol: string };
  return NextResponse.json({ item: { ...item, unit: item.unit_id ? { name: item.unit_name, symbol: item.unit_symbol } : null } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const rows = await sql`
    UPDATE items SET
      name = COALESCE(${body.name as string ?? null}, name),
      alias = COALESCE(${body.alias as string ?? null}, alias),
      code = COALESCE(${body.code as string ?? null}, code),
      hsn_code = COALESCE(${body.hsnCode as string ?? null}, hsn_code),
      unit_id = COALESCE(${body.unitId as string ?? null}, unit_id),
      category = COALESCE(${body.category as string ?? null}, category),
      igst_rate = COALESCE(${body.igstRate as number ?? null}, igst_rate),
      cgst_rate = COALESCE(${body.cgstRate as number ?? null}, cgst_rate),
      sgst_rate = COALESCE(${body.sgstRate as number ?? null}, sgst_rate),
      reorder_level = COALESCE(${body.reorderLevel as number ?? null}, reorder_level),
      description = COALESCE(${body.description as string ?? null}, description),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  const item = rows[0] as { unit_id: string | null };
  let unit = null;
  if (item.unit_id) {
    const unitRows = await sql`SELECT * FROM units WHERE id = ${item.unit_id} LIMIT 1`;
    unit = unitRows[0];
  }
  return NextResponse.json({ item: { ...item, unit } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`UPDATE items SET is_active = false WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
