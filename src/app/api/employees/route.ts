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
    const rows = await sql`SELECT * FROM employees WHERE company_id = ${companyId} AND is_active = true ORDER BY name`;
    return NextResponse.json({ employees: transformRows(rows) });
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
      INSERT INTO employees (
        company_id, code, name, designation, department,
        date_of_joining, pan, aadhaar, uan, esic_no,
        bank_account, bank_ifsc, bank_name,
        basic_salary, hra, conveyance, special,
        pf_applicable, esi_applicable
      ) VALUES (
        ${body.companyId}, ${body.code ?? null}, ${body.name}, ${body.designation ?? null}, ${body.department ?? null},
        ${body.dateOfJoining ?? null}, ${body.pan ?? null}, ${body.aadhaar ?? null}, ${body.uan ?? null}, ${body.esicNo ?? null},
        ${body.bankAccount ?? null}, ${body.bankIfsc ?? null}, ${body.bankName ?? null},
        ${body.basicSalary ?? 0}, ${body.hra ?? 0}, ${body.conveyance ?? 0}, ${body.special ?? 0},
        ${body.pfApplicable ?? true}, ${body.esiApplicable ?? true}
      )
      RETURNING *
    `;
    return NextResponse.json({ employee: transformRow(row) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
