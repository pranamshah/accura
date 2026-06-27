import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const result = await sql`
      SELECT COUNT(*) as entry_count,
             COUNT(DISTINCT voucher_id) as voucher_count
      FROM voucher_entries
      WHERE ledger_id = ${id}
    `;
    const entryCount = parseInt(result[0].entry_count);
    return NextResponse.json({
      canDelete: entryCount === 0,
      entryCount,
      voucherCount: parseInt(result[0].voucher_count),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
