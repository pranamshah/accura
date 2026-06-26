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

// Robust CSV row splitter that handles quoted fields (commas inside quotes)
function splitCSVRow(line: string, delimiter = ','): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } // escaped quote
      else { inQuotes = !inQuotes; }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCSV(text: string): StatementRow[] {
  // Normalise line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.trim().split('\n').filter(l => l.trim() && !l.match(/^[,\s]*$/));
  if (lines.length < 2) return [];

  // Auto-detect delimiter: semicolon or comma
  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';

  const headers = splitCSVRow(lines[0], delimiter).map(h => h.toLowerCase().replace(/"/g, '').trim());
  const rows: StatementRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVRow(lines[i], delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] ?? '').replace(/"/g, '').trim(); });

    const get = (...keys: string[]) => keys.map(k => obj[k]).find(v => v && v !== '') || '';

    const dateStr = get('date', 'txn date', 'transaction date', 'value date', 'posting date', 'trans date');
    const desc = get('description', 'narration', 'particulars', 'details', 'remarks', 'transaction details', 'chq/ref number description', 'transaction narration');
    const ref = get('ref no', 'reference', 'chq no', 'cheque no', 'utr', 'chq/ref no.', 'ref number');

    // Handle amount: may be single "amount" column or split withdrawal/deposit
    let withdrawal = 0;
    let deposit = 0;
    const rawWithdrawal = get('withdrawal', 'debit', 'dr', 'amount (dr)', 'debit amount', 'withdrawal amt');
    const rawDeposit = get('deposit', 'credit', 'cr', 'amount (cr)', 'credit amount', 'deposit amt');
    const rawAmount = get('amount', 'transaction amount');
    const rawType = get('type', 'dr/cr', 'debit/credit', 'transaction type').toUpperCase();

    if (rawWithdrawal || rawDeposit) {
      withdrawal = parseFloat(rawWithdrawal.replace(/[,\s]/g, '')) || 0;
      deposit = parseFloat(rawDeposit.replace(/[,\s]/g, '')) || 0;
    } else if (rawAmount) {
      const amt = parseFloat(rawAmount.replace(/[,\s]/g, '')) || 0;
      if (rawType.includes('DR') || rawType.includes('DEBIT') || rawType.includes('WD')) {
        withdrawal = Math.abs(amt);
      } else if (rawType.includes('CR') || rawType.includes('CREDIT') || rawType.includes('DEP')) {
        deposit = Math.abs(amt);
      } else if (amt < 0) {
        withdrawal = Math.abs(amt);
      } else {
        deposit = amt;
      }
    }

    const balance = parseFloat(get('balance', 'closing balance', 'running balance', 'balance (inr)').replace(/[,\s]/g, '')) || 0;

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

    if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
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
          system: `Extract all bank statement transactions from this PDF into a JSON array. Each item must have: { "date": "DD/MM/YYYY or YYYY-MM-DD", "description": "string", "refNo": "string or empty", "withdrawal": number_or_0, "deposit": number_or_0, "balance": number_or_0 }. Numbers must be plain numbers without commas or currency symbols. Respond ONLY with a valid JSON array, no markdown.`,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: 'Extract all transactions from this bank statement as a JSON array.' },
            ],
          }],
        }),
      });

      const data = await res.json();
      if (!res.ok) return NextResponse.json({ error: data.error?.message || 'PDF parsing failed' }, { status: 502 });
      const text = data.content?.[0]?.text ?? '[]';
      try {
        rows = parseJSON(text) as StatementRow[];
      } catch {
        return NextResponse.json({ error: 'Could not parse PDF statement. Try CSV format.' }, { status: 422 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported format. Upload CSV (.csv) or PDF (.pdf).' }, { status: 400 });
    }

    if (!rows.length) {
      return NextResponse.json({ error: 'No transactions found. Check file format or column headers.' }, { status: 422 });
    }

    return NextResponse.json({ rows, count: rows.length });
  } catch (err) {
    console.error('parse-statement error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
