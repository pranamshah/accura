import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { vouchers, companyId } = await req.json();
    if (!vouchers?.length || !companyId) return NextResponse.json({ error: 'vouchers and companyId required' }, { status: 400 });

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const v of vouchers) {
      try {
        // Duplicate check: same date + amount + type + bank ledger
        const existing = await sql`
          SELECT id FROM vouchers
          WHERE company_id=${companyId} AND type=${v.type} AND date=${v.date}
            AND total_amount=${v.totalAmount} AND party_ledger_id=${v.bankLedgerId || null}
          LIMIT 1`;

        if (existing.length > 0) { skipped++; continue; }

        const vRows = await sql`
          INSERT INTO vouchers (company_id, type, number, date, narration, reference, total_amount, status, is_posted, party_ledger_id)
          VALUES (${companyId}, ${v.type}, ${v.number}, ${v.date}, ${v.narration}, ${v.reference || null},
                  ${v.totalAmount}, 'ACTIVE', true, ${v.partyLedgerId || null})
          RETURNING id`;

        const voucherId = vRows[0].id;

        for (const e of (v.entries || [])) {
          await sql`INSERT INTO voucher_entries (voucher_id, ledger_id, type, amount, narration)
            VALUES (${voucherId}, ${e.ledgerId}, ${e.type}, ${e.amount}, ${e.narration || null})`;
        }

        created++;
      } catch (err) {
        errors.push(`Failed: ${v.number} — ${String(err)}`);
      }
    }

    return NextResponse.json({ created, skipped, errors, total: vouchers.length });
  } catch (err) {
    console.error('batch voucher error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
