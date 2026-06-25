import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

function parseJSON(text: string) {
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

interface StatementRow {
  date: string;
  description: string;
  refNo: string;
  withdrawal: number;
  deposit: number;
  balance: number;
}

function parseCSV(text: string): StatementRow[] {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: StatementRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = cells[idx] || ''; });

    const getVal = (...keys: string[]) => keys.map((k) => obj[k]).find((v) => v && v !== '') || '';
    const dateStr = getVal('date', 'txn date', 'transaction date', 'value date');
    const desc = getVal('description', 'narration', 'particulars', 'details', 'remarks');
    const ref = getVal('ref no', 'reference', 'chq no', 'cheque no', 'utr');
    const withdrawal = parseFloat(getVal('withdrawal', 'debit', 'dr', 'amount (dr)').replace(/,/g, '')) || 0;
    const deposit = parseFloat(getVal('deposit', 'credit', 'cr', 'amount (cr)').replace(/,/g, '')) || 0;
    const balance = parseFloat(getVal('balance', 'closing balance', 'running balance').replace(/,/g, '')) || 0;

    if (dateStr && (desc || withdrawal || deposit)) {
      rows.push({ date: dateStr, description: desc, refNo: ref, withdrawal, deposit, balance });
    }
  }
  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const fileName = file.name.toLowerCase();
    let rows: StatementRow[] = [];

    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = await file.text();
      rows = parseCSV(text);
    } else if (fileName.endsWith('.pdf')) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return NextResponse.json({ error: 'PDF parsing requires ANTHROPIC_API_KEY' }, { status: 503 });

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: `Extract all bank statement transactions from this PDF into a JSON array. Each item: { "date": "DD/MM/YYYY or YYYY-MM-DD", "description": "string", "refNo": "string", "withdrawal": number, "deposit": number, "balance": number }. Numbers should be plain numbers without commas. Respond ONLY with a valid JSON array.`,
          messages: [{
            role: 'user',
            content: [{
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            }, { type: 'text', text: 'Extract all transactions from this bank statement.' }],
          }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text ?? '[]';
      rows = parseJSON(text) as StatementRow[];
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Upload CSV or PDF.' }, { status: 400 });
    }

    return NextResponse.json({ rows, count: rows.length });
  } catch (err) {
    console.error('parse-statement error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
