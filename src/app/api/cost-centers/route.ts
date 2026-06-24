import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  try {
    const rows = await sql`SELECT * FROM cost_centers WHERE company_id = ${companyId} ORDER BY name`;
    return NextResponse.json({ centers: rows.map((r) => ({ id: r.id, name: r.name, alias: r.alias, description: r.description })) });
  } catch {
    return NextResponse.json({ centers: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { companyId: string; name: string; alias?: string; description?: string };
  if (!body.companyId || !body.name) return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });

  try {
    const rows = await sql`
      INSERT INTO cost_centers (id, company_id, name, alias, description)
      VALUES (gen_random_uuid()::text, ${body.companyId}, ${body.name}, ${body.alias ?? null}, ${body.description ?? null})
      RETURNING *
    `;
    return NextResponse.json({ center: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create cost center' }, { status: 500 });
  }
}
