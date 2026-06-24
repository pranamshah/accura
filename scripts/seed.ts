import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

function uuid(): string {
  return crypto.randomUUID();
}

// Ledger group definitions — parents before children (order matters for FK)
const GROUP_DEFS: Array<{ name: string; nature: string; parent?: string }> = [
  { name: 'Capital Account', nature: 'LIABILITIES' },
  { name: 'Current Liabilities', nature: 'LIABILITIES' },
  { name: 'Loans (Liability)', nature: 'LIABILITIES' },
  { name: 'Sundry Creditors', nature: 'LIABILITIES', parent: 'Current Liabilities' },
  { name: 'Duties & Taxes', nature: 'LIABILITIES', parent: 'Current Liabilities' },
  { name: 'Provisions', nature: 'LIABILITIES', parent: 'Current Liabilities' },
  { name: 'Bank Overdraft', nature: 'LIABILITIES', parent: 'Loans (Liability)' },
  { name: 'Secured Loans', nature: 'LIABILITIES', parent: 'Loans (Liability)' },
  { name: 'Fixed Assets', nature: 'ASSETS' },
  { name: 'Current Assets', nature: 'ASSETS' },
  { name: 'Investments', nature: 'ASSETS' },
  { name: 'Cash-in-Hand', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Bank Accounts', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Sundry Debtors', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Stock-in-Hand', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Loans & Advances (Asset)', nature: 'ASSETS', parent: 'Current Assets' },
  { name: 'Sales Accounts', nature: 'INCOME' },
  { name: 'Other Income', nature: 'INCOME' },
  { name: 'Purchase Accounts', nature: 'EXPENSES' },
  { name: 'Direct Expenses', nature: 'EXPENSES' },
  { name: 'Indirect Expenses', nature: 'EXPENSES' },
];

