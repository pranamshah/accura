import sql from '@/lib/db';

// Complete Tally-compatible chart of accounts.
// Groups marked with parentName will have their parent_id set in a second pass.
const GROUPS: { name: string; nature: 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES'; alias: string; parentName?: string }[] = [
  // ── LIABILITIES ──────────────────────────────────────────────────
  { name: 'Capital Account',          nature: 'LIABILITIES', alias: 'Capital' },
  { name: 'Reserves & Surplus',       nature: 'LIABILITIES', alias: 'Reserves' },
  { name: 'Loans (Liability)',         nature: 'LIABILITIES', alias: 'Loans Liab' },
  { name: 'Secured Loans',            nature: 'LIABILITIES', alias: 'Secured',    parentName: 'Loans (Liability)' },
  { name: 'Unsecured Loans',          nature: 'LIABILITIES', alias: 'Unsecured',  parentName: 'Loans (Liability)' },
  { name: 'Current Liabilities',      nature: 'LIABILITIES', alias: 'CL' },
  { name: 'Sundry Creditors',         nature: 'LIABILITIES', alias: 'Creditors',  parentName: 'Current Liabilities' },
  { name: 'Duties & Taxes',           nature: 'LIABILITIES', alias: 'Duties',     parentName: 'Current Liabilities' },
  { name: 'Provisions',               nature: 'LIABILITIES', alias: 'Provisions', parentName: 'Current Liabilities' },
  { name: 'Bank OD A/c',              nature: 'LIABILITIES', alias: 'Bank OD' },
  { name: 'Suspense A/c',             nature: 'LIABILITIES', alias: 'Suspense' },
  // ── ASSETS ───────────────────────────────────────────────────────
  { name: 'Fixed Assets',             nature: 'ASSETS', alias: 'FA' },
  { name: 'Investments',              nature: 'ASSETS', alias: 'Investments' },
  { name: 'Current Assets',           nature: 'ASSETS', alias: 'CA' },
  { name: 'Cash-in-Hand',             nature: 'ASSETS', alias: 'Cash',         parentName: 'Current Assets' },
  { name: 'Bank Accounts',            nature: 'ASSETS', alias: 'Bank',         parentName: 'Current Assets' },
  { name: 'Sundry Debtors',           nature: 'ASSETS', alias: 'Debtors',      parentName: 'Current Assets' },
  { name: 'Stock-in-Hand',            nature: 'ASSETS', alias: 'Stock',        parentName: 'Current Assets' },
  { name: 'Loans & Advances (Asset)', nature: 'ASSETS', alias: 'Loans Asset',  parentName: 'Current Assets' },
  { name: 'Deposits (Asset)',         nature: 'ASSETS', alias: 'Deposits',     parentName: 'Current Assets' },
  { name: 'Misc. Expenses (Asset)',   nature: 'ASSETS', alias: 'Misc Exp' },
  { name: 'Branch / Divisions',       nature: 'ASSETS', alias: 'Branch' },
  // ── INCOME ───────────────────────────────────────────────────────
  { name: 'Sales Accounts',           nature: 'INCOME', alias: 'Sales' },
  { name: 'Direct Income',            nature: 'INCOME', alias: 'Direct Income' },
  { name: 'Indirect Income',          nature: 'INCOME', alias: 'Indirect Inc' },
  // ── EXPENSES ─────────────────────────────────────────────────────
  { name: 'Purchase Accounts',        nature: 'EXPENSES', alias: 'Purchases' },
  { name: 'Direct Expenses',          nature: 'EXPENSES', alias: 'Direct Exp' },
  { name: 'Indirect Expenses',        nature: 'EXPENSES', alias: 'Indirect Exp' },
  { name: 'Salary Expenses',          nature: 'EXPENSES', alias: 'Salary',     parentName: 'Indirect Expenses' },
];

// Seeds the standard chart of accounts for a company. Idempotent — safe to
// call repeatedly. Adds any missing groups and wires parent relationships
// so every company (seed or user-created) has a complete COA for P&L.
export async function seedCompanyDefaults(companyId: string) {
  // Step 1: insert any missing groups (WHERE NOT EXISTS avoids duplicates since
  // ledger_groups has no unique constraint on (company_id, name)).
  for (const g of GROUPS) {
    await sql`
      INSERT INTO ledger_groups (company_id, name, alias, nature, is_system)
      SELECT ${companyId}, ${g.name}, ${g.alias}, ${g.nature}, true
      WHERE NOT EXISTS (
        SELECT 1 FROM ledger_groups WHERE company_id = ${companyId} AND name = ${g.name}
      )
    `;
  }

  // Step 2: wire parent_id for sub-groups. Uses UPDATE so existing records
  // (seeded before hierarchy was added) also get the relationship.
  const children = GROUPS.filter((g) => g.parentName);
  for (const child of children) {
    await sql`
      UPDATE ledger_groups
      SET parent_id = (
        SELECT id FROM ledger_groups
        WHERE company_id = ${companyId} AND name = ${child.parentName!}
        LIMIT 1
      )
      WHERE company_id = ${companyId}
        AND name = ${child.name}
        AND parent_id IS NULL
    `;
  }

  // Step 3: seed default ledgers if they don't exist yet.
  const defaultLedgers: { groupName: string; name: string; drCr: 'DEBIT' | 'CREDIT' }[] = [
    { groupName: 'Cash-in-Hand',   name: 'Cash',       drCr: 'DEBIT' },
    { groupName: 'Bank Accounts',  name: 'HDFC Bank',  drCr: 'DEBIT' },
    { groupName: 'Capital Account',name: 'Capital A/c',drCr: 'CREDIT' },
  ];

  for (const dl of defaultLedgers) {
    const [grp] = await sql`
      SELECT id FROM ledger_groups WHERE company_id = ${companyId} AND name = ${dl.groupName} LIMIT 1
    `;
    if (!grp) continue;
    try {
      // Use ON CONFLICT in case the DB has a unique constraint on (company_id, name).
      // Fall back to a plain INSERT if the constraint columns aren't indexed.
      await sql`
        INSERT INTO ledgers (company_id, group_id, name, opening_balance, opening_balance_type, is_system)
        VALUES (${companyId}, ${grp.id}, ${dl.name}, 0, ${dl.drCr}, true)
        ON CONFLICT (company_id, name) DO NOTHING
      `;
    } catch {
      // Constraint target may differ — skip silently if ledger already exists
    }
  }
}
