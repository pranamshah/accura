import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRows, transformRow } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const party = searchParams.get('party');
  const countOnly = searchParams.get('countOnly') === 'true';
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    if (countOnly) {
      const rows = await sql`
        SELECT COUNT(*) as count FROM vouchers
        WHERE company_id = ${companyId}
        ${type ? sql`AND type = ${type}` : sql``}
      `;
      return NextResponse.json({ count: parseInt(rows[0].count) });
    }

    const rows = await sql`
      SELECT v.*, l.name as party_name, l.gstin as party_gstin
      FROM vouchers v
      LEFT JOIN ledgers l ON v.party_ledger_id = l.id
      WHERE v.company_id = ${companyId}
        ${type ? sql`AND v.type = ${type}` : sql``}
        ${from ? sql`AND v.date >= ${from}` : sql``}
        ${to ? sql`AND v.date <= ${to}` : sql``}
        ${party ? sql`AND v.party_ledger_id = ${party}` : sql``}
      ORDER BY v.date DESC, v.created_at DESC
      LIMIT 500
    `;
    return NextResponse.json({ vouchers: transformRows(rows) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    const [voucher] = await sql`
      INSERT INTO vouchers (
        company_id, type, number, date, narration, reference,
        total_amount, status, is_posted, gst_applicable, gst_type,
        place_of_supply, reverse_charge, party_ledger_id, ai_generated
      ) VALUES (
        ${body.companyId}, ${body.type}, ${body.number}, ${body.date},
        ${body.narration ?? null}, ${body.reference ?? null},
        ${body.totalAmount ?? 0}, ${body.status ?? 'ACTIVE'},
        ${body.isPosted ?? true}, ${body.gstApplicable ?? false},
        ${body.gstType ?? null}, ${body.placeOfSupply ?? null},
        ${body.reverseCharge ?? false}, ${body.partyLedgerId ?? null},
        ${body.aiGenerated ?? false}
      )
      RETURNING *
    `;

    // Insert entries
    if (body.entries && Array.isArray(body.entries)) {
      for (const e of body.entries) {
        if (!e || !e.ledgerId) continue;
        await sql`
          INSERT INTO voucher_entries (voucher_id, ledger_id, type, amount, narration, bill_ref)
          VALUES (${voucher.id}, ${e.ledgerId}, ${e.type}, ${e.amount}, ${e.narration ?? null}, ${e.billRef ?? null})
        `;
      }
    }

    // Insert GST lines
    if (body.gstLines && Array.isArray(body.gstLines)) {
      for (const g of body.gstLines) {
        await sql`
          INSERT INTO gst_lines (voucher_id, hsn_code, taxable_value, igst_rate, cgst_rate, sgst_rate, igst_amount, cgst_amount, sgst_amount, total_tax)
          VALUES (${voucher.id}, ${g.hsnCode ?? null}, ${g.taxableValue ?? 0}, ${g.igstRate ?? 0}, ${g.cgstRate ?? 0}, ${g.sgstRate ?? 0}, ${g.igstAmount ?? 0}, ${g.cgstAmount ?? 0}, ${g.sgstAmount ?? 0}, ${g.totalTax ?? 0})
        `;
      }
    }

    // Insert inventory lines
    if (body.inventoryLines && Array.isArray(body.inventoryLines)) {
      for (const il of body.inventoryLines) {
        if (!il.itemId) continue;
        await sql`
          INSERT INTO inventory_lines (voucher_id, item_id, quantity, rate, amount, discount)
          VALUES (${voucher.id}, ${il.itemId}, ${il.quantity ?? 0}, ${il.rate ?? 0}, ${il.amount ?? 0}, ${il.discount ?? 0})
        `;
      }
    }

    return NextResponse.json({ voucher: transformRow(voucher) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
