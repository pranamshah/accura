import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { generateGSTR3BData } from '@/lib/gst';

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

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

  const vouchers = await sql`
    SELECT v.* FROM vouchers v
    WHERE v.company_id = ${companyId}
      AND v.type IN ('SALES','PURCHASE','DEBIT_NOTE','CREDIT_NOTE')
      AND v.status = 'ACTIVE'
      AND v.date >= ${startDate} AND v.date <= ${endDate}
  `;

  const vIds = (vouchers as { id: string }[]).map((v) => v.id);
  let gstLines: unknown[] = [];
  if (vIds.length > 0) {
    gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ANY(${vIds})`;
  }

  const vouchersWithGst = (vouchers as { id: string; type: string }[]).map((v) => ({
    ...v,
    gstLines: (gstLines as { voucher_id: string }[]).filter((g) => g.voucher_id === v.id),
  }));

  const gstr3bData = generateGSTR3BData(vouchersWithGst as Parameters<typeof generateGSTR3BData>[0]);

  const outputSales = vouchersWithGst.filter((v) => v.type === 'SALES');
  const inputPurchases = vouchersWithGst.filter((v) => v.type === 'PURCHASE');

  return NextResponse.json({
    data: gstr3bData,
    summary: {
      outwardSupplies: {
        taxable: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { taxable_value: number }) => gs + l.taxable_value, 0) || 0), 0),
        igst: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { igst_amount: number }) => gs + l.igst_amount, 0) || 0), 0),
        cgst: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { cgst_amount: number }) => gs + l.cgst_amount, 0) || 0), 0),
        sgst: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { sgst_amount: number }) => gs + l.sgst_amount, 0) || 0), 0),
      },
      itcAvailable: {
        igst: inputPurchases.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { igst_amount: number }) => gs + l.igst_amount, 0) || 0), 0),
        cgst: inputPurchases.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { cgst_amount: number }) => gs + l.cgst_amount, 0) || 0), 0),
        sgst: inputPurchases.reduce((s, v) => s + (v.gstLines?.reduce((gs: number, l: { sgst_amount: number }) => gs + l.sgst_amount, 0) || 0), 0),
      },
    },
  });
}
