export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER' | 'CA';
export type GroupNature = 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES';
export type BalanceType = 'DEBIT' | 'CREDIT';
export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
export type GSTType = 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' | 'CONSUMER' | 'OVERSEAS' | 'SEZ';
export type VoucherType = 'SALES' | 'PURCHASE' | 'PAYMENT' | 'RECEIPT' | 'JOURNAL' | 'CONTRA' | 'DEBIT_NOTE' | 'CREDIT_NOTE' | 'SALES_ORDER' | 'PURCHASE_ORDER' | 'DELIVERY_NOTE' | 'GOODS_RECEIPT' | 'OPENING_BALANCE' | 'PAYROLL' | 'ATTENDANCE' | 'STOCK_JOURNAL' | 'PHYSICAL_STOCK';
export type VoucherStatus = 'ACTIVE' | 'CANCELLED' | 'DRAFT';
export type EntryType = 'DEBIT' | 'CREDIT';

export interface Company {
  id: string; name: string; legalName?: string | null; gstin?: string | null;
  pan?: string | null; tan?: string | null; address?: string | null; city?: string | null;
  state?: string | null; stateCode?: string | null; pincode?: string | null;
  phone?: string | null; email?: string | null; website?: string | null;
  bankName?: string | null; bankAccount?: string | null; bankIfsc?: string | null;
  bankBranch?: string | null; logoUrl?: string | null;
  financialYearStart: number; currency: string; currencySymbol: string;
  taxRegistered: boolean; compositeDealer: boolean;
  features: Record<string, boolean>; createdAt: string; updatedAt: string;
}

export interface LedgerGroup {
  id: string; companyId: string; name: string; alias?: string | null;
  parentId?: string | null; nature: GroupNature; isSystem: boolean; createdAt: string;
  children?: LedgerGroup[]; ledgers?: Ledger[]; parent?: LedgerGroup | null;
}

export interface Ledger {
  id: string; companyId: string; groupId: string; name: string; alias?: string | null;
  openingBalance: number; openingBalanceType: BalanceType;
  gstin?: string | null; pan?: string | null; mobileNo?: string | null;
  email?: string | null; address?: string | null; city?: string | null;
  state?: string | null; stateCode?: string | null; pincode?: string | null;
  creditLimit?: number | null; creditDays?: number | null;
  isParty: boolean; partyType?: PartyType | null; gstType?: GSTType | null;
  tdsApplicable: boolean; tdsSection?: string | null;
  bankName?: string | null; bankAccount?: string | null; bankIfsc?: string | null;
  isActive: boolean; isSystem: boolean; createdAt: string; updatedAt: string;
  group?: LedgerGroup; balance?: number; balanceType?: BalanceType;
}

export interface VoucherEntry {
  id: string; voucherId: string; ledgerId: string; type: EntryType;
  amount: number; narration?: string | null; billRef?: string | null; billDate?: string | null;
  ledger?: Ledger;
}

export interface GSTLine {
  id: string; voucherId: string; hsnCode?: string | null; description?: string | null;
  quantity?: number | null; rate?: number | null; taxableValue: number;
  igstRate: number; cgstRate: number; sgstRate: number; cessRate: number;
  igstAmount: number; cgstAmount: number; sgstAmount: number; cessAmount: number;
  totalTax: number; itcEligible?: string;
}

export interface InventoryLine {
  id: string; voucherId: string; itemId: string; godownId?: string | null;
  batchNo?: string | null; serialNo?: string | null; quantity: number;
  rate: number; amount: number; discount: number; item?: Item;
}

export interface Voucher {
  id: string; companyId: string; type: VoucherType; number: string; date: string;
  narration?: string | null; reference?: string | null; totalAmount: number;
  status: VoucherStatus; isPosted: boolean; gstApplicable: boolean;
  gstType?: string | null; placeOfSupply?: string | null; reverseCharge: boolean;
  eInvoiceIRN?: string | null; eInvoiceQR?: string | null;
  eWayBillNo?: string | null; eWayBillExpiry?: string | null;
  partyLedgerId?: string | null; aiGenerated: boolean; attachments: string[];
  createdAt: string; updatedAt: string;
  entries?: VoucherEntry[]; gstLines?: GSTLine[]; inventoryLines?: InventoryLine[];
  partyName?: string | null; partyGstin?: string | null;
  subtotal?: number; taxAmount?: number; amount?: number;
}

export interface Item {
  id: string; companyId: string; name: string; alias?: string | null;
  code?: string | null; hsnCode?: string | null; sacCode?: string | null;
  unitId?: string | null; stockGroupId?: string | null; category?: string | null;
  igstRate: number; cgstRate: number; sgstRate: number; cessRate: number;
  openingStock: number; openingRate: number; reorderLevel?: number | null;
  costPrice?: number | null; sellingPrice?: number | null;
  isBatchEnabled: boolean; isSerialEnabled: boolean; isActive: boolean;
  description?: string | null; createdAt: string;
  currentStock?: number;
}

export interface Employee {
  id: string; companyId: string; code?: string | null; name: string;
  designation?: string | null; department?: string | null;
  dateOfJoining?: string | null; dateOfLeaving?: string | null;
  pan?: string | null; aadhaar?: string | null; uan?: string | null; esicNo?: string | null;
  bankAccount?: string | null; bankIfsc?: string | null; bankName?: string | null;
  basicSalary: number; hra: number; conveyance: number; special: number;
  pfApplicable: boolean; esiApplicable: boolean; isActive: boolean; createdAt: string;
}

export interface PayrollEntry {
  id: string; employeeId: string; companyId: string; month: number; year: number;
  workingDays: number; presentDays: number; basic: number; hra: number;
  conveyance: number; special: number; otherEarnings: number; grossSalary: number;
  pfEmployee: number; esiEmployee: number; tds: number; otherDeductions: number;
  netSalary: number; pfEmployer: number; esiEmployer: number;
  isPaid: boolean; paidOn?: string | null; createdAt: string; employee?: Employee;
}

export interface RightButton {
  key: string; label: string; action?: () => void; separator?: boolean; section?: string;
}

export interface GoToItem {
  label: string; path: string; category: string; key?: string;
}

export interface DashboardData {
  cashBalance: number; bankBalance: number;
  todayVouchers: Record<string, number>;
  topReceivables: Array<{ ledgerName: string; amount: number }>;
  topPayables: Array<{ ledgerName: string; amount: number }>;
  gstLiability: number;
  monthlyRevenue: Array<{ month: string; revenue: number; expense: number }>;
  stockAlerts: Array<{ itemName: string; currentStock: number; reorderLevel: number }>;
  tdsDue: number;
  recentVouchers: Array<{ id: string; date: string; type: VoucherType; number: string; amount: number; partyName?: string | null }>;
}
