import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { detectAnomalies } from '@/lib/ai';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const vouchers = await sql`
    SELECT id, date, type, total_amount, number, narration
    FROM vouchers
    WHERE company_id = ${companyId} AND status = 'ACTIVE' AND date >= ${thirtyDaysAgo.toISOString()}
    ORDER BY date DESC
    LIMIT 100
  `;

  const anomalies = await detectAnomalies(vouchers as Array<{ date: string; type: string; totalAmount: number; number: string }>);
  return NextResponse.json({ anomalies });
}
