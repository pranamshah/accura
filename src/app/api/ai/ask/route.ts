import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';
import { groqChat } from '@/lib/ai';

function parseJSON(text: string) {
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

const INTENT_MAP: Record<string, string> = {
  CASH_BALANCE: '/display/cash-book',
  BANK_BALANCE: '/display/bank-book',
  OUTSTANDING_RECEIVABLES: '/display/outstanding/receivables',
  OUTSTANDING_PAYABLES: '/display/outstanding/payables',
  GST_LIABILITY: '/display/gst/gstr3b',
  PROFIT_LOSS: '/display/profit-loss',
  BALANCE_SHEET: '/display/balance-sheet',
  TRIAL_BALANCE: '/display/trial-balance',
  SALES_TOTAL: '/display/sales-register',
  PURCHASE_TOTAL: '/display/purchase-register',
  STOCK_VALUE: '/display/stock-summary',
  TOP_EXPENSES: '/display/profit-loss',
  LEDGER_BALANCE: '/display/ledger',
  DAY_BOOK: '/display/day-book',
  RATIO_ANALYSIS: '/display/ratio-analysis',
};

async function runIntent(intent: string, params: Record<string, unknown>, companyId: string) {
  switch (intent) {
    case 'CASH_BALANCE': {
      const rows = await sql`SELECT SUM(ve.amount * CASE WHEN ve.type='DEBIT' THEN 1 ELSE -1 END) as bal
        FROM voucher_entries ve JOIN ledgers l ON l.id=ve.ledger_id
        WHERE l.company_id=${companyId} AND l.nature='CASH' AND l.name ILIKE '%cash%'`;
      return { label: 'Cash Balance', value: rows[0]?.bal ?? 0 };
    }
    case 'BANK_BALANCE': {
      const rows = await sql`SELECT SUM(ve.amount * CASE WHEN ve.type='DEBIT' THEN 1 ELSE -1 END) as bal
        FROM voucher_entries ve JOIN ledgers l ON l.id=ve.ledger_id
        WHERE l.company_id=${companyId} AND l.nature='BANK'`;
      return { label: 'Bank Balance', value: rows[0]?.bal ?? 0 };
    }
    case 'OUTSTANDING_RECEIVABLES': {
      const rows = await sql`SELECT COUNT(*) as cnt, SUM(ve.amount) as total
        FROM voucher_entries ve JOIN ledgers l ON l.id=ve.ledger_id
        JOIN vouchers v ON v.id=ve.voucher_id
        WHERE l.company_id=${companyId} AND v.type='SALES' AND ve.type='DEBIT'`;
      return { label: 'Total Receivables', value: rows[0]?.total ?? 0 };
    }
    case 'OUTSTANDING_PAYABLES': {
      const rows = await sql`SELECT SUM(ve.amount) as total
        FROM voucher_entries ve JOIN ledgers l ON l.id=ve.ledger_id
        JOIN vouchers v ON v.id=ve.voucher_id
        WHERE l.company_id=${companyId} AND v.type='PURCHASE' AND ve.type='CREDIT'`;
      return { label: 'Total Payables', value: rows[0]?.total ?? 0 };
    }
    case 'SALES_TOTAL': {
      const from = (params.from as string) || new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10);
      const to = (params.to as string) || new Date().toISOString().slice(0, 10);
      const rows = await sql`SELECT SUM(total_amount) as total FROM vouchers WHERE company_id=${companyId} AND type='SALES' AND date BETWEEN ${from} AND ${to}`;
      return { label: `Sales (${from} to ${to})`, value: rows[0]?.total ?? 0 };
    }
    case 'PURCHASE_TOTAL': {
      const from = (params.from as string) || new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10);
      const to = (params.to as string) || new Date().toISOString().slice(0, 10);
      const rows = await sql`SELECT SUM(total_amount) as total FROM vouchers WHERE company_id=${companyId} AND type='PURCHASE' AND date BETWEEN ${from} AND ${to}`;
      return { label: `Purchases (${from} to ${to})`, value: rows[0]?.total ?? 0 };
    }
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { question, companyId, currentDate, fyStart } = await req.json();
    if (!question || !companyId) return NextResponse.json({ error: 'question and companyId required' }, { status: 400 });

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ intent: 'UNKNOWN', answerText: 'AI unavailable — GROQ_API_KEY not set', reportPath: null, data: null });
    }

    const systemPrompt = `You translate a business owner's plain-English question about their accounts into one of the supported report intents and parameters. You do NOT have database access — you only choose an intent from the provided list and extract parameters. Resolve relative dates against the provided current date and financial year. Respond ONLY with valid JSON.

Supported intents: CASH_BALANCE, BANK_BALANCE, OUTSTANDING_RECEIVABLES, OUTSTANDING_PAYABLES, GST_LIABILITY, PROFIT_LOSS, BALANCE_SHEET, TRIAL_BALANCE, SALES_TOTAL, PURCHASE_TOTAL, STOCK_VALUE, TOP_EXPENSES, LEDGER_BALANCE, DAY_BOOK, RATIO_ANALYSIS, UNKNOWN

Schema: { "intent": string, "params": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "limit": number, "ledger": string }, "answerText": string, "reportPath": string }`;

    const text = await groqChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Current date: ${currentDate || new Date().toISOString().slice(0, 10)}\nFinancial year start: ${fyStart || 'April'}\n\nQuestion: ${question}` },
      ],
      { maxTokens: 512, jsonMode: true }
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJSON(text);
    } catch {
      parsed = { intent: 'UNKNOWN', answerText: 'Could not understand the question.', reportPath: null };
    }

    const intent = parsed.intent as string;
    const params = (parsed.params as Record<string, unknown>) || {};

    let queryData = null;
    if (intent && intent !== 'UNKNOWN') {
      try {
        queryData = await runIntent(intent, params, companyId);
      } catch {
        // DB query failed — still return AI answer
      }
    }

    const reportPath = (parsed.reportPath as string) || INTENT_MAP[intent] || null;

    return NextResponse.json({ intent, params, answerText: parsed.answerText, reportPath, data: queryData });
  } catch (err) {
    console.error('ask error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
