import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { groqChat, GROQ_MODEL_FAST } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { voucherType, entries, amount } = await req.json();

    if (!process.env.GROQ_API_KEY) return NextResponse.json({ narration: 'Being paid/received' });

    const text = await groqChat(
      [
        { role: 'system', content: 'You are an expert Indian accountant. Generate a short professional narration for accounting vouchers in the Indian style. Provide only the narration text, no explanation. Keep it under 100 characters.' },
        { role: 'user', content: `Generate a short, professional narration for an Indian accounting voucher:\nType: ${voucherType}\nEntries: ${JSON.stringify(entries)}\nAmount: ₹${amount}` },
      ],
      { model: GROQ_MODEL_FAST, maxTokens: 100 }
    );

    return NextResponse.json({ narration: text.trim() || 'Being paid/received' });
  } catch {
    return NextResponse.json({ narration: 'Transaction narration' });
  }
}
