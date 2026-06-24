import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { generateInvoicePDF, generateTrialBalancePDF } from '@/lib/pdf';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const companyId = searchParams.get('companyId');

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const companyRows = await sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`;
  if (companyRows.length === 0) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const company = companyRows[0] as { name: string; address: string | null; city: string | null; state: string | null; gstin: string | null; phone: string | null; email: string | null };

  if (type === 'invoice' && id) {
    const voucherRows = await sql`SELECT * FROM vouchers WHERE id = ${id} LIMIT 1`;
    if (voucherRows.length === 0) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    const voucher = voucherRows[0] as { id: string };

    const entries = await sql`SELECT ve.*, l.name as ledger_name, l.gstin as ledger_gstin FROM voucher_entries ve JOIN ledgers l ON ve.ledger_id = l.id WHERE ve.voucher_id = ${id}`;
    const gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ${id}`;
    const inventoryLines = await sql`
      SELECT il.*, i.name as item_name, u.symbol as unit_symbol
      FROM inventory_lines il JOIN items i ON il.item_id = i.id LEFT JOIN units u ON i.unit_id = u.id
      WHERE il.voucher_id = ${id}
    `;

    const voucherWithDetails = {
      ...voucher,
      entries: (entries as { ledger_name: string; ledger_gstin: string }[]).map((e) => ({ ...e, ledger: { name: e.ledger_name, gstin: e.ledger_gstin } })),
      gstLines,
      inventoryLines: (inventoryLines as { item_name: string; unit_symbol: string; unit_id: string | null }[]).map((il) => ({ ...il, item: { name: il.item_name, unit: il.unit_id ? { symbol: il.unit_symbol } : null } })),
    };

    const dataUri = await generateInvoicePDF(
      voucherWithDetails as unknown as Parameters<typeof generateInvoicePDF>[0],
      {
        name: company.name,
        address: company.address || undefined,
        city: company.city || undefined,
        state: company.state || undefined,
        gstin: company.gstin || undefined,
        phone: company.phone || undefined,
        email: company.email || undefined,
      }
    );

    return NextResponse.json({ dataUri });
  }

  if (type === 'trial-balance') {
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/reports/trial-balance?companyId=${companyId}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`, {
      headers: req.headers,
    });
    const data = await res.json() as { rows: Parameters<typeof generateTrialBalancePDF>[0] };

    const period = from && to ? `${new Date(from).toLocaleDateString('en-IN')} to ${new Date(to).toLocaleDateString('en-IN')}` : 'All Dates';
    const dataUri = await generateTrialBalancePDF(data.rows, { name: company.name }, period);
    return NextResponse.json({ dataUri });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
