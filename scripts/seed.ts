import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

function uuid() {
  return crypto.randomUUID();
}

async function main() {
  console.log('🌱 Seeding Accura demo data...');

  // Demo User
  const userId = uuid();
  const hashedPw = await bcrypt.hash('Demo@123', 10);
  await sql`
    INSERT INTO users (id, email, name, password, role)
    VALUES (${userId}, 'demo@accura.in', 'Demo Admin', ${hashedPw}, 'ADMIN')
    ON CONFLICT (email) DO NOTHING
  `;

  // Company
  const companyId = uuid();
  await sql`
    INSERT INTO companies (id, name, legal_name, gstin, pan, tan, address, city, state, state_code, pincode, phone, email, financial_year_start, business_type, tax_registered)
    VALUES (${companyId}, 'Accura Demo Pvt Ltd', 'Accura Demo Private Limited', '33AABCA1234F1Z5', 'AABCA1234F', 'CHEN12345D',
            '42, Anna Salai, T. Nagar', 'Chennai', 'Tamil Nadu', '33', '600017', '9876543210', 'accounts@accurademo.in',
            4, 'PRIVATE_LIMITED', true)
    ON CONFLICT DO NOTHING
  `;

  // Link user to company
  await sql`
    INSERT INTO company_users (id, company_id, user_id, role)
    VALUES (${uuid()}, ${companyId}, ${userId}, 'ADMIN')
    ON CONFLICT DO NOTHING
  `;

  // Ledger Groups
  const grpCapital = uuid(), grpCurrLiab = uuid(), grpSundryCred = uuid(), grpDutiesTax = uuid();
  const grpLoans = uuid(), grpFixedAssets = uuid(), grpCurrAssets = uuid();
  const grpCash = uuid(), grpBank = uuid(), grpSundryDeb = uuid(), grpStock = uuid();
  const grpSales = uuid(), grpOtherIncome = uuid(), grpPurchase = uuid();
  const grpDirectExp = uuid(), grpIndirectExp = uuid(), grpInvestments = uuid(), grpProvisions = uuid();

  const groups: [string, string, string, string | null, string, boolean][] = [
    [grpCapital,    companyId, 'Capital Account',            null,         'LIABILITIES', true],
    [grpCurrLiab,   companyId, 'Current Liabilities',        null,         'LIABILITIES', true],
    [grpSundryCred, companyId, 'Sundry Creditors',           grpCurrLiab,  'LIABILITIES', true],
    [grpDutiesTax,  companyId, 'Duties & Taxes',             grpCurrLiab,  'LIABILITIES', true],
    [grpProvisions, companyId, 'Provisions',                 grpCurrLiab,  'LIABILITIES', true],
    [grpLoans,      companyId, 'Loans (Liability)',          null,         'LIABILITIES', true],
    [grpFixedAssets,companyId, 'Fixed Assets',               null,         'ASSETS',      true],
    [grpCurrAssets, companyId, 'Current Assets',             null,         'ASSETS',      true],
    [grpCash,       companyId, 'Cash-in-Hand',               grpCurrAssets,'ASSETS',      true],
    [grpBank,       companyId, 'Bank Accounts',              grpCurrAssets,'ASSETS',      true],
    [grpSundryDeb,  companyId, 'Sundry Debtors',             grpCurrAssets,'ASSETS',      true],
    [grpStock,      companyId, 'Stock-in-Hand',              grpCurrAssets,'ASSETS',      true],
    [grpInvestments,companyId, 'Investments',                null,         'ASSETS',      true],
    [grpSales,      companyId, 'Sales Accounts',             null,         'INCOME',      true],
    [grpOtherIncome,companyId, 'Other Income',               null,         'INCOME',      true],
    [grpPurchase,   companyId, 'Purchase Accounts',          null,         'EXPENSES',    true],
    [grpDirectExp,  companyId, 'Direct Expenses',            null,         'EXPENSES',    true],
    [grpIndirectExp,companyId, 'Indirect Expenses',          null,         'EXPENSES',    true],
  ];

  for (const [id, cid, name, parentId, nature, isSystem] of groups) {
    await sql`INSERT INTO ledger_groups (id,company_id,name,parent_id,nature,is_system)
      VALUES (${id},${cid},${name},${parentId},${nature},${isSystem}) ON CONFLICT DO NOTHING`;
  }

  // System Ledgers
  const lCash = uuid(), lHDFC = uuid(), lICICI = uuid(), lSales = uuid(), lPurchase = uuid();
  const lCGSTOut = uuid(), lSGSTOut = uuid(), lIGSTOut = uuid();
  const lCGSTIn = uuid(), lSGSTIn = uuid(), lIGSTIn = uuid();
  const lTDSPay = uuid(), lCapital = uuid(), lRent = uuid(), lSalary = uuid();
  const lBankCharges = uuid(), lDeprec = uuid(), lTravel = uuid(), lDiscGiven = uuid();
  const lDiscRecvd = uuid(), lInterest = uuid();

  const systemLedgers: [string, string, string, number, string][] = [
    [lCash,       grpCash,        'Cash',              50000,    'DEBIT'],
    [lHDFC,       grpBank,        'HDFC Bank A/c',     500000,   'DEBIT'],
    [lICICI,      grpBank,        'ICICI Bank A/c',    250000,   'DEBIT'],
    [lSales,      grpSales,       'Sales',             0,        'CREDIT'],
    [lPurchase,   grpPurchase,    'Purchases',         0,        'DEBIT'],
    [lCGSTOut,    grpDutiesTax,   'CGST Output',       0,        'CREDIT'],
    [lSGSTOut,    grpDutiesTax,   'SGST Output',       0,        'CREDIT'],
    [lIGSTOut,    grpDutiesTax,   'IGST Output',       0,        'CREDIT'],
    [lCGSTIn,     grpCurrAssets,  'CGST Input',        0,        'DEBIT'],
    [lSGSTIn,     grpCurrAssets,  'SGST Input',        0,        'DEBIT'],
    [lIGSTIn,     grpCurrAssets,  'IGST Input',        0,        'DEBIT'],
    [lTDSPay,     grpDutiesTax,   'TDS Payable',       0,        'CREDIT'],
    [lCapital,    grpCapital,     'Capital Account',   1000000,  'CREDIT'],
    [lRent,       grpIndirectExp, 'Rent',              0,        'DEBIT'],
    [lSalary,     grpIndirectExp, 'Salaries',          0,        'DEBIT'],
    [lBankCharges,grpIndirectExp, 'Bank Charges',      0,        'DEBIT'],
    [lDeprec,     grpIndirectExp, 'Depreciation',      0,        'DEBIT'],
    [lTravel,     grpIndirectExp, 'Travelling Expenses',0,       'DEBIT'],
    [lDiscGiven,  grpIndirectExp, 'Discount Given',    0,        'DEBIT'],
    [lDiscRecvd,  grpOtherIncome, 'Discount Received', 0,        'CREDIT'],
    [lInterest,   grpOtherIncome, 'Interest Income',   0,        'CREDIT'],
  ];

  for (const [id, groupId, name, opening, balType] of systemLedgers) {
    await sql`INSERT INTO ledgers (id,company_id,group_id,name,opening_balance,opening_balance_type,is_system,is_active)
      VALUES (${id},${companyId},${groupId},${name},${opening},${balType},true,true) ON CONFLICT DO NOTHING`;
  }

  // Customers
  const customerData: [string, string, string, string, string][] = [
    ['Global Logistics Solutions','27AAPFG1234A1Z9','Maharashtra','27','Mumbai'],
    ['Creative Agencies Pvt Ltd', '33AAPFC5678B1ZA','Tamil Nadu', '33','Chennai'],
    ['Nova Tech Systems',         '29AAPFN9012C1ZB','Karnataka',  '29','Bangalore'],
    ['Apex Industrial Supplies',  '36AAPFA3456D1ZC','Telangana',  '36','Hyderabad'],
    ['Sunrise Pharmaceuticals',   '24AAPFS7890E1ZD','Gujarat',    '24','Ahmedabad'],
    ['Metro Construction Co',     '07AAPFM2345F1ZE','Delhi',      '07','New Delhi'],
    ['Pacific Exports Ltd',       '32AAPFP6789G1ZF','Kerala',     '32','Kochi'],
    ['Diamond Retail Pvt Ltd',    '08AAPFD0123H1ZG','Rajasthan',  '08','Jaipur'],
    ['Eastern Trading Company',   '19AAPFE4567I1ZH','West Bengal','19','Kolkata'],
    ['Northern Distributors',     '03AAPFN8901J1ZI','Punjab',     '03','Ludhiana'],
  ];
  const custIds: string[] = [];
  for (const [name, gstin, state, stateCode, city] of customerData) {
    const id = uuid();
    custIds.push(id);
    await sql`INSERT INTO ledgers (id,company_id,group_id,name,gstin,state,state_code,city,is_party,party_type,gst_type,credit_limit,credit_days,is_active)
      VALUES (${id},${companyId},${grpSundryDeb},${name},${gstin},${state},${stateCode},${city},true,'CUSTOMER','REGULAR',500000,30,true)
      ON CONFLICT DO NOTHING`;
  }

  // Suppliers
  const supplierData: [string, string, string, string][] = [
    ['Steel & Alloys Ltd',         '27AAPFS1111A1Z1','Maharashtra','27'],
    ['Chemical Supplies Corp',     '24AAPFC2222B1Z2','Gujarat',    '24'],
    ['Electronic Components Hub',  '29AAPFE3333C1Z3','Karnataka',  '29'],
    ['Raw Materials India',        '06AAPFR4444D1Z4','Haryana',    '06'],
    ['Packaging Solutions Pvt Ltd','33AAPFP5555E1Z5','Tamil Nadu', '33'],
    ['Logistics Partners Ltd',     '36AAPFL6666F1Z6','Telangana',  '36'],
    ['Office Depot India',         '07AAPFO7777G1Z7','Delhi',      '07'],
    ['Power Systems Ltd',          '08AAPFP8888H1Z8','Rajasthan',  '08'],
    ['Fiber & Fabric Co',          '24AAPFF9999I1Z9','Gujarat',    '24'],
    ['Tech Components Pvt Ltd',    '29AAPFT0000J1Z0','Karnataka',  '29'],
  ];
  const supplierIds: string[] = [];
  for (const [name, gstin, state, stateCode] of supplierData) {
    const id = uuid();
    supplierIds.push(id);
    await sql`INSERT INTO ledgers (id,company_id,group_id,name,gstin,state,state_code,is_party,party_type,gst_type,credit_days,is_active)
      VALUES (${id},${companyId},${grpSundryCred},${name},${gstin},${state},${stateCode},true,'SUPPLIER','REGULAR',45,true)
      ON CONFLICT DO NOTHING`;
  }

  // Units
  const uNos = uuid(), uKg = uuid(), uMtr = uuid(), uLtr = uuid(), uBox = uuid();
  for (const [id, name, symbol] of [[uNos,'Numbers','Nos'],[uKg,'Kilograms','Kg'],[uMtr,'Metres','Mtr'],[uLtr,'Litres','Ltr'],[uBox,'Box','Box']]) {
    await sql`INSERT INTO units (id,company_id,name,symbol,is_system) VALUES (${id},${companyId},${name},${symbol},true) ON CONFLICT DO NOTHING`;
  }

  // Godown
  const godownId = uuid();
  await sql`INSERT INTO godowns (id,company_id,name,address,is_main) VALUES (${godownId},${companyId},'Main Warehouse','42 Anna Salai Chennai',true) ON CONFLICT DO NOTHING`;

  // Items
  const itemsData: [string,string,string,string,number,number,number,number,number,number][] = [
    ['Steel Cable 12mm','7312',uMtr,'Steel Products',18,9,9,500,450,100],
    ['Hydraulic Fluid 20L','2710',uLtr,'Chemicals',18,9,9,50,2250,10],
    ['Copper Wire 2.5mm','7408',uKg,'Electrical',18,9,9,200,850,50],
    ['Electronic Controller v2','8537',uNos,'Electronics',18,9,9,30,12000,5],
    ['Plastic Granules HDPE','3901',uKg,'Plastics',12,6,6,1000,95,200],
    ['Bearings SKF 6205','8482',uNos,'Mechanical',18,9,9,100,320,25],
    ['Paint Primer 20L','3210',uLtr,'Paints',18,9,9,40,1800,10],
    ['Industrial Gloves (pair)','3926',uNos,'Safety',12,6,6,200,180,50],
    ['PVC Pipe 1 inch 6m','3917',uNos,'Pipes',18,9,9,150,220,30],
    ['Welding Electrodes 3.15mm','8311',uKg,'Welding',18,9,9,80,120,20],
    ['Gear Oil 15W40 5L','2710',uLtr,'Lubricants',18,9,9,60,650,15],
    ['Aluminium Sheet 2mm','7606',uKg,'Metals',18,9,9,300,280,75],
    ['Safety Helmet IS 2925','6506',uNos,'Safety',12,6,6,50,450,10],
    ['Fiber Optic Cable 50m','8544',uMtr,'Telecom',18,9,9,20,8500,5],
    ['Conveyor Belt 3m','4010',uMtr,'Industrial',18,9,9,15,3200,3],
    ['Gasket Sheet 1m x 1m','8484',uNos,'Sealing',18,9,9,40,550,10],
    ['Circuit Breaker 32A','8536',uNos,'Electrical',18,9,9,25,1200,5],
    ['Stainless Steel Bolt M12','7318',uNos,'Fasteners',18,9,9,500,45,100],
    ['Sealing Compound 500ml','3214',uNos,'Chemicals',18,9,9,30,380,8],
    ['Pump Motor 1HP','8501',uNos,'Motors',18,9,9,10,8500,2],
  ];
  const itemIds: string[] = [];
  for (const [name,hsn,unitId,cat,igst,cgst,sgst,oStock,oRate,reorder] of itemsData) {
    const id = uuid();
    itemIds.push(id);
    await sql`INSERT INTO items (id,company_id,name,hsn_code,unit_id,category,igst_rate,cgst_rate,sgst_rate,opening_stock,opening_rate,reorder_level,is_active)
      VALUES (${id},${companyId},${name},${hsn},${unitId},${cat},${igst},${cgst},${sgst},${oStock},${oRate},${reorder},true)
      ON CONFLICT DO NOTHING`;
  }

  // TDS Sections
  for (const [section, desc, rate, threshold] of [
    ['194C','Payment to Contractors',1,30000],
    ['194J','Professional Services',10,30000],
    ['194H','Commission',5,15000],
    ['194I','Rent',10,240000],
    ['194A','Interest',10,40000],
  ]) {
    await sql`INSERT INTO tds_sections (id,company_id,section,description,rate,threshold_limit)
      VALUES (${uuid()},${companyId},${section},${desc},${rate},${threshold}) ON CONFLICT DO NOTHING`;
  }

  // Payroll Group + Employees
  const pgId = uuid();
  await sql`INSERT INTO payroll_groups (id,company_id,name,pf_applicable,esi_applicable) VALUES (${pgId},${companyId},'Permanent Staff',true,true) ON CONFLICT DO NOTHING`;

  const empData: [string,string,string,number,number,number,number][] = [
    ['Rajesh Kumar','Senior Engineer','Operations',45000,18000,1600,10000],
    ['Priya Sharma','Accounts Manager','Finance',50000,20000,1600,12000],
    ['Arun Venkatesh','Sales Executive','Sales',35000,14000,1600,8000],
  ];
  const empIds: string[] = [];
  for (const [name,desig,dept,basic,hra,conv,special] of empData) {
    const id = uuid();
    empIds.push(id);
    await sql`INSERT INTO employees (id,company_id,group_id,name,designation,department,basic_salary,hra,conveyance,special,pf_applicable,esi_applicable,is_active,date_of_joining)
      VALUES (${id},${companyId},${pgId},${name},${desig},${dept},${basic},${hra},${conv},${special},true,true,true,'2022-04-01')
      ON CONFLICT DO NOTHING`;
  }

  // Helper: create a voucher
  async function createVoucher(
    type: string, number: string, dateStr: string, narration: string,
    entries: Array<{ledgerId:string,type:'DEBIT'|'CREDIT',amount:number}>,
    gstLines?: Array<{hsnCode:string,taxableValue:number,cgstRate:number,sgstRate:number,igstRate:number,cgstAmount:number,sgstAmount:number,igstAmount:number,totalTax:number}>,
    invLines?: Array<{itemId:string,qty:number,rate:number,amount:number}>
  ) {
    const vId = uuid();
    const totalAmount = entries.filter(e=>e.type==='DEBIT').reduce((s,e)=>s+e.amount,0);
    await sql`INSERT INTO vouchers (id,company_id,type,number,date,narration,total_amount,is_posted,gst_applicable)
      VALUES (${vId},${companyId},${type},${number},${dateStr},${narration},${totalAmount},true,${(gstLines?.length??0)>0})`;
    for (const e of entries) {
      await sql`INSERT INTO voucher_entries (id,voucher_id,ledger_id,type,amount) VALUES (${uuid()},${vId},${e.ledgerId},${e.type},${e.amount})`;
    }
    if (gstLines) for (const g of gstLines) {
      await sql`INSERT INTO gst_lines (id,voucher_id,hsn_code,taxable_value,cgst_rate,sgst_rate,igst_rate,cgst_amount,sgst_amount,igst_amount,total_tax)
        VALUES (${uuid()},${vId},${g.hsnCode},${g.taxableValue},${g.cgstRate},${g.sgstRate},${g.igstRate},${g.cgstAmount},${g.sgstAmount},${g.igstAmount},${g.totalTax})`;
    }
    if (invLines) for (const il of invLines) {
      await sql`INSERT INTO inventory_lines (id,voucher_id,item_id,godown_id,quantity,rate,amount,discount)
        VALUES (${uuid()},${vId},${il.itemId},${godownId},${il.qty},${il.rate},${il.amount},0)`;
    }
    return vId;
  }

  // Sales Vouchers
  await createVoucher('SALES','SI/2024-25/001','2024-04-05','Sales of Steel Cable to Global Logistics',
    [{ledgerId:custIds[0],type:'DEBIT',amount:63540},{ledgerId:lSales,type:'CREDIT',amount:54000},{ledgerId:lIGSTOut,type:'CREDIT',amount:9720}],
    [{hsnCode:'7312',taxableValue:54000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:9720,totalTax:9720}],
    [{itemId:itemIds[0],qty:120,rate:450,amount:54000}]);

  await createVoucher('SALES','SI/2024-25/002','2024-04-12','Sales of Copper Wire to Creative Agencies',
    [{ledgerId:custIds[1],type:'DEBIT',amount:100300},{ledgerId:lSales,type:'CREDIT',amount:85000},{ledgerId:lCGSTOut,type:'CREDIT',amount:7650},{ledgerId:lSGSTOut,type:'CREDIT',amount:7650}],
    [{hsnCode:'7408',taxableValue:85000,cgstRate:9,sgstRate:9,igstRate:0,cgstAmount:7650,sgstAmount:7650,igstAmount:0,totalTax:15300}],
    [{itemId:itemIds[2],qty:100,rate:850,amount:85000}]);

  await createVoucher('SALES','SI/2024-25/003','2024-04-20','Sales of Electronic Controllers to Nova Tech',
    [{ledgerId:custIds[2],type:'DEBIT',amount:141600},{ledgerId:lSales,type:'CREDIT',amount:120000},{ledgerId:lIGSTOut,type:'CREDIT',amount:21600}],
    [{hsnCode:'8537',taxableValue:120000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:21600,totalTax:21600}],
    [{itemId:itemIds[3],qty:10,rate:12000,amount:120000}]);

  await createVoucher('SALES','SI/2024-25/004','2024-05-08','Sales of PVC Pipes to Apex Industrial',
    [{ledgerId:custIds[3],type:'DEBIT',amount:51920},{ledgerId:lSales,type:'CREDIT',amount:44000},{ledgerId:lIGSTOut,type:'CREDIT',amount:7920}],
    [{hsnCode:'3917',taxableValue:44000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:7920,totalTax:7920}],
    [{itemId:itemIds[8],qty:200,rate:220,amount:44000}]);

  await createVoucher('SALES','SI/2024-25/005','2024-05-22','Sales of Bearings to Sunrise Pharma',
    [{ledgerId:custIds[4],type:'DEBIT',amount:94400},{ledgerId:lSales,type:'CREDIT',amount:80000},{ledgerId:lIGSTOut,type:'CREDIT',amount:14400}],
    [{hsnCode:'8482',taxableValue:80000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:14400,totalTax:14400}],
    [{itemId:itemIds[5],qty:250,rate:320,amount:80000}]);

  await createVoucher('SALES','SI/2024-25/006','2024-06-05','Sales of Aluminium Sheets',
    [{ledgerId:custIds[5],type:'DEBIT',amount:98440},{ledgerId:lSales,type:'CREDIT',amount:84000},{ledgerId:lIGSTOut,type:'CREDIT',amount:15120}],
    [{hsnCode:'7606',taxableValue:84000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:15120,totalTax:15120}],
    [{itemId:itemIds[11],qty:300,rate:280,amount:84000}]);

  await createVoucher('SALES','SI/2024-25/007','2024-06-18','Sales of Pump Motors',
    [{ledgerId:custIds[6],type:'DEBIT',amount:200600},{ledgerId:lSales,type:'CREDIT',amount:170000},{ledgerId:lIGSTOut,type:'CREDIT',amount:30600}],
    [{hsnCode:'8501',taxableValue:170000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:30600,totalTax:30600}],
    [{itemId:itemIds[19],qty:20,rate:8500,amount:170000}]);

  // Purchases
  await createVoucher('PURCHASE','PI/2024-25/001','2024-04-03','Purchase of Steel Cables from Steel & Alloys',
    [{ledgerId:lPurchase,type:'DEBIT',amount:135000},{ledgerId:lIGSTIn,type:'DEBIT',amount:24300},{ledgerId:supplierIds[0],type:'CREDIT',amount:159300}],
    [{hsnCode:'7312',taxableValue:135000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:24300,totalTax:24300}],
    [{itemId:itemIds[0],qty:300,rate:450,amount:135000}]);

  await createVoucher('PURCHASE','PI/2024-25/002','2024-04-15','Purchase of Electronic Components',
    [{ledgerId:lPurchase,type:'DEBIT',amount:84000},{ledgerId:lIGSTIn,type:'DEBIT',amount:15120},{ledgerId:supplierIds[2],type:'CREDIT',amount:99120}],
    [{hsnCode:'8537',taxableValue:84000,cgstRate:0,sgstRate:0,igstRate:18,cgstAmount:0,sgstAmount:0,igstAmount:15120,totalTax:15120}],
    [{itemId:itemIds[3],qty:7,rate:12000,amount:84000}]);

  await createVoucher('PURCHASE','PI/2024-25/003','2024-05-10','Purchase of Plastic Granules',
    [{ledgerId:lPurchase,type:'DEBIT',amount:95000},{ledgerId:lIGSTIn,type:'DEBIT',amount:11400},{ledgerId:supplierIds[3],type:'CREDIT',amount:106400}],
    [{hsnCode:'3901',taxableValue:95000,cgstRate:0,sgstRate:0,igstRate:12,cgstAmount:0,sgstAmount:0,igstAmount:11400,totalTax:11400}],
    [{itemId:itemIds[4],qty:1000,rate:95,amount:95000}]);

  // Payments
  await createVoucher('PAYMENT','PYMT/2024-25/001','2024-04-30','Rent paid for April 2024 by NEFT',
    [{ledgerId:lRent,type:'DEBIT',amount:120000},{ledgerId:lHDFC,type:'CREDIT',amount:120000}]);
  await createVoucher('PAYMENT','PYMT/2024-25/002','2024-05-02','Salary paid for April 2024',
    [{ledgerId:lSalary,type:'DEBIT',amount:248000},{ledgerId:lHDFC,type:'CREDIT',amount:248000}]);
  await createVoucher('PAYMENT','PYMT/2024-25/003','2024-05-15','Payment to Steel & Alloys Ltd',
    [{ledgerId:supplierIds[0],type:'DEBIT',amount:159300},{ledgerId:lHDFC,type:'CREDIT',amount:159300}]);
  await createVoucher('PAYMENT','PYMT/2024-25/004','2024-05-31','Rent paid for May 2024',
    [{ledgerId:lRent,type:'DEBIT',amount:120000},{ledgerId:lHDFC,type:'CREDIT',amount:120000}]);
  await createVoucher('PAYMENT','PYMT/2024-25/005','2024-06-02','Salary paid for May 2024',
    [{ledgerId:lSalary,type:'DEBIT',amount:248000},{ledgerId:lHDFC,type:'CREDIT',amount:248000}]);
  await createVoucher('PAYMENT','PYMT/2024-25/006','2024-06-10','Bank charges HDFC',
    [{ledgerId:lBankCharges,type:'DEBIT',amount:2500},{ledgerId:lHDFC,type:'CREDIT',amount:2500}]);
  await createVoucher('PAYMENT','PYMT/2024-25/007','2024-06-30','Rent paid for June 2024',
    [{ledgerId:lRent,type:'DEBIT',amount:120000},{ledgerId:lHDFC,type:'CREDIT',amount:120000}]);

  // Receipts
  await createVoucher('RECEIPT','RCPT/2024-25/001','2024-04-25','Receipt from Global Logistics Solutions',
    [{ledgerId:lHDFC,type:'DEBIT',amount:63540},{ledgerId:custIds[0],type:'CREDIT',amount:63540}]);
  await createVoucher('RECEIPT','RCPT/2024-25/002','2024-05-20','Receipt from Creative Agencies Pvt Ltd',
    [{ledgerId:lHDFC,type:'DEBIT',amount:100300},{ledgerId:custIds[1],type:'CREDIT',amount:100300}]);
  await createVoucher('RECEIPT','RCPT/2024-25/003','2024-06-15','Receipt from Nova Tech Systems',
    [{ledgerId:lHDFC,type:'DEBIT',amount:141600},{ledgerId:custIds[2],type:'CREDIT',amount:141600}]);
  await createVoucher('RECEIPT','RCPT/2024-25/004','2024-06-28','Interest income from HDFC FD',
    [{ledgerId:lCash,type:'DEBIT',amount:12500},{ledgerId:lInterest,type:'CREDIT',amount:12500}]);

  // Journal, Contra
  await createVoucher('JOURNAL','JRNL/2024-25/001','2024-04-30','Depreciation on Fixed Assets April 2024',
    [{ledgerId:lDeprec,type:'DEBIT',amount:15000},{ledgerId:lCapital,type:'CREDIT',amount:15000}]);
  await createVoucher('CONTRA','CNTR/2024-25/001','2024-04-10','Cash withdrawn from HDFC Bank',
    [{ledgerId:lCash,type:'DEBIT',amount:25000},{ledgerId:lHDFC,type:'CREDIT',amount:25000}]);
  await createVoucher('CONTRA','CNTR/2024-25/002','2024-05-05','Cash deposited to ICICI Bank',
    [{ledgerId:lICICI,type:'DEBIT',amount:50000},{ledgerId:lCash,type:'CREDIT',amount:50000}]);

  // Payroll entries (2 months)
  for (const month of [4, 5]) {
    for (let i = 0; i < empData.length; i++) {
      const [,,,basic,hra,conv,special] = empData[i];
      const empId = empIds[i];
      const gross = basic + hra + conv + special;
      const pfEmp = Math.min(basic, 15000) * 0.12;
      const esiEmp = gross <= 21000 ? gross * 0.0075 : 0;
      const net = gross - pfEmp - esiEmp;
      const paidOn = `2024-${String(month+1).padStart(2,'0')}-02`;
      await sql`INSERT INTO payroll_entries (id,employee_id,month,year,working_days,present_days,basic,hra,conveyance,special,other_earnings,gross_salary,pf_employee,esi_employee,tds,other_deductions,net_salary,pf_employer,esi_employer,is_paid,paid_on)
        VALUES (${uuid()},${empId},${month},2024,26,26,${basic},${hra},${conv},${special},0,${gross},${pfEmp},${esiEmp},0,0,${net},${pfEmp},${gross<=21000?gross*0.0325:0},true,${paidOn})`;
    }
  }

  console.log('✅ Seed completed! Login: demo@accura.in / Demo@123');
}

main().catch(console.error);
