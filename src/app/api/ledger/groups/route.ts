import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';

const groupSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  alias: z.string().optional(),
  parentId: z.string().optional(),
  nature: z.enum(['ASSETS', 'LIABILITIES', 'INCOME', 'EXPENSES']),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const groups = await sql`
    SELECT lg.*, 
      json_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name)) FILTER (WHERE l.id IS NOT NULL) as ledgers
    FROM ledger_groups lg
    LEFT JOIN ledgers l ON l.group_id = lg.id AND l.is_active = true
    WHERE lg.company_id = ${companyId}
    GROUP BY lg.id
    ORDER BY lg.name ASC
  `;

  const rootGroups = groups.filter((g) => !(g as { parent_id: string | null }).parent_id);

  return NextResponse.json({ groups, rootGroups });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const rows = await sql`
    INSERT INTO ledger_groups (id, company_id, name, alias, parent_id, nature)
    VALUES (gen_random_uuid()::text, ${d.companyId}, ${d.name}, ${d.alias ?? null}, ${d.parentId ?? null}, ${d.nature})
    RETURNING *
  `;

  return NextResponse.json({ group: rows[0] }, { status: 201 });
}
