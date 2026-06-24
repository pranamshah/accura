export type UserRole = "SUPER_ADMIN" | "ADMIN" | "ACCOUNTANT" | "VIEWER" | "CA";
export type BusinessType =
  | "SOLE_PROPRIETORSHIP"
  | "PARTNERSHIP"
  | "LLP"
  | "PRIVATE_LIMITED"
  | "PUBLIC_LIMITED"
  | "OPC"
  | "TRUST"
  | "NGO";
export type GroupNature = "ASSETS" | "LIABILITIES" | "INCOME" | "EXPENSES";
export type BalanceType = "DEBIT" | "CREDIT";
export type PartyType = "CUSTOMER" | "SUPPLIER" | "BOTH";
export type GSTType =
  | "REGULAR"
  | "COMPOSITION"
  | "UNREGISTERED"
  | "CONSUMER"
  | "OVERSEAS"
  | "SEZ";
export type VoucherType =
  | "SALES"
  | "PURCHASE"
  | "PAYMENT"
  | "RECEIPT"
  | "JOURNAL"
  | "CONTRA"
  | "DEBIT_NOTE"
  | "CREDIT_NOTE"
  | "SALES_ORDER"
  | "PURCHASE_ORDER"
  | "DELIVERY_NOTE"
  | "GOODS_RECEIPT"
  | "OPENING_BALANCE"
  | "PAYROLL";
export type VoucherStatus = "ACTIVE" | "CANCELLED" | "DRAFT";
export type EntryType = "DEBIT" | "CREDIT";
export type GSTReturnType = "GSTR1" | "GSTR2B" | "GSTR3B" | "GSTR9" | "GSTR9C" | "CMP08";
export type ReturnStatus = "PENDING" | "DRAFT" | "FILED" | "VERIFIED";
export type CAAccess = "READ" | "FULL";
export type AIType =
  | "ENTRY_SUGGESTION"
  | "NARRATION"
  | "RECONCILIATION"
  | "ANOMALY_DETECTION"
  | "REPORT_INSIGHT"
  | "LEDGER_CLASSIFICATION";

export interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  tan?: string | null;
  cin?: string | null;
  msmeNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  bankBranch?: string | null;
  logoUrl?: string | null;
  financialYearStart: number;
  currencySymbol: string;
  currency: string;
  taxRegistered: boolean;
  compositeDealer: boolean;
  businessType: BusinessType;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerGroup {
  id: string;
  companyId: string;
  name: string;
  alias?: string | null;
  parentId?: string | null;
  nature: GroupNature;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  children?: LedgerGroup[];
  ledgers?: Ledger[];
  parent?: LedgerGroup | null;
}

export interface Ledger {
  id: string;
  companyId: string;
  groupId: string;
  name: string;
  alias?: string | null;
  openingBalance: number;
  openingBalanceType: BalanceType;
  gstin?: string | null;
  pan?: string | null;
  tan?: string | null;
  mobileNo?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  creditLimit?: number | null;
  creditDays?: number | null;
  isParty: boolean;
  partyType?: PartyType | null;
  gstType?: GSTType | null;
  tdsApplicable: boolean;
  tdsSectionId?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  group?: LedgerGroup;
  balance?: number;
  balanceType?: BalanceType;
}

export interface VoucherEntry {
  id: string;
  voucherId: string;
  ledgerId: string;
  type: EntryType;
  amount: number;
  narration?: string | null;
  billRef?: string | null;
  billDate?: string | null;
  ledger?: Ledger;
}

export interface GSTLine {
  id: string;
  voucherId: string;
  hsnCode?: string | null;
  description?: string | null;
  quantity?: number | null;
  rate?: number | null;
  taxableValue: number;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  cessRate: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  cessAmount: number;
  totalTax: number;
}

export interface InventoryLine {
  id: string;
  voucherId: string;
  itemId: string;
  godownId?: string | null;
  batchNo?: string | null;
  serialNo?: string | null;
  quantity: number;
  rate: number;
  amount: number;
  discount: number;
  item?: Item;
  godown?: Godown | null;
}

export interface Voucher {
  id: string;
  companyId: string;
  type: VoucherType;
  number: string;
  date: string;
  narration?: string | null;
  reference?: string | null;
  totalAmount: number;
  status: VoucherStatus;
  isPosted: boolean;
  gstApplicable: boolean;
  gstType?: string | null;
  placeOfSupply?: string | null;
  reverseCharge: boolean;
  eInvoiceIRN?: string | null;
  eInvoiceQR?: string | null;
  eWayBillNo?: string | null;
  eWayBillExpiry?: string | null;
  costCentreId?: string | null;
  aiGenerated: boolean;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  entries?: VoucherEntry[];
  gstLines?: GSTLine[];
  inventoryLines?: InventoryLine[];
  // Computed/joined fields returned by some API endpoints
  partyName?: string | null;
  partyGstin?: string | null;
  subtotal?: number;
  taxAmount?: number;
  amount?: number;
}

