import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { seedCompanyDefaults } from '@/lib/seed-company';

export async function GET() {
  try {
    // Create all tables
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        legal_name TEXT,
        gstin TEXT,
        pan TEXT,
        tan TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        state_code TEXT,
        pincode TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_ifsc TEXT,
        bank_branch TEXT,
        logo_url TEXT,
        financial_year_start INT NOT NULL DEFAULT 4,
        currency TEXT NOT NULL DEFAULT 'INR',
        currency_symbol TEXT NOT NULL DEFAULT '₹',
        tax_registered BOOLEAN NOT NULL DEFAULT false,
        composite_dealer BOOLEAN NOT NULL DEFAULT false,
        features JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ADMIN',
        company_id TEXT REFERENCES companies(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ledger_groups (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        alias TEXT,
        parent_id TEXT REFERENCES ledger_groups(id),
        nature TEXT NOT NULL CHECK (nature IN ('ASSETS','LIABILITIES','INCOME','EXPENSES')),
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ledgers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        group_id TEXT NOT NULL REFERENCES ledger_groups(id),
        name TEXT NOT NULL,
        alias TEXT,
        opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
        opening_balance_type TEXT NOT NULL DEFAULT 'DEBIT',
        gstin TEXT, pan TEXT, mobile_no TEXT, email TEXT,
        address TEXT, city TEXT, state TEXT, state_code TEXT, pincode TEXT,
        credit_limit NUMERIC(15,2), credit_days INT,
        is_party BOOLEAN NOT NULL DEFAULT false,
        party_type TEXT, gst_type TEXT DEFAULT 'REGULAR',
        tds_applicable BOOLEAN NOT NULL DEFAULT false,
        tds_section_id TEXT,
        bank_name TEXT, bank_account TEXT, bank_ifsc TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        number TEXT NOT NULL,
        date DATE NOT NULL,
        narration TEXT, reference TEXT,
        total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        is_posted BOOLEAN NOT NULL DEFAULT true,
        gst_applicable BOOLEAN NOT NULL DEFAULT false,
        gst_type TEXT, place_of_supply TEXT,
        reverse_charge BOOLEAN NOT NULL DEFAULT false,
        e_invoice_irn TEXT, e_invoice_qr TEXT,
        e_way_bill_no TEXT, e_way_bill_expiry DATE,
        party_ledger_id TEXT REFERENCES ledgers(id),
        cost_centre_id TEXT,
        ai_generated BOOLEAN NOT NULL DEFAULT false,
        attachments TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS voucher_entries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        ledger_id TEXT NOT NULL REFERENCES ledgers(id),
        type TEXT NOT NULL CHECK (type IN ('DEBIT','CREDIT')),
        amount NUMERIC(15,2) NOT NULL,
        narration TEXT, bill_ref TEXT, bill_date DATE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS gst_lines (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        hsn_code TEXT, description TEXT,
        quantity NUMERIC(15,3), rate NUMERIC(15,2),
        taxable_value NUMERIC(15,2) NOT NULL DEFAULT 0,
        igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        cess_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        igst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        cgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        sgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        cess_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_tax NUMERIC(15,2) NOT NULL DEFAULT 0,
        itc_eligible TEXT DEFAULT 'ELIGIBLE'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, alias TEXT, code TEXT,
        hsn_code TEXT, sac_code TEXT, unit_id TEXT,
        stock_group_id TEXT, category TEXT,
        igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        cess_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        opening_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
        opening_rate NUMERIC(15,2) NOT NULL DEFAULT 0,
        reorder_level NUMERIC(15,3),
        cost_price NUMERIC(15,2), selling_price NUMERIC(15,2),
        is_batch_enabled BOOLEAN NOT NULL DEFAULT false,
        is_serial_enabled BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS inventory_lines (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES items(id),
        godown_id TEXT, batch_no TEXT, serial_no TEXT,
        quantity NUMERIC(15,3) NOT NULL,
        rate NUMERIC(15,2) NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        discount NUMERIC(5,2) NOT NULL DEFAULT 0
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        code TEXT, name TEXT NOT NULL, designation TEXT, department TEXT,
        date_of_joining DATE, date_of_leaving DATE,
        pan TEXT, aadhaar TEXT, uan TEXT, esic_no TEXT,
        bank_account TEXT, bank_ifsc TEXT, bank_name TEXT,
        basic_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
        hra NUMERIC(15,2) NOT NULL DEFAULT 0,
        conveyance NUMERIC(15,2) NOT NULL DEFAULT 0,
        special NUMERIC(15,2) NOT NULL DEFAULT 0,
        pf_applicable BOOLEAN NOT NULL DEFAULT true,
        esi_applicable BOOLEAN NOT NULL DEFAULT true,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        employee_id TEXT NOT NULL REFERENCES employees(id),
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        month INT NOT NULL, year INT NOT NULL,
        working_days INT NOT NULL DEFAULT 26, present_days INT NOT NULL DEFAULT 26,
        basic NUMERIC(15,2) NOT NULL DEFAULT 0, hra NUMERIC(15,2) NOT NULL DEFAULT 0,
        conveyance NUMERIC(15,2) NOT NULL DEFAULT 0, special NUMERIC(15,2) NOT NULL DEFAULT 0,
        other_earnings NUMERIC(15,2) NOT NULL DEFAULT 0,
        gross_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
        pf_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
        esi_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
        tds NUMERIC(15,2) NOT NULL DEFAULT 0,
        other_deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
        net_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
        pf_employer NUMERIC(15,2) NOT NULL DEFAULT 0,
        esi_employer NUMERIC(15,2) NOT NULL DEFAULT 0,
        is_paid BOOLEAN NOT NULL DEFAULT false,
        paid_on DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(employee_id, month, year)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS stock_groups (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        parent_id TEXT,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        formal_name TEXT,
        is_simple BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS godowns (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, address TEXT,
        is_main BOOLEAN NOT NULL DEFAULT false
      )
    `;

    // ── Safe migrations — idempotent ALTER TABLE IF NOT EXISTS ────────────────
    // These fix "column X does not exist" errors on live DBs whose tables were
    // created before the column was added to the CREATE TABLE statement.

    // users
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'ADMIN'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    // companies
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS gstin TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS pan TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS tan TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS state_code TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS pincode TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_ifsc TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_branch TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS financial_year_start INT NOT NULL DEFAULT 4`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR'`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency_symbol TEXT NOT NULL DEFAULT '₹'`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_registered BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS composite_dealer BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'`;
    await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    // ledger_groups
    await sql`ALTER TABLE ledger_groups ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE ledger_groups ADD COLUMN IF NOT EXISTS alias TEXT`;
    await sql`ALTER TABLE ledger_groups ADD COLUMN IF NOT EXISTS parent_id TEXT`;
    await sql`ALTER TABLE ledger_groups ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE ledger_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    // ledgers
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS group_id TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS alias TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS opening_balance_type TEXT NOT NULL DEFAULT 'DEBIT'`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS gstin TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS pan TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS mobile_no TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS address TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS city TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS state TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS state_code TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS pincode TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2)`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS credit_days INT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS is_party BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS party_type TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS gst_type TEXT DEFAULT 'REGULAR'`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS tds_section_id TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS tds_rate NUMERIC(5,2) DEFAULT 0`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS bank_name TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS bank_account TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS bank_ifsc TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS description TEXT`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    // vouchers
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS narration TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reference TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS gst_type TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS place_of_supply TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reverse_charge BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS e_invoice_irn TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS e_invoice_qr TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS e_way_bill_no TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS e_way_bill_expiry DATE`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS party_ledger_id TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS cost_centre_id TEXT`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}'`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    // voucher_entries
    await sql`ALTER TABLE voucher_entries ADD COLUMN IF NOT EXISTS narration TEXT`;
    await sql`ALTER TABLE voucher_entries ADD COLUMN IF NOT EXISTS bill_ref TEXT`;
    await sql`ALTER TABLE voucher_entries ADD COLUMN IF NOT EXISTS bill_date DATE`;

    // items
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Nos'`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS group_name TEXT`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS alias TEXT`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS code TEXT`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS hsn_code TEXT`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS sac_code TEXT`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2)`;
    await sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS selling_price NUMERIC(15,2)`;

    // Backfill default chart of accounts for ALL companies — adds any missing
    // groups (including the new hierarchy groups) and wires parent relationships.
    const allCompanies = await sql`SELECT id FROM companies`;
    for (const c of allCompanies) {
      await seedCompanyDefaults(c.id);
    }

    await sql`
      CREATE TABLE IF NOT EXISTS ca_share_log (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL,
        shared_by TEXT,
        ca_email TEXT,
        period_from DATE,
        period_to DATE,
        selections JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT, company_id TEXT,
        action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT,
        old_data JSONB, new_data JSONB, ip TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_ledgers_company ON ledgers(company_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_company_date ON vouchers(company_id, date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_entries_voucher ON voucher_entries(voucher_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_entries_ledger ON voucher_entries(ledger_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gst_lines_voucher ON gst_lines(voucher_id)`;

    // Seed default admin user + company (only if no users exist yet)
    const existingUsers = await sql`SELECT id FROM users LIMIT 1`;
    let seeded = false;
    if (!existingUsers[0]) {
      const SEED_EMAIL = 'admin@accura.in';
      const SEED_PASSWORD = 'Admin@1234';
      const SEED_COMPANY = 'Accura Demo Company';

      const encoder = new TextEncoder();
      const hash = await crypto.subtle.digest('SHA-256', encoder.encode(SEED_PASSWORD));
      const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hash)));

      const [company] = await sql`
        INSERT INTO companies (name, financial_year_start, currency, currency_symbol, features)
        VALUES (${SEED_COMPANY}, 4, 'INR', '₹', '{"gst":true,"inventory":true}')
        RETURNING *
      `;

      const [user] = await sql`
        INSERT INTO users (email, name, password_hash, role, company_id)
        VALUES (${SEED_EMAIL}, 'Admin', ${passwordHash}, 'ADMIN', ${company.id})
        RETURNING *
      `;

      await seedCompanyDefaults(company.id);

      console.log('Seeded default user:', user.id);
      seeded = true;
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully.',
      ...(seeded ? {
        credentials: {
          email: 'admin@accura.in',
          password: 'Admin@1234',
          note: 'Change your password after first login via your company settings.',
        },
      } : {
        note: 'Users already exist — no seed applied.',
      }),
    });
  } catch (err) {
    console.error('Init error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
