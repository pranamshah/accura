import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rows = await sql`SELECT * FROM vouchers WHERE id = ${id} LIMIT 1`;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const voucher = rows[0] as { id: string };

  const entries = await sql`
    SELECT ve.*, l.name as ledger_name, l.gstin as ledger_gstin,
      lg.name as group_name, lg.nature as group_nature
    FROM voucher_entries ve
    JOIN ledgers l ON ve.ledger_id = l.id
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE ve.voucher_id = ${id}
  `;

  const gstLines = await sql`SELECT * FROM gst_lines WHERE voucher_id = ${id}`;

  const inventoryLines = await sql`
    SELECT il.*, i.name as item_name, u.symbol as unit_symbol, g.name as godown_name
    FROM inventory_lines il
    JOIN items i ON il.item_id = i.id
    LEFT JOIN units u ON i.unit_id = u.id
    LEFT JOIN godowns g ON il.godown_id = g.id
    WHERE il.voucher_id = ${id}
  `;

  const tdsEntries = await sql`
    SELECT te.*, ts.section, ts.description, ts.rate
    FROM tds_entries te
    JOIN tds_sections ts ON te.section_id = ts.id
    WHERE te.voucher_id = ${id}
  `;

  return NextResponse.json({
    voucher: {
      ...voucher,
      entries: entries.map((e) => ({
        ...e,
        ledger: {
          id: (e as { ledger_id: string }).ledger_id,
          name: (e as { ledger_name: string }).ledger_name,
          gstin: (e as { ledger_gstin: string }).ledger_gstin,
          group: { name: (e as { group_name: string }).group_name, nature: (e as { group_nature: string }).group_nature },
        },
      })),
      gstLines,
      inventoryLines: inventoryLines.map((il) => ({
        ...il,
        item: { id: (il as { item_id: string }).item_id, name: (il as { item_name: string }).item_name, unit: { symbol: (il as { unit_symbol: string }).unit_symbol } },
        godown: (il as { godown_id: string | null }).godown_id ? { name: (il as { godown_name: string }).godown_name } : null,
      })),
      tdsEntries: tdsEntries.map((te) => ({
        ...te,
        section: { section: (te as { section: string }).section, description: (te as { description: string }).description, rate: (te as { rate: number }).rate },
      })),
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as {
    entries?: Array<{ ledgerId: string; type: string; amount: number; narration?: string }>;
    gstLines?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  const oldRows = await sql`SELECT * FROM vouchers WHERE id = ${id} LIMIT 1`;
  if (oldRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const old = oldRows[0] as { company_id: string };

  const { entries, gstLines, inventoryLines: _inv, ...voucherData } = body;

  const queries = [
    sql`
      UPDATE vouchers SET
        narration = COALESCE(${voucherData.narration as string ?? null}, narration),
        reference = COALESCE(${voucherData.reference as string ?? null}, reference),
        status = COALESCE(${voucherData.status as string ?? null}, status),
        date = COALESCE(${voucherData.date as string ?? null}, date),
        gst_applicable = COALESCE(${voucherData.gstApplicable as boolean ?? null}, gst_applicable),
        place_of_supply = COALESCE(${voucherData.placeOfSupply as string ?? null}, place_of_supply),
        updated_at = NOW()
      WHERE id = ${id}
    `,
  ];

  if (entries) {
    queries.push(sql`DELETE FROM voucher_entries WHERE voucher_id = ${id}`);
    for (const e of entries) {
      queries.push(sql`
        INSERT INTO voucher_entries (id, voucher_id, ledger_id, type, amount, narration)
        VALUES (${crypto.randomUUID()}, ${id}, ${e.ledgerId}, ${e.type}, ${e.amount}, ${e.narration ?? null})
      `);
    }
  }

  if (gstLines) {
    queries.push(sql`DELETE FROM gst_lines WHERE voucher_id = ${id}`);
    for (const g of gstLines) {
      queries.push(sql`
        INSERT INTO gst_lines (id, voucher_id, hsn_code, taxable_value, igst_rate, cgst_rate, sgst_rate,
          igst_amount, cgst_amount, sgst_amount, total_tax)
        VALUES (${crypto.randomUUID()}, ${id}, ${g.hsnCode as string ?? null}, ${g.taxableValue as number},
          ${g.igstRate as number ?? 0}, ${g.cgstRate as number ?? 0}, ${g.sgstRate as number ?? 0},
          ${g.igstAmount as number ?? 0}, ${g.cgstAmount as number ?? 0}, ${g.sgstAmount as number ?? 0},
          ${g.totalTax as number ?? 0})
      `);
    }
  }

  await sql.transaction(queries);

  const updatedRows = await sql`SELECT * FROM vouchers WHERE id = ${id} LIMIT 1`;
  const voucher = updatedRows[0];

  await sql`
    INSERT INTO audit_logs (id, user_id, company_id, action, entity, entity_id, old_data, new_data)
    VALUES (gen_random_uuid()::text, ${'owner'}, ${old.company_id}, 'UPDATE', 'Voucher', ${id}, ${JSON.stringify(old)}, ${JSON.stringify(voucherData)})
  `;

  return NextResponse.json({ voucher });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await sql`UPDATE vouchers SET status = 'CANCELLED', updated_at = NOW() WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}
