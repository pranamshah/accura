import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateNarration } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    entries: Array<{ ledgerName: string; type: string; amount: number }>;
    voucherType: string;
  };
  const { entries, voucherType } = body;

  const narration = await generateNarration(entries, voucherType);
  return NextResponse.json({ narration });
}
