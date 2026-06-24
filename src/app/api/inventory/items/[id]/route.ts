import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRow } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [row] = await sql`SELECT * FROM items WHERE id = ${id}`;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item: transformRow(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const gstRate = body.gstRate ? parseFloat(body.gstRate) : null;
    const halfGst = gstRate ? gstRate / 2 : null;
    const [row] = await sql`
      UPDATE items SET
        name = COALESCE(${body.name ?? null}, name),
        code = COALESCE(${body.code ?? null}, code),
        hsn_code = COALESCE(${body.hsnCode ?? null}, hsn_code),
        unit = COALESCE(${body.unit ?? null}, unit),
        group_name = COALESCE(${body.groupName ?? null}, group_name),
        opening_stock = COALESCE(${body.openingQty != null ? parseFloat(body.openingQty) : null}, opening_stock),
        opening_rate = COALESCE(${body.openingRate != null ? parseFloat(body.openingRate) : null}, opening_rate),
        igst_rate = COALESCE(${gstRate}, igst_rate),
        cgst_rate = COALESCE(${halfGst}, cgst_rate),
        sgst_rate = COALESCE(${halfGst}, sgst_rate),
        description = COALESCE(${body.description ?? null}, description),
        is_active = COALESCE(${body.isActive ?? null}, is_active)
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json({ item: transformRow(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await sql`UPDATE items SET is_active = false WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
