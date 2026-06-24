import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const groups = await sql`
    SELECT pg.*, json_agg(e.*) FILTER (WHERE e.id IS NOT NULL AND e.is_active = true) as employees
    FROM payroll_groups pg
    LEFT JOIN employees e ON e.group_id = pg.id AND e.is_active = true
    WHERE pg.company_id = ${companyId}
    GROUP BY pg.id
  `;

  const totalEmpRows = await sql`SELECT COUNT(*) FROM employees WHERE company_id = ${companyId} AND is_active = true`;
  const totalEmployees = Number((totalEmpRows[0] as { count: string }).count);

  const pendingRows = await sql`
    SELECT COALESCE(SUM(pe.net_salary), 0) as total
    FROM payroll_entries pe
    JOIN employees e ON pe.employee_id = e.id
    WHERE e.company_id = ${companyId} AND pe.is_paid = false
  `;
  const pendingPayroll = Number((pendingRows[0] as { total: string }).total);

  return NextResponse.json({ groups, totalEmployees, pendingPayroll });
}
