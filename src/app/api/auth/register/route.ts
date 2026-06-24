import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createSession, getSessionCookieName, getSessionDuration } from '@/lib/session';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

const DEFAULT_GROUPS = [
  // Capital & Liabilities
  { name: 'Capital Account', nature: 'LIABILITIES', alias: 'Capital' },
  { name: 'Reserves & Surplus', nature: 'LIABILITIES', alias: 'Reserves' },
  { name: 'Loans (Liability)', nature: 'LIABILITIES', alias: 'Loans' },
  { name: 'Current Liabilities', nature: 'LIABILITIES', alias: 'CL' },
  { name: 'Sundry Creditors', nature: 'LIABILITIES', alias: 'Creditors' },
  { name: 'Duties & Taxes', nature: 'LIABILITIES', alias: 'Duties' },
  { name: 'Provisions', nature: 'LIABILITIES', alias: 'Provisions' },
  // Assets
  { name: 'Fixed Assets', nature: 'ASSETS', alias: 'FA' },
  { name: 'Investments', nature: 'ASSETS', alias: 'Investments' },
  { name: 'Current Assets', nature: 'ASSETS', alias: 'CA' },
  { name: 'Cash-in-Hand', nature: 'ASSETS', alias: 'Cash' },
  { name: 'Bank Accounts', nature: 'ASSETS', alias: 'Bank' },
  { name: 'Sundry Debtors', nature: 'ASSETS', alias: 'Debtors' },
  { name: 'Stock-in-Hand', nature: 'ASSETS', alias: 'Stock' },
  { name: 'Loans & Advances (Asset)', nature: 'ASSETS', alias: 'Loans Asset' },
  { name: 'Deposits (Asset)', nature: 'ASSETS', alias: 'Deposits' },
  // Income
  { name: 'Sales Accounts', nature: 'INCOME', alias: 'Sales' },
  { name: 'Direct Income', nature: 'INCOME', alias: 'Direct Income' },
  { name: 'Indirect Income', nature: 'INCOME', alias: 'Indirect Income' },
  // Expenses
  { name: 'Purchase Accounts', nature: 'EXPENSES', alias: 'Purchases' },
  { name: 'Direct Expenses', nature: 'EXPENSES', alias: 'Direct Exp' },
  { name: 'Indirect Expenses', nature: 'EXPENSES', alias: 'Indirect Exp' },
  { name: 'Salary Expenses', nature: 'EXPENSES', alias: 'Salary' },
];

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, companyName } = await req.json();
    if (!email || !password || !companyName) {
      return NextResponse.json({ error: 'Email, password and company name required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (existing[0]) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const passwordHash = await hashPassword(password);

    // Create company
    const [company] = await sql`
      INSERT INTO companies (name, financial_year_start, currency, currency_symbol, features)
      VALUES (${companyName.trim()}, 4, 'INR', '₹', '{"gst":true,"inventory":true}')
      RETURNING *
    `;

    // Create user
    const [user] = await sql`
      INSERT INTO users (email, name, password_hash, role, company_id)
      VALUES (${email.toLowerCase().trim()}, ${name?.trim() ?? null}, ${passwordHash}, 'ADMIN', ${company.id})
      RETURNING *
    `;

    // Seed default ledger groups
    for (const g of DEFAULT_GROUPS) {
      await sql`
        INSERT INTO ledger_groups (company_id, name, alias, nature, is_system)
        VALUES (${company.id}, ${g.name}, ${g.alias}, ${g.nature}, true)
        ON CONFLICT DO NOTHING
      `;
    }

    // Seed default ledgers
    const cashGroup = await sql`SELECT id FROM ledger_groups WHERE company_id = ${company.id} AND name = 'Cash-in-Hand' LIMIT 1`;
    if (cashGroup[0]) {
      await sql`
        INSERT INTO ledgers (company_id, group_id, name, opening_balance, opening_balance_type, is_system)
        VALUES (${company.id}, ${cashGroup[0].id}, 'Cash', 0, 'DEBIT', true)
        ON CONFLICT DO NOTHING
      `;
    }

    const session = await createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.company_id },
      company: { id: company.id, name: company.name },
    });
    res.cookies.set(getSessionCookieName(), session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getSessionDuration() / 1000,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error: ' + String(err) }, { status: 500 });
  }
}