export interface Item {
  id: string;
  companyId: string;
  name: string;
  alias?: string | null;
  code?: string | null;
  hsnCode?: string | null;
  sacCode?: string | null;
  unitId?: string | null;
  category?: string | null;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  cessRate: number;
  openingStock: number;
  openingRate: number;
  reorderLevel?: number | null;
  maxStock?: number | null;
  isBatchEnabled: boolean;
  isSerialEnabled: boolean;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  unit?: Unit | null;
  currentStock?: number;
}

export interface Unit {
  id: string;
  companyId: string;
  name: string;
  symbol: string;
  isSystem: boolean;
}

export interface Godown {
  id: string;
  companyId: string;
  name: string;
  address?: string | null;
  isMain: boolean;
}

export interface Employee {
  id: string;
  companyId: string;
  groupId?: string | null;
  code?: string | null;
  name: string;
  designation?: string | null;
  department?: string | null;
  dateOfJoining?: string | null;
  dateOfLeaving?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  uan?: string | null;
  esicNo?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  basicSalary: number;
  hra: number;
  conveyance: number;
  special: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  isActive: boolean;
  createdAt: string;
  group?: PayrollGroup | null;
}

export interface PayrollGroup {
  id: string;
  companyId: string;
  name: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  basic: number;
  hra: number;
  conveyance: number;
  special: number;
  otherEarnings: number;
  grossSalary: number;
  pfEmployee: number;
  esiEmployee: number;
  tds: number;
  otherDeductions: number;
  netSalary: number;
  pfEmployer: number;
  esiEmployer: number;
  isPaid: boolean;
  paidOn?: string | null;
  createdAt: string;
  employee?: Employee;
}

export interface TDSSection {
  id: string;
  companyId: string;
  section: string;
  description?: string | null;
  rate: number;
  thresholdLimit: number;
}

export interface BankAccount {
  id: string;
  companyId: string;
  name: string;
  accountNo: string;
  bankName: string;
  ifsc?: string | null;
  branch?: string | null;
  openingBalance: number;
  createdAt: string;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  voucherId?: string | null;
  date: string;
  description?: string | null;
  amount: number;
  type: EntryType;
  isReconciled: boolean;
  reconciledDate?: string | null;
}

export interface DashboardData {
  cashBalance: number;
  bankBalance: number;
  todayVouchers: Record<string, number>;
  topReceivables: Array<{ ledgerName: string; amount: number }>;
  topPayables: Array<{ ledgerName: string; amount: number }>;
  gstLiability: number;
  monthlyRevenue: Array<{ month: string; revenue: number; expense: number }>;
  stockAlerts: Array<{ itemName: string; currentStock: number; reorderLevel: number }>;
  tdsDue: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    type: VoucherType;
    number: string;
    amount: number;
    narration?: string | null;
  }>;
  anomalies: string[];
}

export interface TrialBalanceRow {
  ledgerName: string;
  groupName: string;
  nature: GroupNature;
  debit: number;
  credit: number;
}

export interface ProfitLossData {
  income: Array<{ name: string; amount: number }>;
  expenses: Array<{ name: string; amount: number }>;
  grossProfit: number;
  netProfit: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface BalanceSheetData {
  assets: Array<{ name: string; amount: number; children?: Array<{ name: string; amount: number }> }>;
  liabilities: Array<{ name: string; amount: number; children?: Array<{ name: string; amount: number }> }>;
  totalAssets: number;
  totalLiabilities: number;
}

export interface GSTCalcResult {
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  total: number;
}

export interface FinancialYear {
  start: Date;
  end: Date;
  label: string;
}

export interface AISuggestion {
  type: "VOUCHER" | "NARRATION" | "INSIGHT" | "ANOMALY";
  voucherType?: VoucherType;
  date?: string;
  narration?: string;
  entries?: Array<{
    ledgerName: string;
    type: EntryType;
    amount: number;
  }>;
  message?: string;
  confidence?: number;
}

export interface CAShare {
  id: string;
  companyId: string;
  caEmail: string;
  accessLevel: CAAccess;
  sharedBy: string;
  expiresAt?: string | null;
  isActive: boolean;
  token: string;
  createdAt: string;
  company?: Company;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ip?: string | null;
  createdAt: string;
  user?: { name?: string | null; email: string } | null;
}
