import { PrismaClient, GroupNature, BalanceType, PartyType, GSTType, VoucherType, EntryType, BusinessType, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create demo user
  const hashedPassword = await bcrypt.hash('Demo@123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@accura.in' },
    update: {},
    create: {
      email: 'demo@accura.in',
      name: 'Demo Admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  })

  // Create demo company
  const company = await prisma.company.upsert({
    where: { id: 'demo-company-001' },
    update: {},
    create: {
      id: 'demo-company-001',
      name: 'Accura Demo Pvt Ltd',
      legalName: 'Accura Demo Private Limited',
      gstin: '33AABCA1234F1Z5',
      pan: 'AABCA1234F',
      tan: 'CHEN12345D',
      address: '42, Anna Salai, T. Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '600017',
      phone: '9876543210',
      email: 'accounts@accuademo.in',
      financialYearStart: 4,
      businessType: BusinessType.PRIVATE_LIMITED,
      taxRegistered: true,
      currencySymbol: '₹',
      currency: 'INR',
    },
  })

  // Link user to company
  await prisma.companyUser.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: {},
    create: { companyId: company.id, userId: user.id, role: UserRole.ADMIN },
  })

  // Create ledger groups (hierarchical)
  const createGroup = async (name: string, nature: GroupNature, parentId?: string, alias?: string) => {
    return prisma.ledgerGroup.upsert({
      where: { id: `grp-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}` },
      update: {},
      create: {
        id: `grp-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        companyId: company.id,
        name,
        alias,
        nature,
        parentId,
        isSystem: true,
      },
    })
  }

  // LIABILITIES
  const capitalGroup = await createGroup('Capital Account', GroupNature.LIABILITIES)
  const currentLiab = await createGroup('Current Liabilities', GroupNature.LIABILITIES)
  const sundryCred = await createGroup('Sundry Creditors', GroupNature.LIABILITIES, currentLiab.id)
  const dutiesTaxes = await createGroup('Duties & Taxes', GroupNature.LIABILITIES, currentLiab.id)
  const provisions = await createGroup('Provisions', GroupNature.LIABILITIES, currentLiab.id)
  const loansLiab = await createGroup('Loans (Liability)', GroupNature.LIABILITIES)
  const bankOD = await createGroup('Bank Overdraft', GroupNature.LIABILITIES, loansLiab.id)
  const securedLoans = await createGroup('Secured Loans', GroupNature.LIABILITIES, loansLiab.id)

  // ASSETS
  const fixedAssets = await createGroup('Fixed Assets', GroupNature.ASSETS)
  const currentAssets = await createGroup('Current Assets', GroupNature.ASSETS)
  const cashGroup = await createGroup('Cash-in-Hand', GroupNature.ASSETS, currentAssets.id)
  const bankGroup = await createGroup('Bank Accounts', GroupNature.ASSETS, currentAssets.id)
  const sundryDeb = await createGroup('Sundry Debtors', GroupNature.ASSETS, currentAssets.id)
  const stockGroup = await createGroup('Stock-in-Hand', GroupNature.ASSETS, currentAssets.id)
  const loansAdv = await createGroup('Loans & Advances (Asset)', GroupNature.ASSETS, currentAssets.id)
  const investments = await createGroup('Investments', GroupNature.ASSETS)

  // INCOME
  const salesAccounts = await createGroup('Sales Accounts', GroupNature.INCOME)
  const otherIncome = await createGroup('Other Income', GroupNature.INCOME)

  // EXPENSES
  const purchaseAccounts = await createGroup('Purchase Accounts', GroupNature.EXPENSES)
  const directExp = await createGroup('Direct Expenses', GroupNature.EXPENSES)
  const indirectExp = await createGroup('Indirect Expenses', GroupNature.EXPENSES)

  // System Ledgers
  const createLedger = async (name: string, groupId: string, openingBalance = 0, openingBalanceType = BalanceType.DEBIT, extra: Record<string, unknown> = {}) => {
    return prisma.ledger.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: {},
      create: {
        companyId: company.id,
        groupId,
        name,
        openingBalance,
        openingBalanceType,
        isSystem: true,
        isActive: true,
        ...extra,
      },
    })
  }

  const cashLedger = await createLedger('Cash', cashGroup.id, 50000)
  const hdfcLedger = await createLedger('HDFC Bank A/c', bankGroup.id, 500000)
  const icicLedger = await createLedger('ICICI Bank A/c', bankGroup.id, 250000)
  const salesLedger = await createLedger('Sales', salesAccounts.id)
  const purchaseLedger = await createLedger('Purchases', purchaseAccounts.id)
  const cgstOutput = await createLedger('CGST Output', dutiesTaxes.id)
  const sgstOutput = await createLedger('SGST Output', dutiesTaxes.id)
  const igstOutput = await createLedger('IGST Output', dutiesTaxes.id)
  const cgstInput = await createLedger('CGST Input', currentAssets.id)
  const sgstInput = await createLedger('SGST Input', currentAssets.id)
  const igstInput = await createLedger('IGST Input', currentAssets.id)
  const tdsPayable = await createLedger('TDS Payable', dutiesTaxes.id)
  const capitalLedger = await createLedger('Capital Account', capitalGroup.id, 1000000, BalanceType.CREDIT)
  const retainedEarnings = await createLedger('Retained Earnings', capitalGroup.id)
  const rentExp = await createLedger('Rent', indirectExp.id)
  const salaryExp = await createLedger('Salaries', indirectExp.id)
  const bankCharges = await createLedger('Bank Charges', indirectExp.id)
  const depreciation = await createLedger('Depreciation', indirectExp.id)
  const travelExp = await createLedger('Travelling Expenses', indirectExp.id)
  const discountGiven = await createLedger('Discount Given', indirectExp.id)
  const discountReceived = await createLedger('Discount Received', otherIncome.id)
  const interestIncome = await createLedger('Interest Income', otherIncome.id)

  // Customers (Sundry Debtors)
  const customers = [
    { name: 'Global Logistics Solutions', gstin: '27AAPFG1234A1Z9', state: 'Maharashtra', stateCode: '27', city: 'Mumbai' },
    { name: 'Creative Agencies Pvt Ltd', gstin: '33AAPFC5678B1ZA', state: 'Tamil Nadu', stateCode: '33', city: 'Chennai' },
    { name: 'Nova Tech Systems', gstin: '29AAPFN9012C1ZB', state: 'Karnataka', stateCode: '29', city: 'Bangalore' },
    { name: 'Apex Industrial Supplies', gstin: '36AAPFA3456D1ZC', state: 'Telangana', stateCode: '36', city: 'Hyderabad' },
    { name: 'Sunrise Pharmaceuticals', gstin: '24AAPFS7890E1ZD', state: 'Gujarat', stateCode: '24', city: 'Ahmedabad' },
    { name: 'Metro Construction Co', gstin: '07AAPFM2345F1ZE', state: 'Delhi', stateCode: '07', city: 'New Delhi' },
    { name: 'Pacific Exports Ltd', gstin: '32AAPFP6789G1ZF', state: 'Kerala', stateCode: '32', city: 'Kochi' },
    { name: 'Diamond Retail Pvt Ltd', gstin: '08AAPFD0123H1ZG', state: 'Rajasthan', stateCode: '08', city: 'Jaipur' },
    { name: 'Eastern Trading Company', gstin: '19AAPFE4567I1ZH', state: 'West Bengal', stateCode: '19', city: 'Kolkata' },
    { name: 'Northern Distributors', gstin: '03AAPFN8901J1ZI', state: 'Punjab', stateCode: '03', city: 'Ludhiana' },
  ]

  const customerLedgers = []
  for (const c of customers) {
    const l = await prisma.ledger.upsert({
      where: { companyId_name: { companyId: company.id, name: c.name } },
      update: {},
      create: {
        companyId: company.id,
        groupId: sundryDeb.id,
        name: c.name,
        gstin: c.gstin,
        state: c.state,
        stateCode: c.stateCode,
        city: c.city,
        isParty: true,
        partyType: PartyType.CUSTOMER,
        gstType: GSTType.REGULAR,
        creditLimit: 500000,
        creditDays: 30,
        isActive: true,
      },
    })
    customerLedgers.push(l)
  }

  // Suppliers (Sundry Creditors)
  const suppliers = [
    { name: 'Steel & Alloys Ltd', gstin: '27AAPFS1111A1Z1', state: 'Maharashtra', stateCode: '27' },
    { name: 'Chemical Supplies Corp', gstin: '24AAPFC2222B1Z2', state: 'Gujarat', stateCode: '24' },
    { name: 'Electronic Components Hub', gstin: '29AAPFE3333C1Z3', state: 'Karnataka', stateCode: '29' },
    { name: 'Raw Materials India', gstin: '06AAPFR4444D1Z4', state: 'Haryana', stateCode: '06' },
    { name: 'Packaging Solutions Pvt Ltd', gstin: '33AAPFP5555E1Z5', state: 'Tamil Nadu', stateCode: '33' },
    { name: 'Logistics Partners Ltd', gstin: '36AAPFL6666F1Z6', state: 'Telangana', stateCode: '36' },
    { name: 'Office Depot India', gstin: '07AAPFO7777G1Z7', state: 'Delhi', stateCode: '07' },
    { name: 'Power Systems Ltd', gstin: '08AAPFP8888H1Z8', state: 'Rajasthan', stateCode: '08' },
    { name: 'Fiber & Fabric Co', gstin: '24AAPFF9999I1Z9', state: 'Gujarat', stateCode: '24' },
    { name: 'Tech Components Pvt Ltd', gstin: '29AAPFT0000J1Z0', state: 'Karnataka', stateCode: '29' },
  ]

  const supplierLedgers = []
  for (const s of suppliers) {
    const l = await prisma.ledger.upsert({
      where: { companyId_name: { companyId: company.id, name: s.name } },
      update: {},
      create: {
        companyId: company.id,
        groupId: sundryCred.id,
        name: s.name,
        gstin: s.gstin,
        state: s.state,
        stateCode: s.stateCode,
        isParty: true,
        partyType: PartyType.SUPPLIER,
        gstType: GSTType.REGULAR,
        creditDays: 45,
        isActive: true,
      },
    })
    supplierLedgers.push(l)
  }

  // Units
  const unitNos = await prisma.unit.upsert({ where: { id: 'unit-nos' }, update: {}, create: { id: 'unit-nos', companyId: company.id, name: 'Numbers', symbol: 'Nos', isSystem: true } })
  const unitKg = await prisma.unit.upsert({ where: { id: 'unit-kg' }, update: {}, create: { id: 'unit-kg', companyId: company.id, name: 'Kilograms', symbol: 'Kg', isSystem: true } })
  const unitMtr = await prisma.unit.upsert({ where: { id: 'unit-mtr' }, update: {}, create: { id: 'unit-mtr', companyId: company.id, name: 'Metres', symbol: 'Mtr', isSystem: true } })
  const unitLtr = await prisma.unit.upsert({ where: { id: 'unit-ltr' }, update: {}, create: { id: 'unit-ltr', companyId: company.id, name: 'Litres', symbol: 'Ltr', isSystem: true } })
  const unitBox = await prisma.unit.upsert({ where: { id: 'unit-box' }, update: {}, create: { id: 'unit-box', companyId: company.id, name: 'Box', symbol: 'Box', isSystem: false } })

  // Main Godown
  const mainGodown = await prisma.godown.upsert({
    where: { id: 'godown-main' },
    update: {},
    create: { id: 'godown-main', companyId: company.id, name: 'Main Warehouse', address: '42, Anna Salai, Chennai', isMain: true },
  })

  // Items (20 with HSN codes)
  const items = [
    { name: 'Steel Cable 12mm', hsnCode: '7312', unitId: unitMtr.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 500, openingRate: 450, reorderLevel: 100, category: 'Steel Products' },
    { name: 'Hydraulic Fluid 20L', hsnCode: '2710', unitId: unitLtr.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 50, openingRate: 2250, reorderLevel: 10, category: 'Chemicals' },
    { name: 'Copper Wire 2.5mm', hsnCode: '7408', unitId: unitKg.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 200, openingRate: 850, reorderLevel: 50, category: 'Electrical' },
    { name: 'Electronic Controller v2', hsnCode: '8537', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 30, openingRate: 12000, reorderLevel: 5, category: 'Electronics' },
    { name: 'Plastic Granules HDPE', hsnCode: '3901', unitId: unitKg.id, igstRate: 12, cgstRate: 6, sgstRate: 6, openingStock: 1000, openingRate: 95, reorderLevel: 200, category: 'Plastics' },
    { name: 'Bearings SKF 6205', hsnCode: '8482', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 100, openingRate: 320, reorderLevel: 25, category: 'Mechanical' },
    { name: 'Paint Primer 20L', hsnCode: '3210', unitId: unitLtr.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 40, openingRate: 1800, reorderLevel: 10, category: 'Paints' },
    { name: 'Industrial Gloves (pair)', hsnCode: '3926', unitId: unitNos.id, igstRate: 12, cgstRate: 6, sgstRate: 6, openingStock: 200, openingRate: 180, reorderLevel: 50, category: 'Safety' },
    { name: 'PVC Pipe 1 inch 6m', hsnCode: '3917', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 150, openingRate: 220, reorderLevel: 30, category: 'Pipes' },
    { name: 'Welding Electrodes 3.15mm', hsnCode: '8311', unitId: unitKg.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 80, openingRate: 120, reorderLevel: 20, category: 'Welding' },
    { name: 'Gear Oil 15W40 5L', hsnCode: '2710', unitId: unitLtr.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 60, openingRate: 650, reorderLevel: 15, category: 'Lubricants' },
    { name: 'Aluminium Sheet 2mm', hsnCode: '7606', unitId: unitKg.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 300, openingRate: 280, reorderLevel: 75, category: 'Metals' },
    { name: 'Safety Helmet IS 2925', hsnCode: '6506', unitId: unitNos.id, igstRate: 12, cgstRate: 6, sgstRate: 6, openingStock: 50, openingRate: 450, reorderLevel: 10, category: 'Safety' },
    { name: 'Fiber Optic Cable 50m', hsnCode: '8544', unitId: unitMtr.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 20, openingRate: 8500, reorderLevel: 5, category: 'Telecom' },
    { name: 'Conveyor Belt 3m', hsnCode: '4010', unitId: unitMtr.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 15, openingRate: 3200, reorderLevel: 3, category: 'Industrial' },
    { name: 'Gasket Sheet 1m x 1m', hsnCode: '8484', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 40, openingRate: 550, reorderLevel: 10, category: 'Sealing' },
    { name: 'Circuit Breaker 32A', hsnCode: '8536', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 25, openingRate: 1200, reorderLevel: 5, category: 'Electrical' },
    { name: 'Stainless Steel Bolt M12', hsnCode: '7318', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 500, openingRate: 45, reorderLevel: 100, category: 'Fasteners' },
    { name: 'Sealing Compound 500ml', hsnCode: '3214', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 30, openingRate: 380, reorderLevel: 8, category: 'Chemicals' },
    { name: 'Pump Motor 1HP', hsnCode: '8501', unitId: unitNos.id, igstRate: 18, cgstRate: 9, sgstRate: 9, openingStock: 10, openingRate: 8500, reorderLevel: 2, category: 'Motors' },
  ]

  const createdItems = []
  for (const item of items) {
    const i = await prisma.item.upsert({
      where: { companyId_name: { companyId: company.id, name: item.name } },
      update: {},
      create: { companyId: company.id, isActive: true, ...item },
    })
    createdItems.push(i)
  }

  // TDS Sections
  const tdsSections = [
    { section: '194C', description: 'Payment to Contractors', rate: 1, thresholdLimit: 30000 },
    { section: '194J', description: 'Professional/Technical Services', rate: 10, thresholdLimit: 30000 },
    { section: '194H', description: 'Commission or Brokerage', rate: 5, thresholdLimit: 15000 },
    { section: '194I', description: 'Rent', rate: 10, thresholdLimit: 240000 },
    { section: '194A', description: 'Interest other than Securities', rate: 10, thresholdLimit: 40000 },
  ]

  for (const t of tdsSections) {
    await prisma.tDSSection.upsert({
      where: { id: `tds-${t.section}` },
      update: {},
      create: { id: `tds-${t.section}`, companyId: company.id, ...t },
    })
  }

  // Payroll Group
  const payrollGroup = await prisma.payrollGroup.upsert({
    where: { id: 'pg-permanent' },
    update: {},
    create: { id: 'pg-permanent', companyId: company.id, name: 'Permanent Staff', pfApplicable: true, esiApplicable: true },
  })

  // Employees
  const employees = [
    { name: 'Rajesh Kumar', designation: 'Senior Engineer', department: 'Operations', basicSalary: 45000, hra: 18000, conveyance: 1600, special: 10000 },
    { name: 'Priya Sharma', designation: 'Accounts Manager', department: 'Finance', basicSalary: 50000, hra: 20000, conveyance: 1600, special: 12000 },
    { name: 'Arun Venkatesh', designation: 'Sales Executive', department: 'Sales', basicSalary: 35000, hra: 14000, conveyance: 1600, special: 8000 },
  ]

  const createdEmployees = []
  for (const [i, emp] of employees.entries()) {
    const e = await prisma.employee.upsert({
      where: { id: `emp-00${i + 1}` },
      update: {},
      create: {
        id: `emp-00${i + 1}`,
        companyId: company.id,
        groupId: payrollGroup.id,
        code: `EMP-00${i + 1}`,
        pfApplicable: true,
        esiApplicable: emp.basicSalary <= 21000,
        isActive: true,
        dateOfJoining: new Date('2022-04-01'),
        ...emp,
      },
    })
    createdEmployees.push(e)
  }

  // Helper: create voucher with entries
  const createVoucher = async (
    type: VoucherType,
    number: string,
    date: Date,
    narration: string,
    entries: Array<{ ledgerId: string; type: EntryType; amount: number }>,
    gstLines?: Array<{ hsnCode: string; taxableValue: number; cgstRate: number; sgstRate: number; igstRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalTax: number }>,
    inventoryLines?: Array<{ itemId: string; quantity: number; rate: number; amount: number; godownId?: string }>,
  ) => {
    const totalAmount = entries.filter(e => e.type === EntryType.DEBIT).reduce((sum, e) => sum + e.amount, 0)
    return prisma.voucher.create({
      data: {
        companyId: company.id,
        type,
        number,
        date,
        narration,
        totalAmount,
        isPosted: true,
        gstApplicable: (gstLines?.length ?? 0) > 0,
        entries: { create: entries },
        gstLines: gstLines ? { create: gstLines } : undefined,
        inventoryLines: inventoryLines ? { create: inventoryLines.map(il => ({ ...il, discount: 0, godownId: mainGodown.id })) } : undefined,
      },
    })
  }

  // Helper: date in FY 2024-25
  const d = (month: number, day: number) => new Date(`2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)

  // --- SALES VOUCHERS ---
  // Sale to Global Logistics (inter-state -> IGST)
  await createVoucher(VoucherType.SALES, 'SI/2024-25/001', d(4, 5), 'Sales of Steel Cable to Global Logistics Solutions',
    [
      { ledgerId: customerLedgers[0].id, type: EntryType.DEBIT, amount: 63540 },
      { ledgerId: salesLedger.id, type: EntryType.CREDIT, amount: 54000 },
      { ledgerId: igstOutput.id, type: EntryType.CREDIT, amount: 9720 },
    ],
    [{ hsnCode: '7312', taxableValue: 54000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 9720, totalTax: 9720 }],
    [{ itemId: createdItems[0].id, quantity: 120, rate: 450, amount: 54000 }]
  )

  // Sale to Creative Agencies (intra-state -> CGST + SGST)
  await createVoucher(VoucherType.SALES, 'SI/2024-25/002', d(4, 12), 'Sales of Copper Wire to Creative Agencies Pvt Ltd',
    [
      { ledgerId: customerLedgers[1].id, type: EntryType.DEBIT, amount: 100300 },
      { ledgerId: salesLedger.id, type: EntryType.CREDIT, amount: 85000 },
      { ledgerId: cgstOutput.id, type: EntryType.CREDIT, amount: 7650 },
      { ledgerId: sgstOutput.id, type: EntryType.CREDIT, amount: 7650 },
    ],
    [{ hsnCode: '7408', taxableValue: 85000, cgstRate: 9, sgstRate: 9, igstRate: 0, cgstAmount: 7650, sgstAmount: 7650, igstAmount: 0, totalTax: 15300 }],
    [{ itemId: createdItems[2].id, quantity: 100, rate: 850, amount: 85000 }]
  )

  await createVoucher(VoucherType.SALES, 'SI/2024-25/003', d(4, 20), 'Sales of Electronic Controllers',
    [
      { ledgerId: customerLedgers[2].id, type: EntryType.DEBIT, amount: 141600 },
      { ledgerId: salesLedger.id, type: EntryType.CREDIT, amount: 120000 },
      { ledgerId: igstOutput.id, type: EntryType.CREDIT, amount: 21600 },
    ],
    [{ hsnCode: '8537', taxableValue: 120000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 21600, totalTax: 21600 }],
    [{ itemId: createdItems[3].id, quantity: 10, rate: 12000, amount: 120000 }]
  )

  await createVoucher(VoucherType.SALES, 'SI/2024-25/004', d(5, 8), 'Sales of PVC Pipes',
    [
      { ledgerId: customerLedgers[3].id, type: EntryType.DEBIT, amount: 51920 },
      { ledgerId: salesLedger.id, type: EntryType.CREDIT, amount: 44000 },
      { ledgerId: igstOutput.id, type: EntryType.CREDIT, amount: 7920 },
    ],
    [{ hsnCode: '3917', taxableValue: 44000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 7920, totalTax: 7920 }],
    [{ itemId: createdItems[8].id, quantity: 200, rate: 220, amount: 44000 }]
  )

  await createVoucher(VoucherType.SALES, 'SI/2024-25/005', d(5, 22), 'Sales of Bearings',
    [
      { ledgerId: customerLedgers[4].id, type: EntryType.DEBIT, amount: 94400 },
      { ledgerId: salesLedger.id, type: EntryType.CREDIT, amount: 80000 },
      { ledgerId: igstOutput.id, type: EntryType.CREDIT, amount: 14400 },
    ],
    [{ hsnCode: '8482', taxableValue: 80000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 14400, totalTax: 14400 }],
    [{ itemId: createdItems[5].id, quantity: 250, rate: 320, amount: 80000 }]
  )

  await createVoucher(VoucherType.SALES, 'SI/2024-25/006', d(6, 5), 'Sales of Aluminium Sheets',
    [
      { ledgerId: customerLedgers[5].id, type: EntryType.DEBIT, amount: 98440 },
      { ledgerId: salesLedger.id, type: EntryType.CREDIT, amount: 84000 },
      { ledgerId: igstOutput.id, type: EntryType.CREDIT, amount: 15120 },
    ],
    [{ hsnCode: '7606', taxableValue: 84000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 15120, totalTax: 15120 }],
    [{ itemId: createdItems[11].id, quantity: 300, rate: 280, amount: 84000 }]
  )

  await createVoucher(VoucherType.SALES, 'SI/2024-25/007', d(6, 18), 'Sales of Pump Motors',
    [
      { ledgerId: customerLedgers[6].id, type: EntryType.DEBIT, amount: 200600 },
      { ledgerId: salesLedger.id, type: EntryType.CREDIT, amount: 170000 },
      { ledgerId: igstOutput.id, type: EntryType.CREDIT, amount: 30600 },
    ],
    [{ hsnCode: '8501', taxableValue: 170000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 30600, totalTax: 30600 }],
    [{ itemId: createdItems[19].id, quantity: 20, rate: 8500, amount: 170000 }]
  )

  // --- PURCHASE VOUCHERS ---
  await createVoucher(VoucherType.PURCHASE, 'PI/2024-25/001', d(4, 3), 'Purchase of Steel Cables from Steel & Alloys Ltd',
    [
      { ledgerId: purchaseLedger.id, type: EntryType.DEBIT, amount: 135000 },
      { ledgerId: igstInput.id, type: EntryType.DEBIT, amount: 24300 },
      { ledgerId: supplierLedgers[0].id, type: EntryType.CREDIT, amount: 159300 },
    ],
    [{ hsnCode: '7312', taxableValue: 135000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 24300, totalTax: 24300 }],
    [{ itemId: createdItems[0].id, quantity: 300, rate: 450, amount: 135000 }]
  )

  await createVoucher(VoucherType.PURCHASE, 'PI/2024-25/002', d(4, 15), 'Purchase of Electronic Components',
    [
      { ledgerId: purchaseLedger.id, type: EntryType.DEBIT, amount: 90000 },
      { ledgerId: igstInput.id, type: EntryType.DEBIT, amount: 16200 },
      { ledgerId: supplierLedgers[2].id, type: EntryType.CREDIT, amount: 106200 },
    ],
    [{ hsnCode: '8537', taxableValue: 90000, cgstRate: 0, sgstRate: 0, igstRate: 18, cgstAmount: 0, sgstAmount: 0, igstAmount: 16200, totalTax: 16200 }],
    [{ itemId: createdItems[3].id, quantity: 7, rate: 12000, amount: 84000 }]
  )

  await createVoucher(VoucherType.PURCHASE, 'PI/2024-25/003', d(5, 10), 'Purchase of Plastic Granules',
    [
      { ledgerId: purchaseLedger.id, type: EntryType.DEBIT, amount: 95000 },
      { ledgerId: igstInput.id, type: EntryType.DEBIT, amount: 11400 },
      { ledgerId: supplierLedgers[3].id, type: EntryType.CREDIT, amount: 106400 },
    ],
    [{ hsnCode: '3901', taxableValue: 95000, cgstRate: 0, sgstRate: 0, igstRate: 12, cgstAmount: 0, sgstAmount: 0, igstAmount: 11400, totalTax: 11400 }],
    [{ itemId: createdItems[4].id, quantity: 1000, rate: 95, amount: 95000 }]
  )

  // --- PAYMENT VOUCHERS ---
  await createVoucher(VoucherType.PAYMENT, 'PYMT/2024-25/001', d(4, 30), 'Rent paid for April 2024 by HDFC Bank NEFT',
    [
      { ledgerId: rentExp.id, type: EntryType.DEBIT, amount: 120000 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 120000 },
    ]
  )

  await createVoucher(VoucherType.PAYMENT, 'PYMT/2024-25/002', d(5, 2), 'Salary paid for April 2024',
    [
      { ledgerId: salaryExp.id, type: EntryType.DEBIT, amount: 248000 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 248000 },
    ]
  )

  await createVoucher(VoucherType.PAYMENT, 'PYMT/2024-25/003', d(5, 15), 'Payment to Steel & Alloys Ltd against PI/001',
    [
      { ledgerId: supplierLedgers[0].id, type: EntryType.DEBIT, amount: 159300 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 159300 },
    ]
  )

  await createVoucher(VoucherType.PAYMENT, 'PYMT/2024-25/004', d(5, 31), 'Rent paid for May 2024',
    [
      { ledgerId: rentExp.id, type: EntryType.DEBIT, amount: 120000 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 120000 },
    ]
  )

  await createVoucher(VoucherType.PAYMENT, 'PYMT/2024-25/005', d(6, 2), 'Salary paid for May 2024',
    [
      { ledgerId: salaryExp.id, type: EntryType.DEBIT, amount: 248000 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 248000 },
    ]
  )

  await createVoucher(VoucherType.PAYMENT, 'PYMT/2024-25/006', d(6, 10), 'Bank charges HDFC',
    [
      { ledgerId: bankCharges.id, type: EntryType.DEBIT, amount: 2500 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 2500 },
    ]
  )

  await createVoucher(VoucherType.PAYMENT, 'PYMT/2024-25/007', d(6, 30), 'Rent paid for June 2024',
    [
      { ledgerId: rentExp.id, type: EntryType.DEBIT, amount: 120000 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 120000 },
    ]
  )

  // --- RECEIPT VOUCHERS ---
  await createVoucher(VoucherType.RECEIPT, 'RCPT/2024-25/001', d(4, 25), 'Receipt from Global Logistics Solutions',
    [
      { ledgerId: hdfcLedger.id, type: EntryType.DEBIT, amount: 63540 },
      { ledgerId: customerLedgers[0].id, type: EntryType.CREDIT, amount: 63540 },
    ]
  )

  await createVoucher(VoucherType.RECEIPT, 'RCPT/2024-25/002', d(5, 20), 'Receipt from Creative Agencies Pvt Ltd',
    [
      { ledgerId: hdfcLedger.id, type: EntryType.DEBIT, amount: 100300 },
      { ledgerId: customerLedgers[1].id, type: EntryType.CREDIT, amount: 100300 },
    ]
  )

  await createVoucher(VoucherType.RECEIPT, 'RCPT/2024-25/003', d(6, 15), 'Receipt from Nova Tech Systems',
    [
      { ledgerId: hdfcLedger.id, type: EntryType.DEBIT, amount: 141600 },
      { ledgerId: customerLedgers[2].id, type: EntryType.CREDIT, amount: 141600 },
    ]
  )

  await createVoucher(VoucherType.RECEIPT, 'RCPT/2024-25/004', d(6, 28), 'Interest income from HDFC FD',
    [
      { ledgerId: cashLedger.id, type: EntryType.DEBIT, amount: 12500 },
      { ledgerId: interestIncome.id, type: EntryType.CREDIT, amount: 12500 },
    ]
  )

  // --- JOURNAL VOUCHERS ---
  await createVoucher(VoucherType.JOURNAL, 'JRNL/2024-25/001', d(4, 30), 'Depreciation on Fixed Assets for April 2024',
    [
      { ledgerId: depreciation.id, type: EntryType.DEBIT, amount: 15000 },
      { ledgerId: capitalLedger.id, type: EntryType.CREDIT, amount: 15000 },
    ]
  )

  await createVoucher(VoucherType.JOURNAL, 'JRNL/2024-25/002', d(5, 31), 'GST Setoff - IGST Input vs IGST Output',
    [
      { ledgerId: igstOutput.id, type: EntryType.DEBIT, amount: 45720 },
      { ledgerId: igstInput.id, type: EntryType.CREDIT, amount: 45720 },
    ]
  )

  // --- CONTRA VOUCHERS ---
  await createVoucher(VoucherType.CONTRA, 'CNTR/2024-25/001', d(4, 10), 'Cash withdrawn from HDFC Bank for petty expenses',
    [
      { ledgerId: cashLedger.id, type: EntryType.DEBIT, amount: 25000 },
      { ledgerId: hdfcLedger.id, type: EntryType.CREDIT, amount: 25000 },
    ]
  )

  await createVoucher(VoucherType.CONTRA, 'CNTR/2024-25/002', d(5, 5), 'Cash deposited to ICICI Bank',
    [
      { ledgerId: icicLedger.id, type: EntryType.DEBIT, amount: 50000 },
      { ledgerId: cashLedger.id, type: EntryType.CREDIT, amount: 50000 },
    ]
  )

  // Payroll Entries (2 months)
  for (const month of [4, 5]) {
    for (const emp of createdEmployees) {
      const gross = emp.basicSalary + emp.hra + emp.conveyance + emp.special
      const pfEmp = Math.min(emp.basicSalary, 15000) * 0.12
      const pfEmr = pfEmp
      const esiEmp = gross <= 21000 ? gross * 0.0075 : 0
      const esiEmr = gross <= 21000 ? gross * 0.0325 : 0
      const net = gross - pfEmp - esiEmp

      await prisma.payrollEntry.create({
        data: {
          employeeId: emp.id,
          month,
          year: 2024,
          workingDays: 26,
          presentDays: 26,
          basic: emp.basicSalary,
          hra: emp.hra,
          conveyance: emp.conveyance,
          special: emp.special,
          otherEarnings: 0,
          grossSalary: gross,
          pfEmployee: pfEmp,
          esiEmployee: esiEmp,
          tds: 0,
          otherDeductions: 0,
          netSalary: net,
          pfEmployer: pfEmr,
          esiEmployer: esiEmr,
          isPaid: true,
          paidOn: new Date(`2024-${String(month + 1).padStart(2,'0')}-02`),
        },
      })
    }
  }

  console.log('Seed completed successfully!')
  console.log(`   Company: ${company.name}`)
  console.log(`   Demo user: demo@accura.in / Demo@123`)
  console.log(`   Ledger groups: 18 created`)
  console.log(`   Ledgers: ${10 + customers.length + suppliers.length} created`)
  console.log(`   Items: ${items.length} created`)
  console.log(`   Vouchers: 20+ created`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
