import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRow } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [row] = await sql`SELECT * FROM companies WHERE id = ${id}`;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ company: transformRow(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const [row] = await sql`
      UPDATE companies SET
        name = COALESCE(${body.name ?? null}, name),
        legal_name = COALESCE(${body.legalName ?? null}, legal_name),
        gstin = COALESCE(${body.gstin ?? null}, gstin),
        pan = COALESCE(${body.pan ?? null}, pan),
        tan = COALESCE(${body.tan ?? null}, tan),
        address = COALESCE(${body.address ?? null}, address),
        city = COALESCE(${body.city ?? null}, city),
        state = COALESCE(${body.state ?? null}, state),
        state_code = COALESCE(${body.stateCode ?? null}, state_code),
        pincode = COALESCE(${body.pincode ?? null}, pincode),
        phone = COALESCE(${body.phone ?? null}, phone),
        email = COALESCE(${body.email ?? null}, email),
        website = COALESCE(${body.website ?? null}, website),
        bank_name = COALESCE(${body.bankName ?? null}, bank_name),
        bank_account = COALESCE(${body.bankAccount ?? null}, bank_account),
        bank_ifsc = COALESCE(${body.bankIfsc ?? null}, bank_ifsc),
        bank_branch = COALESCE(${body.bankBranch ?? null}, bank_branch),
        financial_year_start = COALESCE(${body.financialYearStart ?? null}, financial_year_start),
        tax_registered = COALESCE(${body.taxRegistered ?? null}, tax_registered),
        features = CASE WHEN ${body.features !== undefined} THEN ${JSON.stringify(body.features ?? {})}::jsonb ELSE features END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ company: transformRow(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await sql`DELETE FROM companies WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
