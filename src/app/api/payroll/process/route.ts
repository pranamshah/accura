import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json() as { companyId: string; month: number; year: number; employeeIds?: string[] };
  const { companyId, month, year, employeeIds } = body;

  const employees = await sql`
    SELECT * FROM employees
    WHERE company_id = ${companyId} AND is_active = true
      ${employeeIds ? sql`AND id = ANY(${employeeIds})` : sql``}
  `;

  const entries = [];
  for (const emp of employees as { id: string; basic_salary: number; hra: number; conveyance: number; special: number; pf_applicable: boolean; esi_applicable: boolean }[]) {
    const existing = await sql`SELECT id FROM payroll_entries WHERE employee_id = ${emp.id} AND month = ${month} AND year = ${year} LIMIT 1`;
    if (existing.length > 0) {
      entries.push(existing[0]);
      continue;
    }

    const gross = emp.basic_salary + emp.hra + emp.conveyance + emp.special;
    const pfEmployee = emp.pf_applicable ? Math.min(emp.basic_salary * 0.12, 1800) : 0;
    const esiEmployee = emp.esi_applicable && gross <= 21000 ? gross * 0.0075 : 0;
    const pfEmployer = emp.pf_applicable ? Math.min(emp.basic_salary * 0.12, 1800) : 0;
    const esiEmployer = emp.esi_applicable && gross <= 21000 ? gross * 0.0325 : 0;
    const netSalary = gross - pfEmployee - esiEmployee;

    const rows = await sql`
      INSERT INTO payroll_entries (id, employee_id, month, year, working_days, present_days,
        basic, hra, conveyance, special, other_earnings, gross_salary,
        pf_employee, esi_employee, tds, other_deductions, net_salary, pf_employer, esi_employer)
      VALUES (gen_random_uuid()::text, ${emp.id}, ${month}, ${year}, 26, 26,
        ${emp.basic_salary}, ${emp.hra}, ${emp.conveyance}, ${emp.special}, 0, ${gross},
        ${pfEmployee}, ${esiEmployee}, 0, 0, ${netSalary}, ${pfEmployer}, ${esiEmployer})
      RETURNING *
    `;
    entries.push(rows[0]);
  }

  return NextResponse.json({ entries, processed: entries.length });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const entries = await sql`
    SELECT pe.*, e.name as employee_name, e.designation, e.department
    FROM payroll_entries pe
    JOIN employees e ON pe.employee_id = e.id
    WHERE e.company_id = ${companyId}
      ${month ? sql`AND pe.month = ${parseInt(month)}` : sql``}
      ${year ? sql`AND pe.year = ${parseInt(year)}` : sql``}
    ORDER BY pe.created_at DESC
  `;

  return NextResponse.json({
    entries: (entries as { employee_name: string; designation: string; department: string }[]).map((e) => ({
      ...e,
      employee: { name: e.employee_name, designation: e.designation, department: e.department },
    })),
  });
}
