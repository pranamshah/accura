import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRows, transformRow } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const rows = await sql`
      SELECT * FROM ledger_groups WHERE company_id = ${companyId} ORDER BY nature, name
    `;
    return NextResponse.json({ groups: transformRows(rows) });
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
      INSERT INTO ledger_groups (company_id, name, alias, parent_id, nature, is_system)
      VALUES (${body.companyId}, ${body.name}, ${body.alias ?? null}, ${body.parentId || null}, ${body.nature}, false)
      RETURNING *
    `;
    return NextResponse.json({ group: transformRow(row) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
