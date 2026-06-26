import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { groqChat } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, companyName, context } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ response: 'AI assistant requires GROQ_API_KEY. Please set it in your .env.local file.' });
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

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...(context ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await groqChat(messages, { maxTokens: 1024 });

    return NextResponse.json({ response: response || 'No response from AI' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
