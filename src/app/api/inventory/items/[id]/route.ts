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
    const [row] = await sql`
      UPDATE items SET
        name = COALESCE(${body.name ?? null}, name),
        hsn_code = COALESCE(${body.hsnCode ?? null}, hsn_code),
        igst_rate = COALESCE(${body.igstRate ?? null}, igst_rate),
        cgst_rate = COALESCE(${body.cgstRate ?? null}, cgst_rate),
        sgst_rate = COALESCE(${body.sgstRate ?? null}, sgst_rate),
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
