import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRow, transformRows } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [voucher] = await sql`SELECT * FROM vouchers WHERE id = ${id}`;
    if (!voucher) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const entries = await sql`
      SELECT ve.*, l.name as ledger_name FROM voucher_entries ve
      LEFT JOIN ledgers l ON ve.ledger_id = l.id
      WHERE ve.voucher_id = ${id}
    `;
    const gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ${id}`;
    const inventoryLines = await sql`SELECT * FROM inventory_lines WHERE voucher_id = ${id}`;

    return NextResponse.json({
      voucher: {
        ...transformRow(voucher),
        entries: transformRows(entries),
        gstLines: transformRows(gstLines),
        inventoryLines: transformRows(inventoryLines),
      }
    });
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
      UPDATE vouchers SET
        date = COALESCE(${body.date ?? null}, date),
        narration = COALESCE(${body.narration ?? null}, narration),
        reference = COALESCE(${body.reference ?? null}, reference),
        total_amount = COALESCE(${body.totalAmount ?? null}, total_amount),
        status = COALESCE(${body.status ?? null}, status),
        updated_at = NOW()
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json({ voucher: transformRow(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const vouchers = await sql`SELECT id FROM vouchers WHERE id = ${id}`;
    if (!vouchers.length) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    await sql`DELETE FROM voucher_entries WHERE voucher_id = ${id}`;
    await sql`DELETE FROM gst_lines WHERE voucher_id = ${id}`;
    await sql`DELETE FROM inventory_lines WHERE voucher_id = ${id}`;
    await sql`DELETE FROM vouchers WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
