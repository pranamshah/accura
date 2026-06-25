import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
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

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: `You are an Indian accountant processing a bank statement. For each transaction, decide: voucherType (RECEIPT for deposits, PAYMENT for withdrawals, CONTRA if transfer between own accounts), the most likely counter-ledger name from the provided company ledger list (match party names especially; only suggest new ledger if nothing fits), and a 'Being ...' narration. Recognise Indian bank patterns: UPI, NEFT, RTGS, IMPS, ACH, EMI, bank charges, interest, salary. Respond ONLY with a valid JSON array matching schema: [{"rowIndex":number,"voucherType":"PAYMENT|RECEIPT|CONTRA","suggestedLedger":"string","narration":"string","confidence":0.0-1.0,"matchedExisting":boolean}]`,
        messages: [{
          role: 'user',
          content: `Company ledgers: ${ledgerList}\n\nTransactions to categorise:\n${JSON.stringify(rows.slice(0, 100), null, 2)}`,
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '[]';
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
