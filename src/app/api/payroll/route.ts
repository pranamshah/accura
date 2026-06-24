import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRows, transformRow } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const rows = await sql`
      SELECT pe.*, e.name as employee_name, e.designation
      FROM payroll_entries pe
      JOIN employees e ON pe.employee_id = e.id
      WHERE pe.company_id = ${companyId}
        ${month ? sql`AND pe.month = ${parseInt(month)}` : sql``}
        ${year ? sql`AND pe.year = ${parseInt(year)}` : sql``}
      ORDER BY e.name
    `;
    return NextResponse.json({ entries: transformRows(rows) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { companyId, month, year } = body;
    if (!companyId || !month || !year) return NextResponse.json({ error: 'companyId, month, year required' }, { status: 400 });

    const employees = await sql`SELECT * FROM employees WHERE company_id = ${companyId} AND is_active = true`;
    const results = [];

    for (const emp of employees) {
      const gross = parseFloat(emp.basic_salary) + parseFloat(emp.hra) + parseFloat(emp.conveyance) + parseFloat(emp.special);
      const pfEmp = emp.pf_applicable ? Math.min(gross * 0.12, 1800) : 0;
      const esiEmp = emp.esi_applicable && gross <= 21000 ? gross * 0.0075 : 0;
      const pfEmpR = emp.pf_applicable ? Math.min(gross * 0.12, 1800) : 0;
      const esiEmpR = emp.esi_applicable && gross <= 21000 ? gross * 0.0325 : 0;
      const net = gross - pfEmp - esiEmp;

      const [row] = await sql`
        INSERT INTO payroll_entries (employee_id, company_id, month, year, working_days, present_days, basic, hra, conveyance, special, other_earnings, gross_salary, pf_employee, esi_employee, tds, other_deductions, net_salary, pf_employer, esi_employer)
        VALUES (${emp.id}, ${companyId}, ${month}, ${year}, 26, 26, ${emp.basic_salary}, ${emp.hra}, ${emp.conveyance}, ${emp.special}, 0, ${gross}, ${pfEmp}, ${esiEmp}, 0, 0, ${net}, ${pfEmpR}, ${esiEmpR})
        ON CONFLICT (employee_id, month, year) DO UPDATE SET gross_salary = EXCLUDED.gross_salary, net_salary = EXCLUDED.net_salary
        RETURNING *
      `;
      results.push(transformRow(row));
    }

    return NextResponse.json({ entries: results, count: results.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
