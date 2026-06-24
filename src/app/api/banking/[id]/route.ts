import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`SELECT * FROM bank_accounts WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const reconciliations = await sql`SELECT * FROM bank_reconciliations WHERE bank_account_id = ${id} ORDER BY date DESC`;
  return NextResponse.json({ account: { ...rows[0], reconciliations } });
}
