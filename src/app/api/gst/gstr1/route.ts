import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { generateGSTR1JSON } from '@/lib/gst';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (!companyId || !month || !year) {
    return NextResponse.json({ error: 'companyId, month, year required' }, { status: 400 });
  }

  const companyRows = await sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`;
  if (companyRows.length === 0) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  const company = companyRows[0] as { gstin: string | null; state_code: string | null };

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

  const vouchers = await sql`
    SELECT v.* FROM vouchers v
    WHERE v.company_id = ${companyId}
      AND v.type IN ('SALES','DEBIT_NOTE','CREDIT_NOTE')
      AND v.status = 'ACTIVE'
      AND v.date >= ${startDate} AND v.date <= ${endDate}
  `;

  const vIds = (vouchers as { id: string }[]).map((v) => v.id);
  let entries: unknown[] = [];
  let gstLines: unknown[] = [];
  if (vIds.length > 0) {
    entries = await sql`
      SELECT ve.*, l.name as ledger_name, l.gstin as ledger_gstin
      FROM voucher_entries ve JOIN ledgers l ON ve.ledger_id = l.id
      WHERE ve.voucher_id = ANY(${vIds})
    `;
    gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ANY(${vIds})`;
  }

  type VoucherRow = { id: string; number: string; date: string; total_amount: number; place_of_supply: string | null };
  type EntryRow = { voucher_id: string; type: string; ledger_name: string; ledger_gstin: string | null };
  type GstLineRow = { voucher_id: string; taxable_value: number; igst_amount: number; cgst_amount: number; sgst_amount: number; cess_amount: number; total_tax: number };

  const vouchersWithDetails = (vouchers as VoucherRow[]).map((v) => ({
    ...v,
    entries: (entries as EntryRow[]).filter((e) => e.voucher_id === v.id).map((e) => ({ ...e, ledger: { name: e.ledger_name, gstin: e.ledger_gstin } })),
    gstLines: (gstLines as GstLineRow[]).filter((g) => g.voucher_id === v.id),
  }));

  const b2b = vouchersWithDetails
    .filter((v) => v.entries?.some((e: { type: string; ledger: { gstin: string | null } }) => e.ledger?.gstin))
    .map((v) => ({
      voucherId: v.id,
      number: (v as { number: string }).number,
      date: (v as { date: string }).date,
      partyName: v.entries?.find((e: { type: string }) => e.type === 'DEBIT')?.ledger?.name || '',
      partyGstin: v.entries?.find((e: { type: string }) => e.type === 'DEBIT')?.ledger?.gstin || '',
      taxableValue: v.gstLines?.reduce((s: number, l: { taxable_value: number }) => s + l.taxable_value, 0) || 0,
      igst: v.gstLines?.reduce((s: number, l: { igst_amount: number }) => s + l.igst_amount, 0) || 0,
      cgst: v.gstLines?.reduce((s: number, l: { cgst_amount: number }) => s + l.cgst_amount, 0) || 0,
      sgst: v.gstLines?.reduce((s: number, l: { sgst_amount: number }) => s + l.sgst_amount, 0) || 0,
      cess: v.gstLines?.reduce((s: number, l: { cess_amount: number }) => s + l.cess_amount, 0) || 0,
      totalValue: v.total_amount,
      placeOfSupply: v.place_of_supply || company.state_code || '33',
    }));

  const b2c = vouchersWithDetails
    .filter((v) => !v.entries?.some((e: { type: string; ledger: { gstin: string | null } }) => e.ledger?.gstin))
    .map((v) => ({
      voucherId: v.id,
      number: (v as { number: string }).number,
      date: (v as { date: string }).date,
      taxableValue: v.gstLines?.reduce((s: number, l: { taxable_value: number }) => s + l.taxable_value, 0) || 0,
      igst: v.gstLines?.reduce((s: number, l: { igst_amount: number }) => s + l.igst_amount, 0) || 0,
      cgst: v.gstLines?.reduce((s: number, l: { cgst_amount: number }) => s + l.cgst_amount, 0) || 0,
      sgst: v.gstLines?.reduce((s: number, l: { sgst_amount: number }) => s + l.sgst_amount, 0) || 0,
      totalValue: v.total_amount,
    }));

  const gstr1Json = generateGSTR1JSON(
    vouchersWithDetails as unknown as Parameters<typeof generateGSTR1JSON>[0],
    company.gstin || '',
    month,
    parseInt(year)
  );

  return NextResponse.json({
    b2b, b2c,
    summary: {
      totalInvoices: vouchers.length,
      totalTaxable: vouchersWithDetails.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { taxable_value: number }) => gs + l.taxable_value, 0) || 0), 0),
      totalTax: vouchersWithDetails.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { total_tax: number }) => gs + l.total_tax, 0) || 0), 0),
      totalValue: (vouchers as VoucherRow[]).reduce((s, v) => s + v.total_amount, 0),
    },
    json: gstr1Json,
  });
}
