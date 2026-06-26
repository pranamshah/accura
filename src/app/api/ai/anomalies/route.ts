import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';
import { groqChat } from '@/lib/ai';

function parseJSON(text: string) {
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(clean);
}

interface Voucher {
  id: string;
  number: string;
  type: string;
  date: string;
  total_amount: number;
  narration: string;
  created_at: string;
  entries: Array<{ ledger_name: string; type: string; amount: number }>;
}

interface Anomaly {
  voucherNo: string;
  date: string;
  issue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedFix: string;
  voucherId?: string;
}

const INDIAN_HOLIDAYS_2026 = ['2026-01-26', '2026-03-25', '2026-04-14', '2026-04-25', '2026-08-15', '2026-10-02', '2026-11-05', '2026-12-25'];

function isSunday(dateStr: string) {
  return new Date(dateStr).getDay() === 0;
}

function isHoliday(dateStr: string) {
  return INDIAN_HOLIDAYS_2026.some((h) => dateStr.startsWith(h));
}

function runRuleChecks(vouchers: Voucher[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const seen = new Map<string, string>();

  for (const v of vouchers) {
    const key = `${v.date}|${v.total_amount}|${v.type}`;

    // Duplicate check
    if (seen.has(key)) {
      anomalies.push({ voucherId: v.id, voucherNo: v.number, date: v.date, issue: `Possible duplicate of ${seen.get(key)} — same date, amount, and type`, severity: 'HIGH', suggestedFix: 'Verify and delete the duplicate voucher' });
    }
    seen.set(key, v.number);

    // Missing narration
    if (!v.narration || v.narration.trim().length < 5) {
      anomalies.push({ voucherId: v.id, voucherNo: v.number, date: v.date, issue: 'Missing or too-short narration', severity: 'LOW', suggestedFix: 'Add a descriptive narration using Auto Narration (Alt+N)' });
    }

    // Sunday / holiday entry
    if (isSunday(v.date)) {
      anomalies.push({ voucherId: v.id, voucherNo: v.number, date: v.date, issue: 'Voucher dated on a Sunday', severity: 'MEDIUM', suggestedFix: 'Confirm the date is correct; adjust if back-dated entry' });
    } else if (isHoliday(v.date)) {
      anomalies.push({ voucherId: v.id, voucherNo: v.number, date: v.date, issue: 'Voucher dated on a public holiday', severity: 'LOW', suggestedFix: 'Confirm the date is intentional' });
    }

    // Cash payment > 10,000 (Sec 40A(3))
    if ((v.type === 'PAYMENT' || v.type === 'JOURNAL') && v.total_amount > 10000) {
      const cashEntry = v.entries?.find((e) => e.ledger_name?.toLowerCase().includes('cash') && e.type === 'CREDIT');
      if (cashEntry) {
        anomalies.push({ voucherId: v.id, voucherNo: v.number, date: v.date, issue: `Cash payment of ₹${v.total_amount.toLocaleString('en-IN')} exceeds ₹10,000 (Sec 40A(3) disallowance risk)`, severity: 'HIGH', suggestedFix: 'Pay via bank transfer; cash payments >₹10,000 are disallowed as business expense' });
      }
    }

    // Round-number suspicion for large amounts
    if (v.total_amount >= 50000 && v.total_amount % 1000 === 0) {
      anomalies.push({ voucherId: v.id, voucherNo: v.number, date: v.date, issue: `Round-number amount of ₹${v.total_amount.toLocaleString('en-IN')} — verify accuracy`, severity: 'LOW', suggestedFix: 'Confirm the exact amount with supporting documents' });
    }

    // Back-dated entry (created much later than voucher date)
    if (v.created_at && v.date) {
      const vDate = new Date(v.date);
      const cDate = new Date(v.created_at);
      const diffDays = Math.floor((cDate.getTime() - vDate.getTime()) / 86400000);
      if (diffDays > 30) {
        anomalies.push({ voucherId: v.id, voucherNo: v.number, date: v.date, issue: `Back-dated entry: entered ${diffDays} days after voucher date`, severity: 'MEDIUM', suggestedFix: 'Ensure back-dated entries are authorised and have justification' });
      }
    }
  }

  return anomalies;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { companyId, from, to } = await req.json();
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const toDate = to || new Date().toISOString().slice(0, 10);

    const voucherRows = await sql`
      SELECT v.id, v.number, v.type, v.date::text, v.total_amount, v.narration, v.created_at::text
      FROM vouchers v WHERE v.company_id=${companyId} AND v.date BETWEEN ${fromDate} AND ${toDate}
      ORDER BY v.date`;

    const entryRows = await sql`
      SELECT ve.voucher_id, l.name as ledger_name, ve.type, ve.amount
      FROM voucher_entries ve JOIN ledgers l ON l.id=ve.ledger_id
      JOIN vouchers v ON v.id=ve.voucher_id
      WHERE v.company_id=${companyId} AND v.date BETWEEN ${fromDate} AND ${toDate}`;

    const entryMap = new Map<string, Array<{ ledger_name: string; type: string; amount: number }>>();
    for (const e of entryRows) {
      const arr = entryMap.get(e.voucher_id) || [];
      arr.push({ ledger_name: e.ledger_name, type: e.type, amount: Number(e.amount) });
      entryMap.set(e.voucher_id, arr);
    }

    const vouchers: Voucher[] = voucherRows.map((v) => ({
      ...v,
      total_amount: Number(v.total_amount),
      entries: entryMap.get(v.id) || [],
    }));

    const ruleAnomalies = runRuleChecks(vouchers);

    let aiAnomalies: Anomaly[] = [];
    if (process.env.GROQ_API_KEY && vouchers.length > 0) {
      try {
        const voucherSummary = vouchers.slice(0, 50).map((v) => ({
          no: v.number, type: v.type, date: v.date, amount: v.total_amount, narration: v.narration,
          ledgers: v.entries.map((e) => `${e.ledger_name}(${e.type[0]}:${e.amount})`).join(','),
        }));

        const text = await groqChat(
          [
            { role: 'system', content: `You are an internal auditor reviewing Indian accounting entries. Identify anomalies: unusual amounts vs pattern for that party/ledger, misclassified accounts, narrations contradicting the entry, Sec 40A(3) cash violations, suspicious patterns. For each, give the voucher reference, a one-line issue, severity (HIGH/MEDIUM/LOW), and a suggested fix. Respond ONLY with a valid JSON array: [{"voucherNo":"","date":"","issue":"","severity":"HIGH|MEDIUM|LOW","suggestedFix":""}]` },
            { role: 'user', content: `Vouchers to audit:\n${JSON.stringify(voucherSummary, null, 2)}` },
          ],
          { maxTokens: 2048 }
        );

        aiAnomalies = parseJSON(text) as Anomaly[];
        aiAnomalies = aiAnomalies.map((a) => ({ ...a, source: 'AI' } as Anomaly));
      } catch {
        // AI unavailable — rule-based only
      }
    }

    const all = [...ruleAnomalies, ...aiAnomalies];
    const high = all.filter((a) => a.severity === 'HIGH').length;
    const medium = all.filter((a) => a.severity === 'MEDIUM').length;

    return NextResponse.json({ anomalies: all, total: all.length, high, medium, low: all.length - high - medium, period: { from: fromDate, to: toDate } });
  } catch (err) {
    console.error('anomalies error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
