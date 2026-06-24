import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  try {
    const rows = await sql`
      SELECT * FROM pay_heads WHERE company_id = ${companyId} ORDER BY type, name
    `;
    return NextResponse.json({
      payHeads: rows.map((r) => ({
        id: r.id, name: r.name,
        type: r.type, calculationType: r.calculation_type,
        value: Number(r.value), isTaxable: r.is_taxable, isActive: r.is_active,
      })),
    });
  } catch {
    return NextResponse.json({ payHeads: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    companyId: string; name: string; type: string;
    calculationType: string; value: number; isTaxable: boolean;
  };
  if (!body.companyId || !body.name) return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });

  try {
    const rows = await sql`
      INSERT INTO pay_heads (id, company_id, name, type, calculation_type, value, is_taxable)
      VALUES (gen_random_uuid()::text, ${body.companyId}, ${body.name}, ${body.type},
              ${body.calculationType}, ${body.value}, ${body.isTaxable ?? false})
      RETURNING *
    `;
    return NextResponse.json({ payHead: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create pay head' }, { status: 500 });
  }
}
