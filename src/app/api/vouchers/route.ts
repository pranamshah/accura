import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';
import { generateVoucherNumber, getFinancialYear } from '@/lib/utils';

const entrySchema = z.object({
  ledgerId: z.string(),
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number(),
  narration: z.string().optional(),
  billRef: z.string().optional(),
  billDate: z.string().optional(),
});

const gstLineSchema = z.object({
  hsnCode: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  rate: z.number().optional(),
  taxableValue: z.number(),
  igstRate: z.number().default(0),
  cgstRate: z.number().default(0),
  sgstRate: z.number().default(0),
  cessRate: z.number().default(0),
  igstAmount: z.number().default(0),
  cgstAmount: z.number().default(0),
  sgstAmount: z.number().default(0),
  cessAmount: z.number().default(0),
  totalTax: z.number().default(0),
});

const inventoryLineSchema = z.object({
  itemId: z.string(),
  godownId: z.string().optional(),
  batchNo: z.string().optional(),
  serialNo: z.string().optional(),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
  discount: z.number().default(0),
});

const voucherSchema = z.object({
  companyId: z.string(),
  type: z.enum([
    'SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'JOURNAL', 'CONTRA',
    'DEBIT_NOTE', 'CREDIT_NOTE', 'SALES_ORDER', 'PURCHASE_ORDER',
    'DELIVERY_NOTE', 'GOODS_RECEIPT', 'OPENING_BALANCE', 'PAYROLL',
  ]),
  date: z.string(),
  narration: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'DRAFT']).default('ACTIVE'),
  gstApplicable: z.boolean().default(false),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().default(false),
  costCentreId: z.string().optional(),
  aiGenerated: z.boolean().default(false),
  entries: z.array(entrySchema).min(2),
  gstLines: z.array(gstLineSchema).optional(),
  inventoryLines: z.array(inventoryLineSchema).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const vouchers = await sql`
    SELECT v.*
    FROM vouchers v
    WHERE v.company_id = ${companyId}
      ${type ? sql`AND v.type = ${type}` : sql``}
      ${status ? sql`AND v.status = ${status}` : sql``}
      ${from ? sql`AND v.date >= ${from}` : sql``}
      ${to ? sql`AND v.date <= ${to}` : sql``}
      ${search ? sql`AND v.narration ILIKE ${'%' + search + '%'}` : sql``}
    ORDER BY v.date DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countRows = await sql`
    SELECT COUNT(*) FROM vouchers v
    WHERE v.company_id = ${companyId}
      ${type ? sql`AND v.type = ${type}` : sql``}
      ${status ? sql`AND v.status = ${status}` : sql``}
      ${from ? sql`AND v.date >= ${from}` : sql``}
      ${to ? sql`AND v.date <= ${to}` : sql``}
      ${search ? sql`AND v.narration ILIKE ${'%' + search + '%'}` : sql``}
  `;

  // Fetch entries and gst_lines for each voucher
  const voucherIds = (vouchers as { id: string }[]).map((v) => v.id);
  let entries: unknown[] = [];
  let gstLines: unknown[] = [];
  let inventoryLines: unknown[] = [];

  if (voucherIds.length > 0) {
    entries = await sql`
      SELECT ve.*, l.name as ledger_name, l.gstin as ledger_gstin, l.group_id
      FROM voucher_entries ve
      JOIN ledgers l ON ve.ledger_id = l.id
      WHERE ve.voucher_id = ANY(${voucherIds})
    `;
    gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ANY(${voucherIds})`;
    inventoryLines = await sql`
      SELECT il.*, i.name as item_name, u.symbol as unit_symbol
      FROM inventory_lines il
      JOIN items i ON il.item_id = i.id
      LEFT JOIN units u ON i.unit_id = u.id
      WHERE il.voucher_id = ANY(${voucherIds})
    `;
  }

  const vouchersWithDetails = (vouchers as { id: string }[]).map((v) => ({
    ...v,
    entries: (entries as { voucher_id: string; ledger_id: string; ledger_name: string; ledger_gstin: string }[]).filter((e) => e.voucher_id === v.id).map((e) => ({ ...e, ledger: { id: e.ledger_id, name: e.ledger_name, gstin: e.ledger_gstin } })),
    gstLines: (gstLines as { voucher_id: string }[]).filter((g) => g.voucher_id === v.id),
    inventoryLines: (inventoryLines as { voucher_id: string; item_id: string; item_name: string; unit_symbol: string }[]).filter((il) => il.voucher_id === v.id).map((il) => ({ ...il, item: { id: il.item_id, name: il.item_name, unit: { symbol: il.unit_symbol } } })),
  }));

  return NextResponse.json({ vouchers: vouchersWithDetails, total: Number((countRows[0] as { count: string }).count) });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = voucherSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const totalDr = data.entries.filter((e) => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
  const totalCr = data.entries.filter((e) => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    return NextResponse.json({ error: 'Debit and Credit must be equal' }, { status: 400 });
  }

  const countRows = await sql`SELECT COUNT(*) FROM vouchers WHERE company_id = ${data.companyId} AND type = ${data.type}`;
  const count = Number((countRows[0] as { count: string }).count);
  const fy = getFinancialYear(new Date(data.date));
  const number = generateVoucherNumber(data.type, count + 1, fy.label);

  const voucherId = crypto.randomUUID();

  await sql.transaction([
    sql`
      INSERT INTO vouchers (id, company_id, type, number, date, narration, reference, total_amount, status,
        gst_applicable, place_of_supply, reverse_charge, cost_centre_id, ai_generated)
      VALUES (${voucherId}, ${data.companyId}, ${data.type}, ${number}, ${data.date},
        ${data.narration ?? null}, ${data.reference ?? null}, ${totalDr}, ${data.status},
        ${data.gstApplicable}, ${data.placeOfSupply ?? null}, ${data.reverseCharge},
        ${data.costCentreId ?? null}, ${data.aiGenerated})
    `,
    ...data.entries.map((e) =>
      sql`
        INSERT INTO voucher_entries (id, voucher_id, ledger_id, type, amount, narration, bill_ref, bill_date)
        VALUES (${crypto.randomUUID()}, ${voucherId}, ${e.ledgerId}, ${e.type}, ${e.amount},
          ${e.narration ?? null}, ${e.billRef ?? null}, ${e.billDate ?? null})
      `
    ),
    ...(data.gstLines ?? []).map((g) =>
      sql`
        INSERT INTO gst_lines (id, voucher_id, hsn_code, description, quantity, rate, taxable_value,
          igst_rate, cgst_rate, sgst_rate, cess_rate, igst_amount, cgst_amount, sgst_amount, cess_amount, total_tax)
        VALUES (${crypto.randomUUID()}, ${voucherId}, ${g.hsnCode ?? null}, ${g.description ?? null},
          ${g.quantity ?? null}, ${g.rate ?? null}, ${g.taxableValue},
          ${g.igstRate}, ${g.cgstRate}, ${g.sgstRate}, ${g.cessRate},
          ${g.igstAmount}, ${g.cgstAmount}, ${g.sgstAmount}, ${g.cessAmount}, ${g.totalTax})
      `
    ),
    ...(data.inventoryLines ?? []).map((il) =>
      sql`
        INSERT INTO inventory_lines (id, voucher_id, item_id, godown_id, batch_no, serial_no, quantity, rate, amount, discount)
        VALUES (${crypto.randomUUID()}, ${voucherId}, ${il.itemId}, ${il.godownId ?? null},
          ${il.batchNo ?? null}, ${il.serialNo ?? null}, ${il.quantity}, ${il.rate}, ${il.amount}, ${il.discount})
      `
    ),
  ]);

  const vRows = await sql`SELECT * FROM vouchers WHERE id = ${voucherId}`;
  const voucher = vRows[0] as { id: string };

  await sql`
    INSERT INTO audit_logs (id, user_id, company_id, action, entity, entity_id, new_data)
    VALUES (${crypto.randomUUID()}, ${'owner'}, ${data.companyId}, 'CREATE', 'Voucher', ${voucher.id}, ${JSON.stringify({ type: data.type, number, amount: totalDr })})
  `;

  return NextResponse.json({ voucher }, { status: 201 });
}
