import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`SELECT e.*, pg.name as group_name FROM employees e LEFT JOIN payroll_groups pg ON e.group_id = pg.id WHERE e.id = ${id} LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const emp = rows[0] as { group_id: string | null; group_name: string };
  const payrollEntries = await sql`SELECT * FROM payroll_entries WHERE employee_id = ${id} ORDER BY created_at DESC LIMIT 12`;
  return NextResponse.json({ employee: { ...emp, group: emp.group_id ? { id: emp.group_id, name: emp.group_name } : null, payrollEntries } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const rows = await sql`
    UPDATE employees SET
      name = COALESCE(${body.name as string ?? null}, name),
      designation = COALESCE(${body.designation as string ?? null}, designation),
      department = COALESCE(${body.department as string ?? null}, department),
      basic_salary = COALESCE(${body.basicSalary as number ?? null}, basic_salary),
      hra = COALESCE(${body.hra as number ?? null}, hra),
      conveyance = COALESCE(${body.conveyance as number ?? null}, conveyance),
      special = COALESCE(${body.special as number ?? null}, special),
      pf_applicable = COALESCE(${body.pfApplicable as boolean ?? null}, pf_applicable),
      esi_applicable = COALESCE(${body.esiApplicable as boolean ?? null}, esi_applicable),
      date_of_joining = COALESCE(${body.dateOfJoining as string ?? null}, date_of_joining)
    WHERE id = ${id}
    RETURNING *
  `;
  const emp = rows[0] as { group_id: string | null };
  let group = null;
  if (emp.group_id) {
    const grpRows = await sql`SELECT * FROM payroll_groups WHERE id = ${emp.group_id} LIMIT 1`;
    group = grpRows[0];
  }
  return NextResponse.json({ employee: { ...emp, group } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`UPDATE employees SET is_active = false WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
