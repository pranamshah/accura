import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, companyName, context } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ response: 'AI assistant requires ANTHROPIC_API_KEY. Please set it in your .env.local file.' });
    }

    const systemPrompt = `You are an expert Indian accounting assistant for ${companyName ?? 'a company'} using Accura accounting software.

You help with:
- Recording journal entries (debit/credit)
- GST calculations (IGST/CGST/SGST)
- Voucher narrations
- Financial analysis and ratios
- TDS calculations
- Payroll queries
- Indian accounting standards (AS/Ind AS)

Format your responses clearly. For journal entries, show:
Account Name | Dr/Cr | Amount
Always mention which accounts to debit and credit.
Keep responses concise and practical.`;

    const messages = [
      ...(context ?? []).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Anthropic API error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await res.json();
    const response = data.content?.[0]?.text ?? 'No response from AI';
    return NextResponse.json({ response });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
