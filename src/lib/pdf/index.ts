import type { Voucher, TrialBalanceRow, ProfitLossData, BalanceSheetData, PayrollEntry } from "@/types";
import { formatCurrency, numberToWords, formatDate } from "@/lib/utils";

type jsPDFType = {
  text: (text: string, x: number, y: number, options?: Record<string, unknown>) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  setFont: (font: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  addPage: () => void;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  save: (filename: string) => void;
  output: (type: string) => string;
};

type AutoTableType = (doc: jsPDFType, options: Record<string, unknown>) => void;

async function loadPDF() {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  return { jsPDF, autoTable: autoTable as unknown as AutoTableType };
}

export async function generateInvoicePDF(
  voucher: Voucher,
  company: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    gstin?: string;
    phone?: string;
    email?: string;
  }
): Promise<string> {
  const { jsPDF, autoTable } = await loadPDF();
  const doc = new jsPDF() as unknown as jsPDFType;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 74, 198);
  doc.text(company.name, pageWidth / 2, 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (company.address) doc.text(company.address, pageWidth / 2, 27, { align: "center" });
  if (company.gstin) doc.text(`GSTIN: ${company.gstin}`, pageWidth / 2, 33, { align: "center" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("TAX INVOICE", pageWidth / 2, 45, { align: "center" });

  // Invoice details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice No: ${voucher.number}`, 15, 55);
  doc.text(`Date: ${formatDate(voucher.date)}`, pageWidth - 15, 55, { align: "right" });

  // Party details from entries
  const partyEntry = voucher.entries?.find((e) => e.type === "DEBIT");
  if (partyEntry?.ledger) {
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 15, 65);
    doc.setFont("helvetica", "normal");
    doc.text(partyEntry.ledger.name, 15, 72);
    if (partyEntry.ledger.address) doc.text(partyEntry.ledger.address, 15, 78);
    if (partyEntry.ledger.gstin) doc.text(`GSTIN: ${partyEntry.ledger.gstin}`, 15, 84);
  }

  // Items table
  const tableData =
    voucher.inventoryLines?.map((line) => [
      line.item?.name || "",
      line.item?.hsnCode || "",
      String(line.quantity),
      line.item?.unit?.symbol || "NOS",
      formatCurrency(line.rate),
      `${line.discount}%`,
      formatCurrency(line.amount),
    ]) || [];

  autoTable(doc, {
    startY: 95,
    head: [["Description", "HSN/SAC", "Qty", "Unit", "Rate", "Disc%", "Amount"]],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 74, 198], textColor: [255, 255, 255] },
  });

  const finalY = 200;

  // GST summary
  if (voucher.gstLines && voucher.gstLines.length > 0) {
    const totalTaxable = voucher.gstLines.reduce((s, l) => s + l.taxableValue, 0);
    const totalCGST = voucher.gstLines.reduce((s, l) => s + l.cgstAmount, 0);
    const totalSGST = voucher.gstLines.reduce((s, l) => s + l.sgstAmount, 0);
    const totalIGST = voucher.gstLines.reduce((s, l) => s + l.igstAmount, 0);

    doc.setFontSize(9);
    doc.text(`Taxable Amount: ${formatCurrency(totalTaxable)}`, pageWidth - 15, finalY + 5, { align: "right" });
    if (totalCGST > 0) {
      doc.text(`CGST: ${formatCurrency(totalCGST)}`, pageWidth - 15, finalY + 12, { align: "right" });
      doc.text(`SGST: ${formatCurrency(totalSGST)}`, pageWidth - 15, finalY + 19, { align: "right" });
    }
    if (totalIGST > 0) {
      doc.text(`IGST: ${formatCurrency(totalIGST)}`, pageWidth - 15, finalY + 12, { align: "right" });
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total: ${formatCurrency(voucher.totalAmount)}`, pageWidth - 15, finalY + 28, { align: "right" });

  // Amount in words
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(`Amount in Words: ${numberToWords(voucher.totalAmount)}`, 15, finalY + 35);

  if (voucher.narration) {
    doc.text(`Narration: ${voucher.narration}`, 15, finalY + 42);
  }

  return doc.output("datauristring");
}

export async function generateTrialBalancePDF(
  rows: TrialBalanceRow[],
  company: { name: string },
  period: string
): Promise<string> {
  const { jsPDF, autoTable } = await loadPDF();
  const doc = new jsPDF() as unknown as jsPDFType;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(company.name, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("Trial Balance", pageWidth / 2, 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(period, pageWidth / 2, 35, { align: "center" });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  autoTable(doc, {
    startY: 45,
    head: [["Ledger Name", "Group", "Debit (₹)", "Credit (₹)"]],
    body: rows.map((r) => [
      r.ledgerName,
      r.groupName,
      r.debit > 0 ? formatCurrency(r.debit) : "",
      r.credit > 0 ? formatCurrency(r.credit) : "",
    ]),
    foot: [["Total", "", formatCurrency(totalDebit), formatCurrency(totalCredit)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 74, 198], textColor: [255, 255, 255] },
    footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  return doc.output("datauristring");
}

export async function generateBalanceSheetPDF(
  data: BalanceSheetData,
  company: { name: string },
  period: string
): Promise<string> {
  const { jsPDF, autoTable } = await loadPDF();
  const doc = new jsPDF() as unknown as jsPDFType;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(company.name, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("Balance Sheet", pageWidth / 2, 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(period, pageWidth / 2, 35, { align: "center" });

  const liabRows = data.liabilities.map((l) => [l.name, formatCurrency(l.amount)]);
  const assetRows = data.assets.map((a) => [a.name, formatCurrency(a.amount)]);

  const combined = [
    ["LIABILITIES", ""],
    ...liabRows,
    ["Total Liabilities", formatCurrency(data.totalLiabilities)],
    ["", ""],
    ["ASSETS", ""],
    ...assetRows,
    ["Total Assets", formatCurrency(data.totalAssets)],
  ];

  autoTable(doc, {
    startY: 45,
    head: [["Particulars", "Amount (₹)"]],
    body: combined,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 74, 198], textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data: { cell: { text: string[]; styles: { fontStyle: string } } }) => {
      if (["LIABILITIES", "ASSETS", "Total Liabilities", "Total Assets"].includes(data.cell.text[0])) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  return doc.output("datauristring");
}

export async function generatePLPDF(
  data: ProfitLossData,
  company: { name: string },
  period: string
): Promise<string> {
  const { jsPDF, autoTable } = await loadPDF();
  const doc = new jsPDF() as unknown as jsPDFType;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(company.name, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("Profit & Loss Account", pageWidth / 2, 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(period, pageWidth / 2, 35, { align: "center" });

  const rows: string[][] = [];
  rows.push(["INCOME", ""]);
  data.income.forEach((i) => rows.push([i.name, formatCurrency(i.amount)]));
  rows.push(["Total Income", formatCurrency(data.totalIncome)]);
  rows.push(["", ""]);
  rows.push(["EXPENSES", ""]);
  data.expenses.forEach((e) => rows.push([e.name, formatCurrency(e.amount)]));
  rows.push(["Total Expenses", formatCurrency(data.totalExpenses)]);
  rows.push(["", ""]);
  rows.push([data.netProfit >= 0 ? "NET PROFIT" : "NET LOSS", formatCurrency(Math.abs(data.netProfit))]);

  autoTable(doc, {
    startY: 45,
    head: [["Particulars", "Amount (₹)"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 74, 198], textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: "right" } },
  });

  return doc.output("datauristring");
}

export async function generateSalarySlipPDF(
  entry: PayrollEntry,
  company: { name: string; address?: string }
): Promise<string> {
  const { jsPDF, autoTable } = await loadPDF();
  const doc = new jsPDF() as unknown as jsPDFType;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(company.name, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("SALARY SLIP", pageWidth / 2, 28, { align: "center" });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`For the month of: ${months[entry.month - 1]} ${entry.year}`, 15, 40);

  if (entry.employee) {
    doc.text(`Employee: ${entry.employee.name}`, 15, 47);
    if (entry.employee.designation) doc.text(`Designation: ${entry.employee.designation}`, 15, 54);
    if (entry.employee.code) doc.text(`Employee Code: ${entry.employee.code}`, pageWidth - 15, 47, { align: "right" });
  }

  const earningsData = [
    ["Basic Salary", formatCurrency(entry.basic)],
    ["HRA", formatCurrency(entry.hra)],
    ["Conveyance", formatCurrency(entry.conveyance)],
    ["Special Allowance", formatCurrency(entry.special)],
    ["Other Earnings", formatCurrency(entry.otherEarnings)],
  ];

  const deductionsData = [
    ["PF (Employee)", formatCurrency(entry.pfEmployee)],
    ["ESI (Employee)", formatCurrency(entry.esiEmployee)],
    ["TDS", formatCurrency(entry.tds)],
    ["Other Deductions", formatCurrency(entry.otherDeductions)],
  ];

  autoTable(doc, {
    startY: 62,
    head: [["Earnings", "Amount", "Deductions", "Amount"]],
    body: earningsData.map((e, i) => [
      e[0],
      e[1],
      deductionsData[i]?.[0] || "",
      deductionsData[i]?.[1] || "",
    ]),
    foot: [
      ["Gross Salary", formatCurrency(entry.grossSalary), "Total Deductions", formatCurrency(entry.pfEmployee + entry.esiEmployee + entry.tds + entry.otherDeductions)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 74, 198], textColor: [255, 255, 255] },
    footStyles: { fontStyle: "bold", fillColor: [240, 240, 240] },
  });

  const finalY = 160;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Net Salary: ${formatCurrency(entry.netSalary)}`, pageWidth / 2, finalY, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(numberToWords(entry.netSalary), 15, finalY + 8);

  return doc.output("datauristring");
}
