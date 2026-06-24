import { NextRequest, NextResponse } from 'next/server';
import { generateNarration } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    entries: Array<{ ledgerName: string; type: string; amount: number }>;
    voucherType: string;
  };
  const { entries, voucherType } = body;

  const narration = await generateNarration(entries, voucherType);
  return NextResponse.json({ narration });
}
