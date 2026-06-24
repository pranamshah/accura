import OpenAI from 'openai';
import type { AISuggestion, VoucherType } from '@/types';

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY ?? '',
  baseURL: 'https://api.x.ai/v1',
});

const GROK_MODEL = 'grok-3-mini';

const SYSTEM_PROMPT = `You are an expert Indian Chartered Accountant assistant for Accura accounting software.
Always respond with valid JSON when asked for structured data.
Use proper Indian accounting standards (Ind AS / AS).
Use Indian terminology: ledger, voucher, narration, Dr/Cr, GST, TDS.
Be concise and precise.`;

export async function suggestJournalEntry(
  description: string,
  context?: { name: string; gstin?: string; state?: string }
): Promise<AISuggestion> {
  if (!process.env.XAI_API_KEY) {
    return {
      type: 'VOUCHER',
      voucherType: 'PAYMENT' as VoucherType,
      date: new Date().toISOString().split('T')[0],
      narration: description,
      entries: [
        { ledgerName: 'Expense A/c', type: 'DEBIT', amount: 0 },
        { ledgerName: 'Cash', type: 'CREDIT', amount: 0 },
      ],
      message: 'AI service not configured. Please set XAI_API_KEY.',
      confidence: 0,
    };
  }

  const response = await client.chat.completions.create({
    model: GROK_MODEL,
    max_tokens: 800,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Company: ${context?.name ?? 'Unknown'}
Transaction description: "${description}"

Return JSON with this exact structure:
{
  "type": "VOUCHER",
  "voucherType": "PAYMENT|RECEIPT|JOURNAL|SALES|PURCHASE|CONTRA",
  "date": "${new Date().toISOString().split('T')[0]}",
  "entries": [{"ledgerName": "ledger name", "type": "DEBIT|CREDIT", "amount": number}],
  "narration": "professional narration string",
  "message": "explanation",
  "confidence": 0.0
}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(response.choices[0].message.content ?? '{}') as AISuggestion;
  } catch {
    return {
      type: 'VOUCHER',
      voucherType: 'JOURNAL' as VoucherType,
      date: new Date().toISOString().split('T')[0],
      narration: description,
      entries: [],
      message: response.choices[0].message.content ?? '',
      confidence: 0.5,
    };
  }
}

export async function generateNarration(
  entries: Array<{ ledgerName: string; type: string; amount: number }>,
  voucherType: string
): Promise<string> {
  if (!process.env.XAI_API_KEY) {
    const amounts = entries.map((e) => `${e.ledgerName}: ₹${e.amount}`).join(', ');
    return `${voucherType} - ${amounts}`;
  }

  const response = await client.chat.completions.create({
    model: GROK_MODEL,
    max_tokens: 150,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Write a professional accounting narration for this ${voucherType} voucher:
${entries.map((e) => `${e.type}: ${e.ledgerName} ₹${e.amount}`).join('\n')}

Return only the narration text, no JSON, max 2 sentences.`,
      },
    ],
  });

  return response.choices[0].message.content?.trim() ?? 'Being settled as per accounts';
}

export async function detectAnomalies(
  vouchers: Array<{ date: string | Date; type: string; totalAmount: number; number: string }>
): Promise<string[]> {
  if (!process.env.XAI_API_KEY) {
    return ['AI anomaly detection not configured. Set XAI_API_KEY to enable.'];
  }

  if (vouchers.length === 0) return ['No vouchers to analyze.'];

  const summary = vouchers.slice(0, 50).map((v) => ({
    date: v.date,
    type: v.type,
    amount: v.totalAmount,
    number: v.number,
  }));

  const response = await client.chat.completions.create({
    model: GROK_MODEL,
    max_tokens: 1000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze these vouchers for anomalies:
${JSON.stringify(summary, null, 2)}

Return JSON object with anomalies array (max 5 strings):
{"anomalies": ["anomaly 1", "anomaly 2"]}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(response.choices[0].message.content ?? '{"anomalies":[]}') as { anomalies?: string[] };
    return result.anomalies ?? [];
  } catch {
    return [];
  }
}

export async function getReportInsights(
  reportData: Record<string, unknown>,
  reportType: string
): Promise<string> {
  if (!process.env.XAI_API_KEY) {
    return 'AI insights not configured. Please set XAI_API_KEY.';
  }

  const response = await client.chat.completions.create({
    model: GROK_MODEL,
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Provide 3-4 key insights about this ${reportType} report for an Indian business:
${JSON.stringify(reportData, null, 2)}

Be specific with amounts and percentages. Focus on actionable insights. Return plain text.`,
      },
    ],
  });

  return response.choices[0].message.content?.trim() ?? 'Unable to generate insights.';
}

export async function classifyLedger(
  ledgerName: string,
  description?: string
): Promise<{ groupName: string; nature: string; confidence: number }> {
  if (!process.env.XAI_API_KEY) {
    return { groupName: 'Indirect Expenses', nature: 'EXPENSES', confidence: 0 };
  }

  const response = await client.chat.completions.create({
    model: GROK_MODEL,
    max_tokens: 200,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Classify this ledger for Indian accounting:
Name: "${ledgerName}"
${description ? `Description: "${description}"` : ''}

Available groups: Capital Account, Current Liabilities, Sundry Creditors, Duties & Taxes, Loans (Liability), Fixed Assets, Current Assets, Cash-in-Hand, Bank Accounts, Sundry Debtors, Stock-in-Hand, Sales Accounts, Other Income, Purchase Accounts, Direct Expenses, Indirect Expenses

Return JSON: {"groupName": "group name", "nature": "ASSETS|LIABILITIES|INCOME|EXPENSES", "confidence": 0.0}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  try {
    return JSON.parse(response.choices[0].message.content ?? '{}') as { groupName: string; nature: string; confidence: number };
  } catch {
    return { groupName: 'Indirect Expenses', nature: 'EXPENSES', confidence: 0.3 };
  }
}
