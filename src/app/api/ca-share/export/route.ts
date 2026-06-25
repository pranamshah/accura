import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import sql from '@/lib/db';
import JSZip from 'jszip';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { companyId, selections, from, to, caEmail, message } = await req.json();
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    const zip = new JSZip();
    const folder = zip.folder('accura-export')!;

    // Full data backup
    if (selections?.includes('backup')) {
      const [company] = await sql`SELECT * FROM companies WHERE id=${companyId}`;
      const ledgers = await sql`SELECT * FROM ledgers WHERE company_id=${companyId}`;
      const vouchers = await sql`SELECT * FROM vouchers WHERE company_id=${companyId} AND date BETWEEN ${from} AND ${to} ORDER BY date`;
      const entries = await sql`
        SELECT ve.* FROM voucher_entries ve JOIN vouchers v ON v.id=ve.voucher_id
        WHERE v.company_id=${companyId} AND v.date BETWEEN ${from} AND ${to}`;
      folder.file('backup.json', JSON.stringify({ company, ledgers, vouchers, entries }, null, 2));
    }

    // Trial Balance
    if (selections?.includes('trial-balance')) {
      const rows = await sql`
        SELECT l.name, l.nature,
          SUM(CASE WHEN ve.type='DEBIT' THEN ve.amount ELSE 0 END) as dr,
          SUM(CASE WHEN ve.type='CREDIT' THEN ve.amount ELSE 0 END) as cr
        FROM ledgers l
        LEFT JOIN voucher_entries ve ON ve.ledger_id=l.id
        LEFT JOIN vouchers v ON v.id=ve.voucher_id AND v.date BETWEEN ${from} AND ${to}
        WHERE l.company_id=${companyId}
        GROUP BY l.id, l.name, l.nature
        ORDER BY l.nature, l.name`;

      const csv = ['Ledger,Nature,Debit,Credit', ...rows.map((r: { name: string; nature: string; dr: number; cr: number }) => `"${r.name}","${r.nature}",${r.dr || 0},${r.cr || 0}`)].join('\n');
      folder.file('trial-balance.csv', csv);
    }

    // Day Book
    if (selections?.includes('day-book')) {
      const rows = await sql`
        SELECT v.date::text, v.number, v.type, v.narration, v.total_amount,
               l.name as party
        FROM vouchers v LEFT JOIN ledgers l ON l.id=v.party_ledger_id
        WHERE v.company_id=${companyId} AND v.date BETWEEN ${from} AND ${to}
        ORDER BY v.date, v.created_at`;
      const csv = ['Date,Voucher No,Type,Party,Amount,Narration',
        ...rows.map((r: { date: string; number: string; type: string; party: string; total_amount: number; narration: string }) =>
          `"${r.date}","${r.number}","${r.type}","${r.party || ''}",${r.total_amount},"${(r.narration || '').replace(/"/g, "'")}"`)].join('\n');
      folder.file('day-book.csv', csv);
    }

    // GSTR-1 JSON
    if (selections?.includes('gstr1')) {
      const gstRows = await sql`
        SELECT v.number, v.date::text, v.total_amount, l.name as party, l.gstin as party_gstin,
               gl.igst_amount, gl.cgst_amount, gl.sgst_amount, gl.taxable_value, gl.igst_rate
        FROM vouchers v
        JOIN gst_lines gl ON gl.voucher_id=v.id
        LEFT JOIN ledgers l ON l.id=v.party_ledger_id
        WHERE v.company_id=${companyId} AND v.type='SALES' AND v.date BETWEEN ${from} AND ${to}`;
      folder.file('gstr1.json', JSON.stringify(gstRows, null, 2));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    // Log the share
    try {
      await sql`INSERT INTO ca_share_log (company_id, shared_by, ca_email, period_from, period_to, selections, created_at)
        VALUES (${companyId}, ${session.id}, ${caEmail || null}, ${from}, ${to}, ${JSON.stringify(selections)}, NOW())
        ON CONFLICT DO NOTHING`;
    } catch {
      // Table may not exist yet — non-fatal
    }

    if (caEmail) {
      // Email would go here via SMTP — returning download for now
      // TODO: wire up nodemailer with SMTP_HOST env
    }

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="accura-ca-export-${from}-to-${to}.zip"`,
      },
    });
  } catch (err) {
    console.error('ca-share export error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
