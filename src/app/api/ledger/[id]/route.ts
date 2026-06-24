import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rows = await sql`
    SELECT l.*, lg.name as group_name, lg.nature as group_nature
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ledger = { ...rows[0], group: { id: rows[0].group_id, name: rows[0].group_name, nature: rows[0].group_nature } };

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const includeStatement = searchParams.get('statement') === 'true';

  if (includeStatement) {
    const entries = await sql`
      SELECT ve.*, v.date, v.type, v.number, v.narration as voucher_narration, v.status
      FROM voucher_entries ve
      JOIN vouchers v ON ve.voucher_id = v.id
      WHERE ve.ledger_id = ${id}
        AND v.status = 'ACTIVE'
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
      ORDER BY v.date ASC
    `;
    return NextResponse.json({ ledger, entries });
  }

  return NextResponse.json({ ledger });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const oldRows = await sql`SELECT * FROM ledgers WHERE id = ${id} LIMIT 1`;
  if (oldRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const old = oldRows[0] as Record<string, unknown>;

  const rows = await sql`
    UPDATE ledgers SET
      group_id = COALESCE(${body.groupId as string ?? null}, group_id),
      name = COALESCE(${body.name as string ?? null}, name),
      alias = COALESCE(${body.alias as string ?? null}, alias),
      opening_balance = COALESCE(${body.openingBalance as number ?? null}, opening_balance),
      opening_balance_type = COALESCE(${body.openingBalanceType as string ?? null}, opening_balance_type),
      gstin = COALESCE(${body.gstin as string ?? null}, gstin),
      pan = COALESCE(${body.pan as string ?? null}, pan),
      mobile_no = COALESCE(${body.mobileNo as string ?? null}, mobile_no),
      email = COALESCE(${body.email as string ?? null}, email),
      address = COALESCE(${body.address as string ?? null}, address),
      city = COALESCE(${body.city as string ?? null}, city),
      state = COALESCE(${body.state as string ?? null}, state),
      state_code = COALESCE(${body.stateCode as string ?? null}, state_code),
      pincode = COALESCE(${body.pincode as string ?? null}, pincode),
      credit_limit = COALESCE(${body.creditLimit as number ?? null}, credit_limit),
      credit_days = COALESCE(${body.creditDays as number ?? null}, credit_days),
      is_party = COALESCE(${body.isParty as boolean ?? null}, is_party),
      party_type = COALESCE(${body.partyType as string ?? null}, party_type),
      gst_type = COALESCE(${body.gstType as string ?? null}, gst_type),
      bank_name = COALESCE(${body.bankName as string ?? null}, bank_name),
      bank_account = COALESCE(${body.bankAccount as string ?? null}, bank_account),
      bank_ifsc = COALESCE(${body.bankIfsc as string ?? null}, bank_ifsc),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  const ledger = rows[0] as { company_id: string; group_id: string };

  const grpRows = await sql`SELECT id, name, nature FROM ledger_groups WHERE id = ${ledger.group_id} LIMIT 1`;

  await sql`
    INSERT INTO audit_logs (id, user_id, company_id, action, entity, entity_id, old_data, new_data)
    VALUES (gen_random_uuid()::text, ${'owner'}, ${ledger.company_id}, 'UPDATE', 'Ledger', ${id}, ${JSON.stringify(old)}, ${JSON.stringify(body)})
  `;

  return NextResponse.json({ ledger: { ...ledger, group: grpRows[0] } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rows = await sql`SELECT id, is_system FROM ledgers WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if ((rows[0] as { is_system: boolean }).is_system) return NextResponse.json({ error: 'Cannot delete system ledger' }, { status: 400 });

  await sql`UPDATE ledgers SET is_active = false WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}
