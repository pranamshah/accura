import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRow } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const rows = await sql`
      SELECT l.*, g.name as group_name, g.nature as group_nature
      FROM ledgers l
      LEFT JOIN ledger_groups g ON l.group_id = g.id
      WHERE l.company_id = ${companyId} AND l.is_active = true
      ORDER BY l.name
    `;
    const ledgers = rows.map((r) => ({
      ...transformRow(r),
      group: { id: r.group_id, name: r.group_name, nature: r.group_nature },
    }));
    return NextResponse.json({ ledgers });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const [row] = await sql`
      INSERT INTO ledgers (
        company_id, group_id, name, alias,
        opening_balance, opening_balance_type,
        gstin, pan, mobile_no, email, address, city, state, state_code, pincode,
        credit_limit, credit_days,
        is_party, party_type, gst_type,
        tds_applicable, bank_name, bank_account, bank_ifsc
      ) VALUES (
        ${body.companyId}, ${body.groupId}, ${body.name}, ${body.alias ?? null},
        ${body.openingBalance ?? 0}, ${body.openingBalanceType ?? 'DEBIT'},
        ${body.gstin ?? null}, ${body.pan ?? null}, ${body.mobileNo ?? null},
        ${body.email ?? null}, ${body.address ?? null}, ${body.city ?? null},
        ${body.state ?? null}, ${body.stateCode ?? null}, ${body.pincode ?? null},
        ${body.creditLimit ? parseFloat(body.creditLimit) : null},
        ${body.creditDays ? parseInt(body.creditDays) : null},
        ${body.isParty ?? false}, ${body.partyType ?? null}, ${body.gstType ?? 'REGULAR'},
        ${body.tdsApplicable ?? false}, ${body.bankName ?? null}, ${body.bankAccount ?? null}, ${body.bankIfsc ?? null}
      )
      RETURNING *
    `;
    // Fetch group info so the returned ledger has group.name for bill-wise detection
    const [grp] = await sql`SELECT id, name, nature FROM ledger_groups WHERE id = ${row.group_id} LIMIT 1`;
    const ledger = {
      ...transformRow(row),
      group: grp ? { id: grp.id, name: grp.name, nature: grp.nature } : undefined,
    };
    return NextResponse.json({ ledger }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
