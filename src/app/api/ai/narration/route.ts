import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { voucherType, entries, amount } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ narration: 'Being paid/received' });

    const prompt = `Generate a short, professional narration for an Indian accounting voucher:
Type: ${voucherType}
Entries: ${JSON.stringify(entries)}
Amount: ₹${amount}

Provide only the narration text, no explanation. Keep it under 100 characters.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    return NextResponse.json({ narration: data.content?.[0]?.text ?? 'Being paid/received' });
  } catch {
    return NextResponse.json({ narration: 'Transaction narration' });
  }
}
