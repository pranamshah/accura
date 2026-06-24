import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const entity = searchParams.get('entity');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const logs = await sql`
    SELECT al.*, u.name as user_name, u.email as user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.company_id = ${companyId}
      ${entity ? sql`AND al.entity = ${entity}` : sql``}
    ORDER BY al.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRows = await sql`
    SELECT COUNT(*) FROM audit_logs
    WHERE company_id = ${companyId}
      ${entity ? sql`AND entity = ${entity}` : sql``}
  `;

  return NextResponse.json({
    logs: (logs as { user_name: string | null; user_email: string | null }[]).map((l) => ({
      ...l,
      user: l.user_name ? { name: l.user_name, email: l.user_email } : null,
    })),
    total: Number((countRows[0] as { count: string }).count),
  });
}
