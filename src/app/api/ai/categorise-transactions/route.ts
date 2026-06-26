import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';
import { groqChat, GROQ_MODEL } from '@/lib/ai';

function parseJSON(text: string) {
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows, companyId } = await req.json();
    if (!rows || !companyId) return NextResponse.json({ error: 'rows and companyId required' }, { status: 400 });

    const ledgerRows = await sql`SELECT id, name, nature, parent FROM ledgers WHERE company_id=${companyId} ORDER BY name`;
    const ledgerList = ledgerRows.map((l: { name: string; nature: string }) => `${l.name}(${l.nature})`).join(', ');

    if (!process.env.GROQ_API_KEY) {
      // Fallback: return rows with empty suggestions
      const fallback = rows.map((r: Record<string, unknown>, i: number) => ({
        rowIndex: i,
        voucherType: (r.withdrawal as number) > 0 ? 'PAYMENT' : 'RECEIPT',
        suggestedLedger: '',
        narration: `Being ${r.description}`,
        confidence: 0,
        matchedExisting: false,
      }));
      return NextResponse.json({ suggestions: fallback });
    }

    const text = await groqChat(
      [
        { role: 'system', content: `You are an Indian accountant processing a bank statement. For each transaction, decide: voucherType (RECEIPT for deposits, PAYMENT for withdrawals, CONTRA if transfer between own accounts), the most likely counter-ledger name from the provided company ledger list (match party names especially; only suggest new ledger if nothing fits), and a 'Being ...' narration. Recognise Indian bank patterns: UPI, NEFT, RTGS, IMPS, ACH, EMI, bank charges, interest, salary. Respond ONLY with a valid JSON array matching schema: [{"rowIndex":number,"voucherType":"PAYMENT|RECEIPT|CONTRA","suggestedLedger":"string","narration":"string","confidence":0.0-1.0,"matchedExisting":boolean}]` },
        { role: 'user', content: `Company ledgers: ${ledgerList}\n\nTransactions to categorise:\n${JSON.stringify(rows.slice(0, 100), null, 2)}` },
      ],
      { model: GROQ_MODEL, maxTokens: 4096 }
    );

    let suggestions;
    try {
      suggestions = parseJSON(text);
    } catch {
      suggestions = rows.map((_: unknown, i: number) => ({ rowIndex: i, voucherType: 'PAYMENT', suggestedLedger: '', narration: '', confidence: 0, matchedExisting: false }));
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('categorise error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
