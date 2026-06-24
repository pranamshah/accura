import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRows } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await sql`
      SELECT * FROM companies
      WHERE id IN (SELECT company_id FROM users WHERE id = ${session.id})
      OR id = ${session.companyId ?? ''}
      ORDER BY name
    `;
    return NextResponse.json({ companies: transformRows(rows) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const [company] = await sql`
      INSERT INTO companies (name, legal_name, gstin, pan, address, city, state, pincode, phone, email)
      VALUES (${body.name}, ${body.legalName ?? null}, ${body.gstin ?? null}, ${body.pan ?? null},
              ${body.address ?? null}, ${body.city ?? null}, ${body.state ?? null}, ${body.pincode ?? null},
              ${body.phone ?? null}, ${body.email ?? null})
      RETURNING *
    `;
    return NextResponse.json({ company });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
