import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';
import { groqChat } from '@/lib/ai';

function parseJSON(text: string) {
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, companyId, currentDate } = await req.json();
    if (!message || !companyId) return NextResponse.json({ error: 'message and companyId required' }, { status: 400 });

    const ledgerRows = await sql`SELECT name, nature, parent FROM ledgers WHERE company_id = ${companyId} ORDER BY name`;
    const ledgerList = ledgerRows.map((l: { name: string; nature: string; parent: string }) => `${l.name} (${l.nature})`).join(', ');

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 503 });
    }

    const systemPrompt = `You are an expert Indian Chartered Accountant. Convert the user's plain-language transaction into a correct double-entry voucher. Use ONLY ledger names from the provided list when they match; if a needed ledger is not in the list, put its best-guess name and set exists=false and add it to missingLedgers with a suggested group. Determine voucher type (PAYMENT/RECEIPT/JOURNAL/CONTRA/SALES/PURCHASE). Debits must equal credits. Generate a professional narration in the Indian style starting with 'Being'. Respond ONLY with valid JSON, no markdown.

Schema:
{
  "voucherType": "PAYMENT|RECEIPT|JOURNAL|CONTRA|SALES|PURCHASE",
  "date": "YYYY-MM-DD",
  "narration": "Being ...",
  "entries": [
    { "ledgerName": "string", "type": "DEBIT|CREDIT", "amount": number, "exists": boolean }
  ],
  "referenceNo": "string or null",
  "gstApplicable": boolean,
  "confidence": number,
  "missingLedgers": [{ "name": "string", "suggestedGroup": "string" }]
}`;

    const userMsg = `Company ledgers: ${ledgerList}
Today's date: ${currentDate || new Date().toISOString().slice(0, 10)}

Transaction: ${message}`;

    const text = await groqChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      { maxTokens: 1024, jsonMode: true }
    );

    const result = parseJSON(text);
    return NextResponse.json(result);
  } catch (err) {
    console.error('smart-entry error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
