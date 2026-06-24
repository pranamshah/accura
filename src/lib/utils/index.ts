import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FinancialYear, GSTCalcResult, VoucherType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Indian currency format: ₹1,23,456.00
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return `₹${formatted}`;
}

// Compact format: ₹1.23L or ₹1.23Cr
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(2)}K`;
  return `${sign}₹${abs.toFixed(2)}`;
}

// Number to words (Indian): "One Lakh Twenty Three Thousand Rupees Only"
export function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertHundreds(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
    return ones[Math.floor(n / 100)] + " Hundred " + convertHundreds(n % 100);
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  let result = "";
  let remaining = intPart;

  if (remaining >= 10000000) {
    result += convertHundreds(Math.floor(remaining / 10000000)) + "Crore ";
    remaining %= 10000000;
  }
  if (remaining >= 100000) {
    result += convertHundreds(Math.floor(remaining / 100000)) + "Lakh ";
    remaining %= 100000;
  }
  if (remaining >= 1000) {
    result += convertHundreds(Math.floor(remaining / 1000)) + "Thousand ";
    remaining %= 1000;
  }
  if (remaining > 0) {
    result += convertHundreds(remaining);
  }

  result = result.trim() + " Rupees";
  if (decPart > 0) result += " and " + convertHundreds(decPart).trim() + " Paise";
  return result + " Only";
}

// Financial year calculation
export function getFinancialYear(date?: Date, startMonth = 4): FinancialYear {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  let fyStartYear: number;
  if (month >= startMonth) {
    fyStartYear = year;
  } else {
    fyStartYear = year - 1;
  }

  const start = new Date(fyStartYear, startMonth - 1, 1);
  const end = new Date(fyStartYear + 1, startMonth - 1, 0, 23, 59, 59);
  const label = `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;

  return { start, end, label };
}

// GSTIN validation
export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(gstin)) return false;

  // Checksum validation
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let factor = 2;
  let sum = 0;
  const codePoint = gstin.length;

  for (let i = codePoint - 2; i >= 0; i--) {
    let addend = factor * chars.indexOf(gstin[i]);
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  return chars[checkCodePoint] === gstin[codePoint - 1];
}

// PAN validation
export function validatePAN(pan: string): boolean {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

// State name from GSTIN first 2 digits
export function getStateFromGSTIN(gstin: string): string {
  const stateMap: Record<string, string> = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa",
    "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman & Nicobar Islands",
    "36": "Telangana", "37": "Andhra Pradesh",
    "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction",
  };
  const code = gstin.substring(0, 2);
  return stateMap[code] || "Unknown State";
}

// Auto voucher number
export function generateVoucherNumber(type: VoucherType, count: number, fy: string): string {
  const prefixes: Record<VoucherType, string> = {
    SALES: "SI",
    PURCHASE: "PI",
    PAYMENT: "PV",
    RECEIPT: "RV",
    JOURNAL: "JV",
    CONTRA: "CV",
    DEBIT_NOTE: "DN",
    CREDIT_NOTE: "CN",
    SALES_ORDER: "SO",
    PURCHASE_ORDER: "PO",
    DELIVERY_NOTE: "DN",
    GOODS_RECEIPT: "GR",
    OPENING_BALANCE: "OB",
    PAYROLL: "PR",
  };
  const prefix = prefixes[type] || "VR";
  const num = String(count).padStart(4, "0");
  return `${prefix}/${fy}/${num}`;
}

// GST components
export function calculateGST(
  taxableValue: number,
  rate: number,
  isInterState: boolean
): GSTCalcResult {
  const totalTax = (taxableValue * rate) / 100;
  if (isInterState) {
    return { igst: totalTax, cgst: 0, sgst: 0, cess: 0, total: totalTax };
  }
  const half = totalTax / 2;
  return { igst: 0, cgst: half, sgst: half, cess: 0, total: totalTax };
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Format date for input
export function formatDateInput(date: string | Date): string {
  return new Date(date).toISOString().split("T")[0];
}

// Get voucher type label
export function getVoucherLabel(type: VoucherType): string {
  const labels: Record<VoucherType, string> = {
    SALES: "Sales Invoice",
    PURCHASE: "Purchase Invoice",
    PAYMENT: "Payment",
    RECEIPT: "Receipt",
    JOURNAL: "Journal",
    CONTRA: "Contra",
    DEBIT_NOTE: "Debit Note",
    CREDIT_NOTE: "Credit Note",
    SALES_ORDER: "Sales Order",
    PURCHASE_ORDER: "Purchase Order",
    DELIVERY_NOTE: "Delivery Note",
    GOODS_RECEIPT: "Goods Receipt",
    OPENING_BALANCE: "Opening Balance",
    PAYROLL: "Payroll",
  };
  return labels[type] || type;
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Indian number format
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Get month name
export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1] || "";
}

// Check if two state codes are same (for IGST vs CGST/SGST)
export function isInterState(companyStateCode: string | null | undefined, partyStateCode: string | null | undefined): boolean {
  if (!companyStateCode || !partyStateCode) return false;
  return companyStateCode !== partyStateCode;
}

export const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];
