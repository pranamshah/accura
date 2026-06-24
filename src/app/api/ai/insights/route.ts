import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getReportInsights } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { reportData: Record<string, unknown>; reportType: string };
  const { reportData, reportType } = body;

  const insights = await getReportInsights(reportData, reportType);
  return NextResponse.json({ insights });
}