async function main() {
  console.log('Seeding Accura demo data...');

  // ── Demo User ─────────────────────────────────────────────────────────────
  const userId = uuid();
  const hashedPw = await bcrypt.hash('Demo@123', 10);

  await sql`
    INSERT INTO users (id, email, name, password, role)
    VALUES (${userId}, 'demo@accura.in', 'Demo Admin', ${hashedPw}, 'ADMIN')
    ON CONFLICT (email) DO NOTHING
  `;
  // Re-fetch in case the user already existed
  const [existingUser] = await sql`SELECT id FROM users WHERE email = 'demo@accura.in'`;
  const resolvedUserId: string = (existingUser as { id: string }).id;

  // ── Company ───────────────────────────────────────────────────────────────
  const companyId = uuid();
  await sql`
    INSERT INTO companies (
      id, name, legal_name, gstin, pan, tan,
      address, city, state, state_code, pincode,
      phone, email, financial_year_start, business_type, tax_registered
    )
    VALUES (
      ${companyId},
      'Accura Demo Pvt Ltd',
      'Accura Demo Private Limited',
      '33AABCA1234F1Z5',
      'AABCA1234F',
      'CHEN12345D',
      '42, Anna Salai, T. Nagar',
      'Chennai',
      'Tamil Nadu',
      '33',
      '600017',
      '9876543210',
      'accounts@accurademo.in',
      4,
      'PRIVATE_LIMITED',
      true
    )
    ON CONFLICT DO NOTHING
  `;
  // Re-fetch in case company already existed
  const [existingCompany] = await sql`SELECT id FROM companies WHERE name = 'Accura Demo Pvt Ltd' LIMIT 1`;
  const resolvedCompanyId: string = (existingCompany as { id: string }).id;

  // Link user to company
  await sql`
    INSERT INTO company_users (id, company_id, user_id, role)
    VALUES (${uuid()}, ${resolvedCompanyId}, ${resolvedUserId}, 'ADMIN')
    ON CONFLICT DO NOTHING
  `;

  // ── Ledger Groups ─────────────────────────────────────────────────────────
  const groupId: Record<string, string> = {};
  for (const gd of GROUP_DEFS) {
    groupId[gd.name] = uuid();
  }

  for (const gd of GROUP_DEFS) {
    const parentId = gd.parent ? groupId[gd.parent] : null;
    await sql`
      INSERT INTO ledger_groups (id, company_id, name, nature, parent_id, is_system)
      VALUES (${groupId[gd.name]}, ${resolvedCompanyId}, ${gd.name}, ${gd.nature}, ${parentId}, true)
      ON CONFLICT DO NOTHING
    `;
  }

  // ── System Ledgers ────────────────────────────────────────────────────────
  const lCash = uuid(), lHDFC = uuid(), lICICI = uuid();
  const lSales = uuid(), lPurchase = uuid();
  const lCGSTOut = uuid(), lSGSTOut = uuid(), lIGSTOut = uuid();
  const lCGSTIn = uuid(), lSGSTIn = uuid(), lIGSTIn = uuid();
  const lTDSPay = uuid(), lCapital = uuid();
  const lRent = uuid(), lSalary = uuid();
  const lBankCharges = uuid(), lDeprec = uuid(), lInterest = uuid();

  type LedgerRow = [string, string, string, number, string, boolean];
  const systemLedgers: LedgerRow[] = [
    [lCash,       groupId['Cash-in-Hand'],        'Cash',              50000,   'DEBIT',  true],
    [lHDFC,       groupId['Bank Accounts'],        'HDFC Bank A/c',    500000,  'DEBIT',  true],
    [lICICI,      groupId['Bank Accounts'],        'ICICI Bank A/c',   250000,  'DEBIT',  true],
    [lSales,      groupId['Sales Accounts'],       'Sales',            0,       'CREDIT', true],
    [lPurchase,   groupId['Purchase Accounts'],    'Purchases',        0,       'DEBIT',  true],
    [lCGSTOut,    groupId['Duties & Taxes'],       'CGST Output',      0,       'CREDIT', true],
    [lSGSTOut,    groupId['Duties & Taxes'],       'SGST Output',      0,       'CREDIT', true],
    [lIGSTOut,    groupId['Duties & Taxes'],       'IGST Output',      0,       'CREDIT', true],
    [lCGSTIn,     groupId['Current Assets'],       'CGST Input',       0,       'DEBIT',  true],
    [lSGSTIn,     groupId['Current Assets'],       'SGST Input',       0,       'DEBIT',  true],
    [lIGSTIn,     groupId['Current Assets'],       'IGST Input',       0,       'DEBIT',  true],
    [lTDSPay,     groupId['Duties & Taxes'],       'TDS Payable',      0,       'CREDIT', true],
    [lCapital,    groupId['Capital Account'],      'Capital Account',  1000000, 'CREDIT', true],
    [lRent,       groupId['Indirect Expenses'],    'Rent',             0,       'DEBIT',  false],
    [lSalary,     groupId['Direct Expenses'],      'Salaries',         0,       'DEBIT',  false],
    [lBankCharges,groupId['Indirect Expenses'],    'Bank Charges',     0,       'DEBIT',  false],
    [lDeprec,     groupId['Indirect Expenses'],    'Depreciation',     0,       'DEBIT',  false],
    [lInterest,   groupId['Other Income'],         'Interest Income',  0,       'CREDIT', false],
  ];

  for (const [id, grpId, name, opening, balType, isSystem] of systemLedgers) {
    await sql`
      INSERT INTO ledgers (id, company_id, group_id, name, opening_balance, opening_balance_type, is_system, is_active)
      VALUES (${id}, ${resolvedCompanyId}, ${grpId}, ${name}, ${opening}, ${balType}, ${isSystem}, true)
      ON CONFLICT DO NOTHING
    `;
  }

  // ── 5 Customers ──────────────────────────────────────────────────────────
  type CustomerRow = [string, string, string, string, string];
  const customerData: CustomerRow[] = [
    ['Global Logistics Solutions', '27AAPFG1234A1Z9', 'Maharashtra', '27', 'Mumbai'],
    ['Creative Agencies Pvt Ltd',  '33AAPFC5678B1ZA', 'Tamil Nadu',  '33', 'Chennai'],
    ['Nova Tech Systems',          '29AAPFN9012C1ZB', 'Karnataka',   '29', 'Bangalore'],
    ['Apex Industrial Supplies',   '36AAPFA3456D1ZC', 'Telangana',   '36', 'Hyderabad'],
    ['Sunrise Pharmaceuticals',    '24AAPFS7890E1ZD', 'Gujarat',     '24', 'Ahmedabad'],
  ];

  const custIds: string[] = [];
  for (const [name, gstin, state, stateCode, city] of customerData) {
    const id = uuid();
    custIds.push(id);
    await sql`
      INSERT INTO ledgers (id, company_id, group_id, name, gstin, state, state_code, city, is_party, party_type, gst_type, credit_limit, credit_days, is_active)
      VALUES (${id}, ${resolvedCompanyId}, ${groupId['Sundry Debtors']}, ${name}, ${gstin}, ${state}, ${stateCode}, ${city}, true, 'CUSTOMER', 'REGULAR', 500000, 30, true)
      ON CONFLICT DO NOTHING
    `;
  }

  // ── 5 Suppliers ───────────────────────────────────────────────────────────
  type SupplierRow = [string, string, string, string];
  const supplierData: SupplierRow[] = [
    ['Steel & Alloys Ltd',         '27AAPFS1111A1Z1', 'Maharashtra', '27'],
    ['Chemical Supplies Corp',     '24AAPFC2222B1Z2', 'Gujarat',     '24'],
    ['Electronic Components Hub',  '29AAPFE3333C1Z3', 'Karnataka',   '29'],
    ['Raw Materials India',        '06AAPFR4444D1Z4', 'Haryana',     '06'],
    ['Packaging Solutions Pvt Ltd','33AAPFP5555E1Z5', 'Tamil Nadu',  '33'],
  ];

  const supplierIds: string[] = [];
  for (const [name, gstin, state, stateCode] of supplierData) {
    const id = uuid();
    supplierIds.push(id);
    await sql`
      INSERT INTO ledgers (id, company_id, group_id, name, gstin, state, state_code, is_party, party_type, gst_type, credit_days, is_active)
      VALUES (${id}, ${resolvedCompanyId}, ${groupId['Sundry Creditors']}, ${name}, ${gstin}, ${state}, ${stateCode}, true, 'SUPPLIER', 'REGULAR', 45, true)
      ON CONFLICT DO NOTHING
    `;
  }

  // ── Units & Godown ────────────────────────────────────────────────────────
  const uNos = uuid(), uKg = uuid(), uMtr = uuid(), uLtr = uuid(), uBox = uuid();
  for (const [id, name, symbol] of [
    [uNos, 'Numbers', 'Nos'],
    [uKg, 'Kilograms', 'Kg'],
    [uMtr, 'Metres', 'Mtr'],
    [uLtr, 'Litres', 'Ltr'],
    [uBox, 'Box', 'Box'],
  ]) {
    await sql`
      INSERT INTO units (id, company_id, name, symbol, is_system)
      VALUES (${id}, ${resolvedCompanyId}, ${name}, ${symbol}, true)
      ON CONFLICT DO NOTHING
    `;
  }

  const godownId = uuid();
  await sql`
    INSERT INTO godowns (id, company_id, name, address, is_main)
    VALUES (${godownId}, ${resolvedCompanyId}, 'Main Warehouse', '42 Anna Salai Chennai', true)
    ON CONFLICT DO NOTHING
  `;

  // ── Items ─────────────────────────────────────────────────────────────────
  type ItemRow = [string, string, string, string, number, number, number, number, number, number];
  const itemsData: ItemRow[] = [
    ['Steel Cable 12mm',        '7312', uMtr, 'Steel Products', 18, 9, 9, 500,  450,  100],
    ['Copper Wire 2.5mm',       '7408', uKg,  'Electrical',     18, 9, 9, 200,  850,  50],
    ['Electronic Controller v2','8537', uNos, 'Electronics',    18, 9, 9, 30,   12000, 5],
    ['Plastic Granules HDPE',   '3901', uKg,  'Plastics',       12, 6, 6, 1000, 95,   200],
    ['Bearings SKF 6205',       '8482', uNos, 'Mechanical',     18, 9, 9, 100,  320,  25],
    ['PVC Pipe 1 inch 6m',      '3917', uNos, 'Pipes',          18, 9, 9, 150,  220,  30],
    ['Aluminium Sheet 2mm',     '7606', uKg,  'Metals',         18, 9, 9, 300,  280,  75],
    ['Pump Motor 1HP',          '8501', uNos, 'Motors',         18, 9, 9, 10,   8500,  2],
    ['Circuit Breaker 32A',     '8536', uNos, 'Electrical',     18, 9, 9, 25,   1200,  5],
    ['Welding Electrodes 3.15mm','8311', uKg, 'Welding',        18, 9, 9, 80,   120,  20],
  ];

  const itemIds: string[] = [];
  for (const [name, hsn, unitId, cat, igst, cgst, sgst, oStock, oRate, reorder] of itemsData) {
    const id = uuid();
    itemIds.push(id);
    await sql`
      INSERT INTO items (id, company_id, name, hsn_code, unit_id, category, igst_rate, cgst_rate, sgst_rate, opening_stock, opening_rate, reorder_level, is_active)
      VALUES (${id}, ${resolvedCompanyId}, ${name}, ${hsn}, ${unitId}, ${cat}, ${igst}, ${cgst}, ${sgst}, ${oStock}, ${oRate}, ${reorder}, true)
      ON CONFLICT DO NOTHING
    `;
  }

  // ── TDS Sections ──────────────────────────────────────────────────────────
  for (const [section, desc, rate, threshold] of [
    ['194C', 'Payment to Contractors', 1,  30000],
    ['194J', 'Professional Services',  10, 30000],
    ['194H', 'Commission',             5,  15000],
    ['194I', 'Rent',                   10, 240000],
    ['194A', 'Interest',               10, 40000],
  ]) {
    await sql`
      INSERT INTO tds_sections (id, company_id, section, description, rate, threshold_limit)
      VALUES (${uuid()}, ${resolvedCompanyId}, ${section}, ${desc}, ${rate}, ${threshold})
      ON CONFLICT DO NOTHING
    `;
  }

  // ── Payroll Group ─────────────────────────────────────────────────────────
  const pgId = uuid();
  await sql`
    INSERT INTO payroll_groups (id, company_id, name, pf_applicable, esi_applicable)
    VALUES (${pgId}, ${resolvedCompanyId}, 'Permanent Staff', true, true)
    ON CONFLICT DO NOTHING
  `;

  // ── 3 Employees ───────────────────────────────────────────────────────────
  type EmployeeRow = [string, string, string, number, number, number, number];
  const empData: EmployeeRow[] = [
    ['Rajesh Kumar',   'Senior Engineer', 'Operations', 45000, 18000, 1600, 10000],
    ['Priya Sharma',   'Accounts Manager','Finance',    50000, 20000, 1600, 12000],
    ['Arun Venkatesh', 'Sales Executive', 'Sales',      35000, 14000, 1600, 8000],
  ];

  const empIds: string[] = [];
  for (const [name, desig, dept, basic, hra, conv, special] of empData) {
    const id = uuid();
    empIds.push(id);
    await sql`
      INSERT INTO employees (id, company_id, group_id, name, designation, department, basic_salary, hra, conveyance, special, pf_applicable, esi_applicable, is_active, date_of_joining)
      VALUES (${id}, ${resolvedCompanyId}, ${pgId}, ${name}, ${desig}, ${dept}, ${basic}, ${hra}, ${conv}, ${special}, true, true, true, '2022-04-01')
      ON CONFLICT DO NOTHING
    `;
  }

  // ── Voucher helper ────────────────────────────────────────────────────────
  async function createVoucher(
    type: string,
    number: string,
    dateStr: string,
    narration: string,
    entries: Array<{ ledgerId: string; type: 'DEBIT' | 'CREDIT'; amount: number }>,
    gstLines?: Array<{
      hsnCode: string; taxableValue: number;
      cgstRate: number; sgstRate: number; igstRate: number;
      cgstAmount: number; sgstAmount: number; igstAmount: number; totalTax: number;
    }>,
    invLines?: Array<{ itemId: string; qty: number; rate: number; amount: number }>
  ): Promise<string> {
    const vId = uuid();
    const totalAmount = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);

    await sql`
      INSERT INTO vouchers (id, company_id, type, number, date, narration, total_amount, is_posted, gst_applicable)
      VALUES (${vId}, ${resolvedCompanyId}, ${type}, ${number}, ${dateStr}, ${narration}, ${totalAmount}, true, ${(gstLines?.length ?? 0) > 0})
    `;

    for (const e of entries) {
      await sql`
        INSERT INTO voucher_entries (id, voucher_id, ledger_id, type, amount)
        VALUES (${uuid()}, ${vId}, ${e.ledgerId}, ${e.type}, ${e.amount})
      `;
    }

    if (gstLines) {
      for (const g of gstLines) {
        await sql`
          INSERT INTO gst_lines (id, voucher_id, hsn_code, taxable_value, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, total_tax)
          VALUES (${uuid()}, ${vId}, ${g.hsnCode}, ${g.taxableValue}, ${g.cgstRate}, ${g.sgstRate}, ${g.igstRate}, ${g.cgstAmount}, ${g.sgstAmount}, ${g.igstAmount}, ${g.totalTax})
        `;
      }
    }

    if (invLines) {
      for (const il of invLines) {
        await sql`
          INSERT INTO inventory_lines (id, voucher_id, item_id, godown_id, quantity, rate, amount, discount)
          VALUES (${uuid()}, ${vId}, ${il.itemId}, ${godownId}, ${il.qty}, ${il.rate}, ${il.amount}, 0)
        `;
      }
    }

    return vId;
  }

  // ── 10 Sales Vouchers (current month) ────────────────────────────────────
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');

  const salesVouchers: Array<{
    num: string; day: string; cust: number; narration: string;
    item: number; qty: number; rate: number; taxable: number;
    igst: boolean;
  }> = [
    { num: '001', day: '02', cust: 0, narration: 'Sales of Steel Cable',        item: 0, qty: 120, rate: 450,   taxable: 54000,  igst: true  },
    { num: '002', day: '04', cust: 1, narration: 'Sales of Copper Wire',         item: 1, qty: 100, rate: 850,   taxable: 85000,  igst: false },
    { num: '003', day: '06', cust: 2, narration: 'Sales of Electronic Controllers', item: 2, qty: 10,  rate: 12000, taxable: 120000, igst: true  },
    { num: '004', day: '08', cust: 3, narration: 'Sales of PVC Pipes',           item: 5, qty: 200, rate: 220,   taxable: 44000,  igst: true  },
    { num: '005', day: '10', cust: 4, narration: 'Sales of Bearings',            item: 4, qty: 250, rate: 320,   taxable: 80000,  igst: true  },
    { num: '006', day: '12', cust: 0, narration: 'Sales of Aluminium Sheets',    item: 6, qty: 300, rate: 280,   taxable: 84000,  igst: true  },
    { num: '007', day: '14', cust: 1, narration: 'Sales of Pump Motors',         item: 7, qty: 20,  rate: 8500,  taxable: 170000, igst: false },
    { num: '008', day: '16', cust: 2, narration: 'Sales of Circuit Breakers',    item: 8, qty: 25,  rate: 1200,  taxable: 30000,  igst: true  },
    { num: '009', day: '18', cust: 3, narration: 'Sales of Welding Electrodes',  item: 9, qty: 80,  rate: 120,   taxable: 9600,   igst: true  },
    { num: '010', day: '20', cust: 4, narration: 'Sales of Plastic Granules',    item: 3, qty: 500, rate: 95,    taxable: 47500,  igst: true  },
  ];

  const fyLabel = `${yr}-${yr + 1}`;
  for (const sv of salesVouchers) {
    const taxRate = 18;
    const halfRate = 9;
    const igstAmt = sv.igst ? Math.round(sv.taxable * taxRate / 100) : 0;
    const cgstAmt = sv.igst ? 0 : Math.round(sv.taxable * halfRate / 100);
    const sgstAmt = sv.igst ? 0 : Math.round(sv.taxable * halfRate / 100);
    const totalTax = igstAmt + cgstAmt + sgstAmt;
    const grandTotal = sv.taxable + totalTax;
    const dateStr = `${yr}-${mo}-${sv.day}`;

    const entries: Array<{ ledgerId: string; type: 'DEBIT' | 'CREDIT'; amount: number }> = [
      { ledgerId: custIds[sv.cust], type: 'DEBIT', amount: grandTotal },
      { ledgerId: lSales, type: 'CREDIT', amount: sv.taxable },
    ];
    if (igstAmt > 0) entries.push({ ledgerId: lIGSTOut, type: 'CREDIT', amount: igstAmt });
    if (cgstAmt > 0) entries.push({ ledgerId: lCGSTOut, type: 'CREDIT', amount: cgstAmt });
    if (sgstAmt > 0) entries.push({ ledgerId: lSGSTOut, type: 'CREDIT', amount: sgstAmt });

    await createVoucher(
      'SALES',
      `SI/${fyLabel}/${sv.num}`,
      dateStr,
      sv.narration,
      entries,
      [{
        hsnCode: itemsData[sv.item][1],
        taxableValue: sv.taxable,
        igstRate: sv.igst ? taxRate : 0,
        cgstRate: sv.igst ? 0 : halfRate,
        sgstRate: sv.igst ? 0 : halfRate,
        igstAmount: igstAmt,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        totalTax,
      }],
      [{ itemId: itemIds[sv.item], qty: sv.qty, rate: sv.rate, amount: sv.taxable }]
    );
  }

  // ── 5 Purchase Vouchers ───────────────────────────────────────────────────
  const purchaseVouchers: Array<{
    num: string; day: string; supp: number; narration: string;
    item: number; qty: number; rate: number; taxable: number;
    igst: boolean;
  }> = [
    { num: '001', day: '01', supp: 0, narration: 'Purchase of Steel Cables',        item: 0, qty: 300, rate: 450,  taxable: 135000, igst: true  },
    { num: '002', day: '03', supp: 2, narration: 'Purchase of Electronic Components', item: 2, qty: 7,   rate: 12000, taxable: 84000,  igst: true  },
    { num: '003', day: '05', supp: 1, narration: 'Purchase of Plastic Granules',     item: 3, qty: 1000,rate: 95,   taxable: 95000,  igst: true  },
    { num: '004', day: '07', supp: 3, narration: 'Purchase of Bearings',             item: 4, qty: 150, rate: 320,  taxable: 48000,  igst: true  },
    { num: '005', day: '09', supp: 4, narration: 'Purchase of Copper Wire',          item: 1, qty: 200, rate: 850,  taxable: 170000, igst: false },
  ];

  for (const pv of purchaseVouchers) {
    const taxRate = 18;
    const halfRate = 9;
    const igstAmt = pv.igst ? Math.round(pv.taxable * taxRate / 100) : 0;
    const cgstAmt = pv.igst ? 0 : Math.round(pv.taxable * halfRate / 100);
    const sgstAmt = pv.igst ? 0 : Math.round(pv.taxable * halfRate / 100);
    const totalTax = igstAmt + cgstAmt + sgstAmt;
    const grandTotal = pv.taxable + totalTax;
    const dateStr = `${yr}-${mo}-${pv.day}`;

    const entries: Array<{ ledgerId: string; type: 'DEBIT' | 'CREDIT'; amount: number }> = [
      { ledgerId: lPurchase, type: 'DEBIT', amount: pv.taxable },
    ];
    if (igstAmt > 0) entries.push({ ledgerId: lIGSTIn, type: 'DEBIT', amount: igstAmt });
    if (cgstAmt > 0) entries.push({ ledgerId: lCGSTIn, type: 'DEBIT', amount: cgstAmt });
    if (sgstAmt > 0) entries.push({ ledgerId: lSGSTIn, type: 'DEBIT', amount: sgstAmt });
    entries.push({ ledgerId: supplierIds[pv.supp], type: 'CREDIT', amount: grandTotal });

    await createVoucher(
      'PURCHASE',
      `PI/${fyLabel}/${pv.num}`,
      dateStr,
      pv.narration,
      entries,
      [{
        hsnCode: itemsData[pv.item][1],
        taxableValue: pv.taxable,
        igstRate: pv.igst ? taxRate : 0,
        cgstRate: pv.igst ? 0 : halfRate,
        sgstRate: pv.igst ? 0 : halfRate,
        igstAmount: igstAmt,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        totalTax,
      }],
      [{ itemId: itemIds[pv.item], qty: pv.qty, rate: pv.rate, amount: pv.taxable }]
    );
  }

  // ── Payroll entries for current month ─────────────────────────────────────
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  for (let i = 0; i < empData.length; i++) {
    const [, , , basic, hra, conv, special] = empData[i];
    const empId = empIds[i];
    const gross = basic + hra + conv + special;
    const pfEmp = Math.min(basic, 15000) * 0.12;
    const esiEmp = gross <= 21000 ? gross * 0.0075 : 0;
    const net = gross - pfEmp - esiEmp;
    const pfEmpr = pfEmp;
    const esiEmpr = gross <= 21000 ? gross * 0.0325 : 0;

    await sql`
      INSERT INTO payroll_entries (
        id, employee_id, month, year, working_days, present_days,
        basic, hra, conveyance, special, other_earnings, gross_salary,
        pf_employee, esi_employee, tds, other_deductions, net_salary,
        pf_employer, esi_employer, is_paid, paid_on
      )
      VALUES (
        ${uuid()}, ${empId}, ${currentMonth}, ${currentYear},
        26, 26, ${basic}, ${hra}, ${conv}, ${special}, 0, ${gross},
        ${pfEmp}, ${esiEmp}, 0, 0, ${net},
        ${pfEmpr}, ${esiEmpr}, false, null
      )
      ON CONFLICT DO NOTHING
    `;
  }

  console.log('Seed completed! Login: demo@accura.in / Demo@123');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
