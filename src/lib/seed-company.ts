import sql from '@/lib/db';

// Tally-style default ledger groups. Nature drives P&L (INCOME/EXPENSES) and
// Balance Sheet (ASSETS/LIABILITIES) classification automatically.
export const DEFAULT_GROUPS: { name: string; nature: 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES'; alias: string }[] = [
  { name: 'Capital Account', nature: 'LIABILITIES', alias: 'Capital' },
  { name: 'Reserves & Surplus', nature: 'LIABILITIES', alias: 'Reserves' },
  { name: 'Loans (Liability)', nature: 'LIABILITIES', alias: 'Loans' },
  { name: 'Current Liabilities', nature: 'LIABILITIES', alias: 'CL' },
  { name: 'Sundry Creditors', nature: 'LIABILITIES', alias: 'Creditors' },
  { name: 'Duties & Taxes', nature: 'LIABILITIES', alias: 'Duties' },
  { name: 'Provisions', nature: 'LIABILITIES', alias: 'Provisions' },
  { name: 'Fixed Assets', nature: 'ASSETS', alias: 'FA' },
  { name: 'Investments', nature: 'ASSETS', alias: 'Investments' },
  { name: 'Current Assets', nature: 'ASSETS', alias: 'CA' },
  { name: 'Cash-in-Hand', nature: 'ASSETS', alias: 'Cash' },
  { name: 'Bank Accounts', nature: 'ASSETS', alias: 'Bank' },
  { name: 'Bank OD/OCC A/c', nature: 'LIABILITIES', alias: 'Bank OD' },
  { name: 'Sundry Debtors', nature: 'ASSETS', alias: 'Debtors' },
  { name: 'Stock-in-Hand', nature: 'ASSETS', alias: 'Stock' },
  { name: 'Loans & Advances (Asset)', nature: 'ASSETS', alias: 'Loans Asset' },
  { name: 'Deposits (Asset)', nature: 'ASSETS', alias: 'Deposits' },
  { name: 'Sales Accounts', nature: 'INCOME', alias: 'Sales' },
  { name: 'Direct Income', nature: 'INCOME', alias: 'Direct Income' },
  { name: 'Indirect Income', nature: 'INCOME', alias: 'Indirect Income' },
  { name: 'Purchase Accounts', nature: 'EXPENSES', alias: 'Purchases' },
  { name: 'Direct Expenses', nature: 'EXPENSES', alias: 'Direct Exp' },
  { name: 'Indirect Expenses', nature: 'EXPENSES', alias: 'Indirect Exp' },
  { name: 'Salary Expenses', nature: 'EXPENSES', alias: 'Salary' },
];

// Seeds the standard chart of accounts for a company. Idempotent — safe to call
// repeatedly; existing rows are left untouched. Called on company creation and
// during /api/init so every company (seed or user-created) has groups to pick
// from when creating ledgers, and so P&L / Balance Sheet classify correctly.
export async function seedCompanyDefaults(companyId: string) {
  const existing = await sql`SELECT id FROM ledger_groups WHERE company_id = ${companyId} LIMIT 1`;
  if (existing[0]) return; // already seeded

  for (const g of DEFAULT_GROUPS) {
    await sql`
      INSERT INTO ledger_groups (company_id, name, alias, nature, is_system)
      VALUES (${companyId}, ${g.name}, ${g.alias}, ${g.nature}, true)
      ON CONFLICT DO NOTHING
    `;
  }

  const [cashGroup] = await sql`SELECT id FROM ledger_groups WHERE company_id = ${companyId} AND name = 'Cash-in-Hand' LIMIT 1`;
  if (cashGroup) {
    await sql`
      INSERT INTO ledgers (company_id, group_id, name, opening_balance, opening_balance_type, is_system)
      VALUES (${companyId}, ${cashGroup.id}, 'Cash', 0, 'DEBIT', true)
      ON CONFLICT DO NOTHING
    `;
  }
}
