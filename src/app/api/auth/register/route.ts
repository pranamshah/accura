import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { createToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

// Ledger group definitions ordered so parents always come before children
const GROUP_DEFS: Array<{ name: string; nature: string; parent?: string }> = [
  // LIABILITIES (roots first)
  { name: 'Capital Account', nature: 'LIABILITIES' },
  { name: 'Current Liabilities', nature: 'LIABILITIES' },
  { name: 'Loans (Liability)', nature: 'LIABILITIES' },
  // LIABILITIES children
  { name: 'Sundry Creditors', nature: 'LIABILITIES', parent: 'Current Liabilities' },
  { name: 'Duties & Taxes', nature: 'LIABILITIES', parent: 'Current Liabilities' },
  { name: 'Provisions', nature: 'LIABILITIES', parent: 'Current Liabilities' },
  { name: 'Bank Overdraft', nature: 'LIABILITIES', parent: 'Loans (Liability)' },
  { name: 'Secured Loans', nature: 'LIABILITIES', parent: 'Loans (Liability)' },
  // ASSETS (roots first)
  { name: 'Fixed Assets', nature: 'ASSETS' },
  { name: 'Current Assets', nature: 'ASSETS' },
  { name: 'Investments', nature: 'ASSETS' },
  // ASSETS children
  { name: 'Cash-in-Hand', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Bank Accounts', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Sundry Debtors', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Stock-in-Hand', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Loans & Advances (Asset)', nature: 'ASSETS', parent: 'Current Assets' },
  // INCOME
  { name: 'Sales Accounts', nature: 'INCOME' },
  { name: 'Other Income', nature: 'INCOME' },
  // EXPENSES
  { name: 'Purchase Accounts', nature: 'EXPENSES' },
  { name: 'Direct Expenses', nature: 'EXPENSES' },
  { name: 'Indirect Expenses', nature: 'EXPENSES' },
];

// Default ledgers: [groupName, ledgerName]
const DEFAULT_LEDGERS: Array<[string, string]> = [
  ['Cash-in-Hand', 'Cash'],
  ['Sales Accounts', 'Sales'],
  ['Purchase Accounts', 'Purchases'],
  ['Duties & Taxes', 'CGST'],
  ['Duties & Taxes', 'SGST'],
  ['Duties & Taxes', 'IGST'],
  ['Duties & Taxes', 'TDS Payable'],
  ['Direct Expenses', 'Salary'],
  ['Indirect Expenses', 'Rent'],
  ['Capital Account', 'Capital'],
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string;
      email?: string;
      password?: string;
      companyName?: string;
      gstin?: string;
      pan?: string;
      state?: string;
      financialYearStart?: number;
    };

    const { name, email, password, companyName, gstin, pan, state, financialYearStart } = body;

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: 'name, email, password, and companyName are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const companyId = crypto.randomUUID();

    // Build group IDs map
    const groupId: Record<string, string> = {};
    for (const gd of GROUP_DEFS) {
      groupId[gd.name] = crypto.randomUUID();
    }

    // Insert user
    await sql`
      INSERT INTO users (id, email, name, password, role)
      VALUES (${userId}, ${email.toLowerCase()}, ${name}, ${hashedPassword}, 'ADMIN')
    `;

    // Insert company
    await sql`
      INSERT INTO companies (id, name, gstin, pan, state, financial_year_start, tax_registered)
      VALUES (
        ${companyId},
        ${companyName},
        ${gstin ?? null},
        ${pan ?? null},
        ${state ?? null},
        ${financialYearStart ?? 4},
        true
      )
    `;

    // Link user to company as ADMIN
    await sql`
      INSERT INTO company_users (id, company_id, user_id, role)
      VALUES (${crypto.randomUUID()}, ${companyId}, ${userId}, 'ADMIN')
    `;

    // Insert ledger groups - ordered so parents exist before children
    for (const gd of GROUP_DEFS) {
      const parentId = gd.parent ? groupId[gd.parent] : null;
      await sql`
        INSERT INTO ledger_groups (id, company_id, name, nature, parent_id, is_system)
        VALUES (${groupId[gd.name]}, ${companyId}, ${gd.name}, ${gd.nature}, ${parentId}, true)
      `;
    }

    // Insert default ledgers
    for (const [grpName, ledgerName] of DEFAULT_LEDGERS) {
      await sql`
        INSERT INTO ledgers (id, company_id, group_id, name, is_system, is_active)
        VALUES (${crypto.randomUUID()}, ${companyId}, ${groupId[grpName]}, ${ledgerName}, true, true)
      `;
    }

    // Fetch created user and company for response
    const [userRow] = await sql`SELECT id, email, name, role, created_at FROM users WHERE id = ${userId}`;
    const [companyRow] = await sql`SELECT * FROM companies WHERE id = ${companyId}`;

    // Set session cookie
    const token = createToken({ userId, email: email.toLowerCase(), name });
    const response = NextResponse.json({ user: userRow, company: companyRow }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
    });

    return response;
  } catch (err) {
    console.error('[auth/register]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
