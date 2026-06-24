import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    bankAccountId: string;
    transactions: Array<{ date: string; description: string; amount: number; type: 'DEBIT' | 'CREDIT' }>;
  };
  const { bankAccountId, transactions } = body;

  if (!bankAccountId || !transactions) {
    return NextResponse.json({ error: 'bankAccountId and transactions required' }, { status: 400 });
  }

  let count = 0;
  for (const t of transactions) {
    await sql`
      INSERT INTO bank_reconciliations (id, bank_account_id, date, description, amount, type, is_reconciled)
      VALUES (gen_random_uuid()::text, ${bankAccountId}, ${t.date}, ${t.description}, ${t.amount}, ${t.type}, false)
    `;
    count++;
  }

  return NextResponse.json({ created: count });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as { id: string; isReconciled: boolean; voucherId?: string };
  const { id, isReconciled, voucherId } = body;

  const rows = await sql`
    UPDATE bank_reconciliations SET
      is_reconciled = ${isReconciled},
      reconciled_date = ${isReconciled ? new Date().toISOString() : null},
      voucher_id = ${voucherId ?? null}
    WHERE id = ${id}
    RETURNING *
  `;

  return NextResponse.json({ entry: rows[0] });
}
