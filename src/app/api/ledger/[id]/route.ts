import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRow } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const rows = await sql`
      SELECT l.*, g.name as group_name, g.nature as group_nature
      FROM ledgers l
      LEFT JOIN ledger_groups g ON l.group_id = g.id
      WHERE l.id = ${id}
    `;
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const r = rows[0];
    const transformed = transformRow(r) as Record<string, unknown>;
    return NextResponse.json({ ledger: { ...transformed, group: { id: r.group_id, name: r.group_name, nature: r.group_nature } } });
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
      UPDATE ledgers SET
        name = COALESCE(${body.name ?? null}, name),
        alias = COALESCE(${body.alias ?? null}, alias),
        group_id = COALESCE(${body.groupId ?? null}, group_id),
        opening_balance = COALESCE(${body.openingBalance ?? null}, opening_balance),
        opening_balance_type = COALESCE(${body.openingBalanceType ?? null}, opening_balance_type),
        gstin = COALESCE(${body.gstin ?? null}, gstin),
        pan = COALESCE(${body.pan ?? null}, pan),
        mobile_no = COALESCE(${body.mobileNo ?? null}, mobile_no),
        email = COALESCE(${body.email ?? null}, email),
        address = COALESCE(${body.address ?? null}, address),
        city = COALESCE(${body.city ?? null}, city),
        state = COALESCE(${body.state ?? null}, state),
        is_party = COALESCE(${body.isParty ?? null}, is_party),
        party_type = COALESCE(${body.partyType ?? null}, party_type),
        gst_type = COALESCE(${body.gstType ?? null}, gst_type),
        is_active = COALESCE(${body.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ ledger: transformRow(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const check = await sql`
      SELECT COUNT(*) as entry_count, COUNT(DISTINCT voucher_id) as voucher_count
      FROM voucher_entries WHERE ledger_id = ${id}
    `;
    const entryCount = parseInt(check[0].entry_count);
    if (entryCount > 0) {
      return NextResponse.json({
        error: `Cannot delete ledger. It has ${entryCount} voucher entries across ${check[0].voucher_count} vouchers. Delete those vouchers first or use Alter to rename it.`,
        entryCount,
        voucherCount: parseInt(check[0].voucher_count),
      }, { status: 409 });
    }
    await sql`DELETE FROM ledgers WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
