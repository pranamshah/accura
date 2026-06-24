import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  try {
    const rows = await sql`
      SELECT sg.*, p.name as parent_name,
        COUNT(si.id)::int as item_count
      FROM stock_groups sg
      LEFT JOIN stock_groups p ON sg.parent_id = p.id
      LEFT JOIN stock_items si ON si.group_id = sg.id AND si.is_active = true
      WHERE sg.company_id = ${companyId}
      GROUP BY sg.id, p.name
      ORDER BY sg.name ASC
    `;
    return NextResponse.json({
      groups: rows.map((r) => ({
        id: r.id, name: r.name, alias: r.alias,
        parentId: r.parent_id, parentName: r.parent_name,
        itemCount: r.item_count,
      })),
    });
  } catch {
    return NextResponse.json({ groups: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { companyId: string; name: string; alias?: string; parentId?: string };
  if (!body.companyId || !body.name) return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });

  try {
    const rows = await sql`
      INSERT INTO stock_groups (id, company_id, name, alias, parent_id)
      VALUES (gen_random_uuid()::text, ${body.companyId}, ${body.name}, ${body.alias ?? null}, ${body.parentId ?? null})
      RETURNING *
    `;
    return NextResponse.json({ group: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create stock group' }, { status: 500 });
  }
}
