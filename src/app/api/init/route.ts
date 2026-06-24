import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    // Run all CREATE TABLE IF NOT EXISTS statements (idempotent)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'ADMIN',
        avatar TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_token TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        legal_name TEXT,
        gstin TEXT,
        pan TEXT,
        tan TEXT,
        cin TEXT,
        msme_number TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        state_code TEXT,
        pincode TEXT,
        country TEXT DEFAULT 'India',
        phone TEXT,
        email TEXT,
        website TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_ifsc TEXT,
        bank_branch TEXT,
        logo_url TEXT,
        financial_year_start INTEGER DEFAULT 4,
        currency_symbol TEXT DEFAULT '₹',
        currency TEXT DEFAULT 'INR',
        tax_registered BOOLEAN DEFAULT TRUE,
        composite_dealer BOOLEAN DEFAULT FALSE,
        business_type TEXT DEFAULT 'PRIVATE_LIMITED',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS company_users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'ACCOUNTANT',
        UNIQUE(company_id, user_id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS ledger_groups (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        alias TEXT,
        parent_id TEXT REFERENCES ledger_groups(id),
        nature TEXT NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS ledgers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        group_id TEXT NOT NULL REFERENCES ledger_groups(id),
        name TEXT NOT NULL,
        alias TEXT,
        opening_balance NUMERIC DEFAULT 0,
        opening_balance_type TEXT DEFAULT 'DEBIT',
        gstin TEXT,
        pan TEXT,
        tan TEXT,
        mobile_no TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        state_code TEXT,
        pincode TEXT,
        credit_limit NUMERIC,
        credit_days INTEGER,
        is_party BOOLEAN DEFAULT FALSE,
        party_type TEXT,
        gst_type TEXT,
        tds_applicable BOOLEAN DEFAULT FALSE,
        tds_section_id TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_ifsc TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, name)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        number TEXT NOT NULL,
        date TIMESTAMPTZ NOT NULL,
        narration TEXT,
        reference TEXT,
        total_amount NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        is_posted BOOLEAN DEFAULT TRUE,
        gst_applicable BOOLEAN DEFAULT FALSE,
        gst_type TEXT,
        place_of_supply TEXT,
        reverse_charge BOOLEAN DEFAULT FALSE,
        e_invoice_irn TEXT,
        e_invoice_qr TEXT,
        e_way_bill_no TEXT,
        e_way_bill_expiry TIMESTAMPTZ,
        cost_centre_id TEXT,
        ai_generated BOOLEAN DEFAULT FALSE,
        attachments TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, type, number)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS voucher_entries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        ledger_id TEXT NOT NULL REFERENCES ledgers(id),
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        narration TEXT,
        bill_ref TEXT,
        bill_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS gst_lines (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        hsn_code TEXT, description TEXT, quantity NUMERIC, rate NUMERIC,
        taxable_value NUMERIC NOT NULL,
        igst_rate NUMERIC DEFAULT 0, cgst_rate NUMERIC DEFAULT 0,
        sgst_rate NUMERIC DEFAULT 0, cess_rate NUMERIC DEFAULT 0,
        igst_amount NUMERIC DEFAULT 0, cgst_amount NUMERIC DEFAULT 0,
        sgst_amount NUMERIC DEFAULT 0, cess_amount NUMERIC DEFAULT 0,
        total_tax NUMERIC DEFAULT 0
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS gst_returns (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        type TEXT NOT NULL, period TEXT NOT NULL, year INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING', filed_on TIMESTAMPTZ, arn TEXT,
        json_data JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, alias TEXT, code TEXT, hsn_code TEXT, sac_code TEXT,
        unit_id TEXT, category TEXT,
        igst_rate NUMERIC DEFAULT 0, cgst_rate NUMERIC DEFAULT 0,
        sgst_rate NUMERIC DEFAULT 0, cess_rate NUMERIC DEFAULT 0,
        opening_stock NUMERIC DEFAULT 0, opening_rate NUMERIC DEFAULT 0,
        reorder_level NUMERIC, max_stock NUMERIC,
        is_batch_enabled BOOLEAN DEFAULT FALSE, is_serial_enabled BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE, description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, name)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, symbol TEXT NOT NULL, is_system BOOLEAN DEFAULT FALSE
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS godowns (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, address TEXT, is_main BOOLEAN DEFAULT FALSE
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_lines (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES items(id),
        godown_id TEXT REFERENCES godowns(id),
        batch_no TEXT, serial_no TEXT,
        quantity NUMERIC NOT NULL, rate NUMERIC NOT NULL, amount NUMERIC NOT NULL,
        discount NUMERIC DEFAULT 0
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS cost_centres (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, parent_id TEXT REFERENCES cost_centres(id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tds_sections (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        section TEXT NOT NULL, description TEXT,
        rate NUMERIC NOT NULL, threshold_limit NUMERIC DEFAULT 0
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS tds_entries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        voucher_id TEXT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        section_id TEXT NOT NULL REFERENCES tds_sections(id),
        taxable_amount NUMERIC NOT NULL, tds_amount NUMERIC NOT NULL,
        challan_no TEXT, challan_date TIMESTAMPTZ, deposited BOOLEAN DEFAULT FALSE
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_groups (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, pf_applicable BOOLEAN DEFAULT FALSE, esi_applicable BOOLEAN DEFAULT FALSE
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        group_id TEXT REFERENCES payroll_groups(id),
        code TEXT, name TEXT NOT NULL, designation TEXT, department TEXT,
        date_of_joining TIMESTAMPTZ, date_of_leaving TIMESTAMPTZ,
        pan TEXT, aadhaar TEXT, uan TEXT, esic_no TEXT,
        bank_account TEXT, bank_ifsc TEXT,
        basic_salary NUMERIC DEFAULT 0, hra NUMERIC DEFAULT 0,
        conveyance NUMERIC DEFAULT 0, special NUMERIC DEFAULT 0,
        pf_applicable BOOLEAN DEFAULT FALSE, esi_applicable BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        employee_id TEXT NOT NULL REFERENCES employees(id),
        month INTEGER NOT NULL, year INTEGER NOT NULL,
        working_days NUMERIC DEFAULT 26, present_days NUMERIC DEFAULT 26,
        basic NUMERIC NOT NULL, hra NUMERIC DEFAULT 0,
        conveyance NUMERIC DEFAULT 0, special NUMERIC DEFAULT 0,
        other_earnings NUMERIC DEFAULT 0, gross_salary NUMERIC NOT NULL,
        pf_employee NUMERIC DEFAULT 0, esi_employee NUMERIC DEFAULT 0,
        tds NUMERIC DEFAULT 0, other_deductions NUMERIC DEFAULT 0,
        net_salary NUMERIC NOT NULL, pf_employer NUMERIC DEFAULT 0,
        esi_employer NUMERIC DEFAULT 0,
        is_paid BOOLEAN DEFAULT FALSE, paid_on TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL, account_no TEXT NOT NULL, bank_name TEXT NOT NULL,
        ifsc TEXT, branch TEXT, opening_balance NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bank_reconciliations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
        voucher_id TEXT, date TIMESTAMPTZ NOT NULL, description TEXT,
        amount NUMERIC NOT NULL, type TEXT NOT NULL,
        is_reconciled BOOLEAN DEFAULT FALSE, reconciled_date TIMESTAMPTZ
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS ca_shares (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        ca_email TEXT NOT NULL, access_level TEXT DEFAULT 'READ',
        shared_by TEXT NOT NULL, expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS ai_entries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id TEXT, prompt TEXT NOT NULL, response TEXT NOT NULL,
        voucher_id TEXT, type TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT, company_id TEXT,
        action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT,
        old_data JSONB, new_data JSONB, ip TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    // Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_company_date ON vouchers(company_id, date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_company_type ON vouchers(company_id, type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_entries_voucher ON voucher_entries(voucher_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_entries_ledger ON voucher_entries(ledger_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ledgers_company ON ledgers(company_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gst_lines_voucher ON gst_lines(voucher_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at DESC)`;

    return NextResponse.json({ ok: true, message: 'Database initialized successfully' });
  } catch (err) {
    console.error('Init error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
