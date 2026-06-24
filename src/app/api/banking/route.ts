import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';

const bankAccountSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  accountNo: z.string().min(1),
  bankName: z.string().min(1),
  ifsc: z.string().optional(),
  branch: z.string().optional(),
  openingBalance: z.number().default(0),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const accounts = await sql`
    SELECT ba.*,
      json_agg(br.*) FILTER (WHERE br.id IS NOT NULL AND br.is_reconciled = false) as reconciliations
    FROM bank_accounts ba
    LEFT JOIN bank_reconciliations br ON br.bank_account_id = ba.id AND br.is_reconciled = false
    WHERE ba.company_id = ${companyId}
    GROUP BY ba.id
    ORDER BY ba.created_at DESC
  `;

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = bankAccountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const rows = await sql`
    INSERT INTO bank_accounts (id, company_id, name, account_no, bank_name, ifsc, branch, opening_balance)
    VALUES (gen_random_uuid()::text, ${d.companyId}, ${d.name}, ${d.accountNo}, ${d.bankName},
      ${d.ifsc ?? null}, ${d.branch ?? null}, ${d.openingBalance})
    RETURNING *
  `;

  return NextResponse.json({ account: rows[0] }, { status: 201 });
}
