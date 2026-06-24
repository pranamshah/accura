import { NextRequest, NextResponse } from 'next/server';
import { getReportInsights } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const body = await req.json() as { reportData: Record<string, unknown>; reportType: string };
  const { reportData, reportType } = body;

  const insights = await getReportInsights(reportData, reportType);
  return NextResponse.json({ insights });
}
