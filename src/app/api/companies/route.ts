import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { transformRows } from '@/lib/utils';
import { seedCompanyDefaults } from '@/lib/seed-company';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await sql`
      SELECT * FROM companies
      WHERE id IN (SELECT company_id FROM users WHERE id = ${session.id})
      OR id = ${session.companyId ?? ''}
      ORDER BY name
    `;
    return NextResponse.json({ companies: transformRows(rows) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const [company] = await sql`
      INSERT INTO companies (name, legal_name, gstin, pan, tan, address, city, state, state_code, pincode,
                             phone, email, website, bank_name, bank_account, bank_ifsc, bank_branch,
                             financial_year_start, currency, currency_symbol, tax_registered, composite_dealer, features)
      VALUES (${body.name}, ${body.legalName ?? null}, ${body.gstin ?? null}, ${body.pan ?? null},
              ${body.tan ?? null}, ${body.address ?? null}, ${body.city ?? null}, ${body.state ?? null},
              ${body.stateCode ?? null}, ${body.pincode ?? null}, ${body.phone ?? null}, ${body.email ?? null},
              ${body.website ?? null}, ${body.bankName ?? null}, ${body.bankAccount ?? null},
              ${body.bankIfsc ?? null}, ${body.bankBranch ?? null},
              ${body.financialYearStart ?? 4}, ${body.currency ?? 'INR'}, ${body.currencySymbol ?? '₹'},
              ${body.taxRegistered ?? false}, ${body.compositeDealer ?? false},
              ${JSON.stringify(body.features ?? {})}::jsonb)
      RETURNING *
    `;
    await seedCompanyDefaults(company.id);
    return NextResponse.json({ company });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
