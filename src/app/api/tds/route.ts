import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const entries = await sql`
    SELECT te.*, ts.section, ts.description as section_desc, ts.rate as section_rate,
      v.number as voucher_number, v.date as voucher_date, v.type as voucher_type
    FROM tds_entries te
    JOIN tds_sections ts ON te.section_id = ts.id
    JOIN vouchers v ON te.voucher_id = v.id
    WHERE v.company_id = ${companyId}
    ORDER BY te.created_at DESC
  `;

  const totalDue = (entries as { deposited: boolean; tds_amount: number }[])
    .filter((e) => !e.deposited)
    .reduce((s, e) => s + e.tds_amount, 0);

  return NextResponse.json({
    entries: (entries as { section: string; section_desc: string; section_rate: number; section_id: string; voucher_number: string; voucher_date: string; voucher_type: string }[]).map((e) => ({
      ...e,
      section: { id: e.section_id, section: e.section, description: e.section_desc, rate: e.section_rate },
      voucher: { number: e.voucher_number, date: e.voucher_date, type: e.voucher_type },
    })),
    totalDue,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; deposited: boolean; challanNo?: string; challanDate?: string };
  const { id, deposited, challanNo, challanDate } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await sql`
    UPDATE tds_entries
    SET deposited = ${deposited}, challan_no = ${challanNo ?? null}, challan_date = ${challanDate ?? null}
    WHERE id = ${id}
  `;

  return NextResponse.json({ success: true });
}
