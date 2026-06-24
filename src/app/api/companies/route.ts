import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { transformRows } from '@/lib/db/transform';
import { z } from 'zod';
import { readToken, SESSION_COOKIE } from '@/lib/session';
import type { Company } from '@/types';

function getUserIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = readToken(token);
  return payload?.userId ?? null;
}

const companySchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  financialYearStart: z.number().min(1).max(12).default(4),
  businessType: z
    .enum([
      'SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LLP',
      'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'OPC', 'TRUST', 'NGO',
    ])
    .default('PRIVATE_LIMITED'),
  taxRegistered: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req) ?? req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await sql`
    SELECT c.* FROM companies c
    JOIN company_users cu ON c.id = cu.company_id
    WHERE cu.user_id = ${userId}
    ORDER BY c.created_at DESC
  `;

  return NextResponse.json({ companies: transformRows<Company>(rows as Record<string, unknown>[]) });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const userId = getUserIdFromRequest(req) ?? (body as { userId?: string }).userId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = crypto.randomUUID();

  const groupDefs: Array<{ name: string; nature: string; parent?: string }> = [
    { name: 'Capital Account', nature: 'LIABILITIES' },
    { name: 'Current Liabilities', nature: 'LIABILITIES' },
    { name: 'Sundry Creditors', nature: 'LIABILITIES', parent: 'Current Liabilities' },
    { name: 'Duties & Taxes', nature: 'LIABILITIES', parent: 'Current Liabilities' },
    { name: 'Provisions', nature: 'LIABILITIES', parent: 'Current Liabilities' },
    { name: 'Loans (Liability)', nature: 'LIABILITIES' },
    { name: 'Fixed Assets', nature: 'ASSETS' },
    { name: 'Current Assets', nature: 'ASSETS' },
    { name: 'Cash-in-Hand', nature: 'ASSETS', parent: 'Current Assets' },
    { name: 'Bank Accounts', nature: 'ASSETS', parent: 'Current Assets' },
    { name: 'Sundry Debtors', nature: 'ASSETS', parent: 'Current Assets' },
    { name: 'Stock-in-Hand', nature: 'ASSETS', parent: 'Current Assets' },
    { name: 'Loans & Advances (Asset)', nature: 'ASSETS', parent: 'Current Assets' },
    { name: 'Investments', nature: 'ASSETS' },
    { name: 'Sales Accounts', nature: 'INCOME' },
    { name: 'Other Income', nature: 'INCOME' },
    { name: 'Purchase Accounts', nature: 'EXPENSES' },
    { name: 'Direct Expenses', nature: 'EXPENSES' },
    { name: 'Indirect Expenses', nature: 'EXPENSES' },
  ];

  const groupId: Record<string, string> = {};
  for (const gd of groupDefs) groupId[gd.name] = crypto.randomUUID();

  const ledgers: Array<[string, string, boolean]> = [
    ['Cash-in-Hand', 'Cash', true],
    ['Bank Accounts', 'HDFC Bank', false],
    ['Sales Accounts', 'Sales', true],
    ['Purchase Accounts', 'Purchases', true],
    ['Duties & Taxes', 'CGST Output', true],
    ['Duties & Taxes', 'SGST Output', true],
    ['Duties & Taxes', 'IGST Output', true],
    ['Current Assets', 'CGST Input', true],
    ['Current Assets', 'SGST Input', true],
    ['Current Assets', 'IGST Input', true],
    ['Duties & Taxes', 'TDS Payable', true],
    ['Current Liabilities', 'Salary Payable', true],
    ['Indirect Expenses', 'Rent', false],
    ['Capital Account', 'Capital Account', true],
    ['Capital Account', 'Retained Earnings', true],
    ['Indirect Expenses', 'Bank Charges', false],
    ['Indirect Expenses', 'Depreciation', false],
    ['Indirect Expenses', 'Travelling Expenses', false],
    ['Indirect Expenses', 'Salary', false],
  ];

  await sql.transaction([
    sql`
      INSERT INTO companies (id, name, legal_name, gstin, pan, tan, address, city, state, state_code, pincode, phone, email, website, financial_year_start, business_type, tax_registered)
      VALUES (${companyId}, ${d.name}, ${d.legalName ?? null}, ${d.gstin ?? null}, ${d.pan ?? null}, ${d.tan ?? null},
              ${d.address ?? null}, ${d.city ?? null}, ${d.state ?? null}, ${d.stateCode ?? null}, ${d.pincode ?? null},
              ${d.phone ?? null}, ${d.email ?? null}, ${d.website ?? null}, ${d.financialYearStart}, ${d.businessType}, ${d.taxRegistered})
    `,
    sql`INSERT INTO company_users (id, company_id, user_id, role) VALUES (${crypto.randomUUID()}, ${companyId}, ${userId}, 'ADMIN')`,
    sql`INSERT INTO units (id, company_id, name, symbol, is_system) VALUES (${crypto.randomUUID()}, ${companyId}, 'Numbers', 'NOS', true)`,
    sql`INSERT INTO units (id, company_id, name, symbol, is_system) VALUES (${crypto.randomUUID()}, ${companyId}, 'Kilograms', 'KG', true)`,
    sql`INSERT INTO godowns (id, company_id, name, is_main) VALUES (${crypto.randomUUID()}, ${companyId}, 'Main Location', true)`,
    ...groupDefs.map((gd) =>
      sql`INSERT INTO ledger_groups (id, company_id, name, nature, is_system, parent_id) VALUES (${groupId[gd.name]}, ${companyId}, ${gd.name}, ${gd.nature}, true, ${gd.parent ? groupId[gd.parent] : null})`
    ),
    ...ledgers.map(([grpName, name, isSystem]) =>
      sql`INSERT INTO ledgers (id, company_id, group_id, name, is_system) VALUES (${crypto.randomUUID()}, ${companyId}, ${groupId[grpName]}, ${name}, ${isSystem})`
    ),
  ]);

  const rows = await sql`SELECT * FROM companies WHERE id = ${companyId}`;

  return NextResponse.json({ company: rows[0] }, { status: 201 });
}
