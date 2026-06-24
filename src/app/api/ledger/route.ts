import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { transformRow, transformRows } from '@/lib/db/transform';
import { z } from 'zod';
import type { Ledger } from '@/types';

const ledgerSchema = z.object({
  companyId: z.string(),
  groupId: z.string(),
  name: z.string().min(1),
  alias: z.string().optional(),
  openingBalance: z.number().default(0),
  openingBalanceType: z.enum(['DEBIT', 'CREDIT']).default('DEBIT'),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  mobileNo: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  creditLimit: z.number().optional(),
  creditDays: z.number().optional(),
  isParty: z.boolean().default(false),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).optional(),
  gstType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'CONSUMER', 'OVERSEAS', 'SEZ']).optional(),
  tdsApplicable: z.boolean().default(false),
  tdsSectionId: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const search = searchParams.get('search') || '';
  const groupId = searchParams.get('groupId');
  const isParty = searchParams.get('isParty');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const ledgers = await sql`
    SELECT l.*, lg.name as group_name, lg.nature as group_nature
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.company_id = ${companyId}
      AND l.is_active = true
      ${search ? sql`AND l.name ILIKE ${'%' + search + '%'}` : sql``}
      ${groupId ? sql`AND l.group_id = ${groupId}` : sql``}
      ${isParty !== null ? sql`AND l.is_party = ${isParty === 'true'}` : sql``}
    ORDER BY l.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRows = await sql`
    SELECT COUNT(*) FROM ledgers l
    WHERE l.company_id = ${companyId} AND l.is_active = true
      ${search ? sql`AND l.name ILIKE ${'%' + search + '%'}` : sql``}
      ${groupId ? sql`AND l.group_id = ${groupId}` : sql``}
      ${isParty !== null ? sql`AND l.is_party = ${isParty === 'true'}` : sql``}
  `;

  const withGroup = (ledgers as Record<string, unknown>[]).map((l) => ({
    ...transformRow<Ledger>(l),
    group: { id: l.group_id, name: l.group_name, nature: l.group_nature },
  }));

  return NextResponse.json({ ledgers: withGroup, total: Number((countRows[0] as { count: string }).count) });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = ledgerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const rows = await sql`
    INSERT INTO ledgers (id, company_id, group_id, name, alias, opening_balance, opening_balance_type,
      gstin, pan, mobile_no, email, address, city, state, state_code, pincode,
      credit_limit, credit_days, is_party, party_type, gst_type, tds_applicable, tds_section_id,
      bank_name, bank_account, bank_ifsc)
    VALUES (gen_random_uuid()::text, ${d.companyId}, ${d.groupId}, ${d.name}, ${d.alias ?? null},
      ${d.openingBalance}, ${d.openingBalanceType}, ${d.gstin ?? null}, ${d.pan ?? null},
      ${d.mobileNo ?? null}, ${d.email ?? null}, ${d.address ?? null}, ${d.city ?? null},
      ${d.state ?? null}, ${d.stateCode ?? null}, ${d.pincode ?? null},
      ${d.creditLimit ?? null}, ${d.creditDays ?? null}, ${d.isParty}, ${d.partyType ?? null},
      ${d.gstType ?? null}, ${d.tdsApplicable}, ${d.tdsSectionId ?? null},
      ${d.bankName ?? null}, ${d.bankAccount ?? null}, ${d.bankIfsc ?? null})
    RETURNING *
  `;
  const ledger = rows[0];

  const grpRows = await sql`SELECT id, name, nature FROM ledger_groups WHERE id = ${d.groupId} LIMIT 1`;
  const group = grpRows[0];

  await sql`
    INSERT INTO audit_logs (id, user_id, company_id, action, entity, entity_id, new_data)
    VALUES (gen_random_uuid()::text, ${'owner'}, ${d.companyId}, 'CREATE', 'Ledger', ${(ledger as { id: string }).id}, ${JSON.stringify(d)})
  `;

  return NextResponse.json({ ledger: { ...transformRow<Ledger>(ledger as Record<string, unknown>), group } }, { status: 201 });
}
