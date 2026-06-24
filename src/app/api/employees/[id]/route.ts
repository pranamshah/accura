import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRow } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [row] = await sql`SELECT * FROM employees WHERE id = ${id}`;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ employee: transformRow(row) });
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
      UPDATE employees SET
        name = COALESCE(${body.name ?? null}, name),
        designation = COALESCE(${body.designation ?? null}, designation),
        basic_salary = COALESCE(${body.basicSalary ?? null}, basic_salary),
        hra = COALESCE(${body.hra ?? null}, hra),
        is_active = COALESCE(${body.isActive ?? null}, is_active)
      WHERE id = ${id} RETURNING *
    `;
    return NextResponse.json({ employee: transformRow(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
