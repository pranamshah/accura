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
      SELECT * FROM items WHERE company_id = ${companyId} AND is_active = true ORDER BY name
    `;
    return NextResponse.json({ items: transformRows(rows) });
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
      INSERT INTO items (
        company_id, name, alias, code, hsn_code, sac_code, unit, category, group_name,
        igst_rate, cgst_rate, sgst_rate, cess_rate,
        opening_stock, opening_rate, reorder_level,
        cost_price, selling_price, description
      ) VALUES (
        ${body.companyId}, ${body.name}, ${body.alias ?? null}, ${body.code ?? null},
        ${body.hsnCode ?? null}, ${body.sacCode ?? null}, ${body.unit ?? 'Nos'}, ${body.category ?? null}, ${body.groupName ?? null},
        ${body.igstRate ?? 18}, ${body.cgstRate ?? 9}, ${body.sgstRate ?? 9}, ${body.cessRate ?? 0},
        ${body.openingStock ?? 0}, ${body.openingRate ?? 0}, ${body.reorderLevel ?? null},
        ${body.costPrice ?? null}, ${body.sellingPrice ?? null}, ${body.description ?? null}
      )
      RETURNING *
    `;
    return NextResponse.json({ item: transformRow(row) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
