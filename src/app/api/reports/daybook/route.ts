import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const vouchers = await sql`
    SELECT v.* FROM vouchers v
    WHERE v.company_id = ${companyId} AND v.status = 'ACTIVE'
      ${from ? sql`AND v.date >= ${from}` : sql``}
      ${to ? sql`AND v.date <= ${to}` : sql``}
    ORDER BY v.date ASC, v.created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRows = await sql`
    SELECT COUNT(*) FROM vouchers v
    WHERE v.company_id = ${companyId} AND v.status = 'ACTIVE'
      ${from ? sql`AND v.date >= ${from}` : sql``}
      ${to ? sql`AND v.date <= ${to}` : sql``}
  `;

  const vIds = (vouchers as { id: string }[]).map((v) => v.id);
  let entries: unknown[] = [];
  if (vIds.length > 0) {
    entries = await sql`
      SELECT ve.*, l.name as ledger_name FROM voucher_entries ve JOIN ledgers l ON ve.ledger_id = l.id
      WHERE ve.voucher_id = ANY(${vIds})
    `;
  }

  const vouchersWithEntries = (vouchers as { id: string }[]).map((v) => ({
    ...v,
    entries: (entries as { voucher_id: string; ledger_name: string }[]).filter((e) => e.voucher_id === v.id).map((e) => ({ ...e, ledger: { name: e.ledger_name } })),
  }));

  return NextResponse.json({ vouchers: vouchersWithEntries, total: Number((countRows[0] as { count: string }).count) });
}
