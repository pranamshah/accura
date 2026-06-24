import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const employeeSchema = z.object({
  companyId: z.string(),
  groupId: z.string().optional(),
  code: z.string().optional(),
  name: z.string().min(1),
  designation: z.string().optional(),
  department: z.string().optional(),
  dateOfJoining: z.string().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  uan: z.string().optional(),
  esicNo: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  basicSalary: z.number().default(0),
  hra: z.number().default(0),
  conveyance: z.number().default(0),
  special: z.number().default(0),
  pfApplicable: z.boolean().default(false),
  esiApplicable: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const employees = await sql`
    SELECT e.*, pg.name as group_name
    FROM employees e
    LEFT JOIN payroll_groups pg ON e.group_id = pg.id
    WHERE e.company_id = ${companyId} AND e.is_active = true
    ORDER BY e.name ASC
  `;

  return NextResponse.json({
    employees: (employees as { group_id: string | null; group_name: string }[]).map((e) => ({
      ...e,
      group: e.group_id ? { id: e.group_id, name: e.group_name } : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const rows = await sql`
    INSERT INTO employees (id, company_id, group_id, code, name, designation, department,
      date_of_joining, pan, aadhaar, uan, esic_no, bank_account, bank_ifsc,
      basic_salary, hra, conveyance, special, pf_applicable, esi_applicable)
    VALUES (gen_random_uuid()::text, ${d.companyId}, ${d.groupId ?? null}, ${d.code ?? null}, ${d.name},
      ${d.designation ?? null}, ${d.department ?? null}, ${d.dateOfJoining ?? null},
      ${d.pan ?? null}, ${d.aadhaar ?? null}, ${d.uan ?? null}, ${d.esicNo ?? null},
      ${d.bankAccount ?? null}, ${d.bankIfsc ?? null},
      ${d.basicSalary}, ${d.hra}, ${d.conveyance}, ${d.special}, ${d.pfApplicable}, ${d.esiApplicable})
    RETURNING *
  `;
  const emp = rows[0] as { group_id: string | null };
  let group = null;
  if (emp.group_id) {
    const grpRows = await sql`SELECT * FROM payroll_groups WHERE id = ${emp.group_id} LIMIT 1`;
    group = grpRows[0];
  }
  return NextResponse.json({ employee: { ...emp, group } }, { status: 201 });
}
