import type { TrialBalanceRow, Voucher, Item } from "@/types";

async function getWorkbook() {
  const ExcelJS = await import("exceljs");
  return new ExcelJS.default.Workbook();
}

export async function exportTrialBalance(
  rows: TrialBalanceRow[],
  company: { name: string },
  period: string
): Promise<Buffer> {
  const workbook = await getWorkbook();
  const sheet = workbook.addWorksheet("Trial Balance");

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = company.name;
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.mergeCells("A2:D2");
  sheet.getCell("A2").value = `Trial Balance - ${period}`;
  sheet.getCell("A2").font = { bold: true, size: 12 };
  sheet.getCell("A2").alignment = { horizontal: "center" };

  sheet.addRow([]);

  const headerRow = sheet.addRow(["Ledger Name", "Group", "Debit (₹)", "Credit (₹)"]);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004AC6" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  rows.forEach((row, i) => {
    const dataRow = sheet.addRow([
      row.ledgerName,
      row.groupName,
      row.debit || "",
      row.credit || "",
    ]);
    if (i % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
    }
    dataRow.getCell(3).numFmt = '₹#,##0.00';
    dataRow.getCell(4).numFmt = '₹#,##0.00';
  });

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  const totalRow = sheet.addRow(["Total", "", totalDebit, totalCredit]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  });
  totalRow.getCell(3).numFmt = '₹#,##0.00';
  totalRow.getCell(4).numFmt = '₹#,##0.00';

  sheet.getColumn(1).width = 35;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 18;

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}

export async function exportGSTR1(
  vouchers: Voucher[],
  company: { name: string; gstin?: string },
  period: string
): Promise<Buffer> {
  const workbook = await getWorkbook();

  // B2B Sheet
  const b2bSheet = workbook.addWorksheet("B2B");
  const b2bHeader = b2bSheet.addRow([
    "GSTIN of Supplier", "Trade/Legal Name", "Invoice Number", "Invoice Date",
    "Invoice Value", "Place of Supply", "Reverse Charge", "Invoice Type",
    "Rate", "Taxable Value", "IGST", "CGST", "SGST", "CESS"
  ]);
  b2bHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004AC6" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  vouchers
    .filter((v) => v.type === "SALES")
    .forEach((v) => {
      const party = v.entries?.find((e) => e.type === "DEBIT")?.ledger;
      if (party?.gstin) {
        v.gstLines?.forEach((line) => {
          b2bSheet.addRow([
            company.gstin || "",
            company.name,
            v.number,
            new Date(v.date).toLocaleDateString("en-IN"),
            v.totalAmount,
            v.placeOfSupply || "33",
            v.reverseCharge ? "Y" : "N",
            "Regular",
            line.igstRate || (line.cgstRate + line.sgstRate) * 2,
            line.taxableValue,
            line.igstAmount,
            line.cgstAmount,
            line.sgstAmount,
            line.cessAmount,
          ]);
        });
      }
    });

  // B2C Sheet
  const b2cSheet = workbook.addWorksheet("B2C");
  const b2cHeader = b2cSheet.addRow([
    "Type", "Place of Supply", "Applicable % of Tax Rate",
    "Rate", "Taxable Value", "IGST", "CESS"
  ]);
  b2cHeader.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004AC6" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  vouchers
    .filter((v) => v.type === "SALES")
    .forEach((v) => {
      const party = v.entries?.find((e) => e.type === "DEBIT")?.ledger;
      if (!party?.gstin) {
        v.gstLines?.forEach((line) => {
          b2cSheet.addRow([
            "OE",
            v.placeOfSupply || "33",
            "",
            line.igstRate || (line.cgstRate + line.sgstRate) * 2,
            line.taxableValue,
            line.igstAmount,
            line.cessAmount,
          ]);
        });
      }
    });

  [b2bSheet, b2cSheet].forEach((sheet) => {
    sheet.columns.forEach((col) => {
      if (col.number) col.width = 18;
    });
  });

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}

export async function exportStockSummary(
  items: Item[],
  company: { name: string }
): Promise<Buffer> {
  const workbook = await getWorkbook();
  const sheet = workbook.addWorksheet("Stock Summary");

  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = `${company.name} - Stock Summary`;
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    "Item Name", "Code", "HSN Code", "Category", "Unit",
    "Opening Stock", "Current Stock", "Reorder Level", "Alert"
  ]);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004AC6" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  items.forEach((item, i) => {
    const currentStock = item.currentStock ?? item.openingStock;
    const isLow = item.reorderLevel !== null && item.reorderLevel !== undefined && currentStock <= item.reorderLevel;
    const row = sheet.addRow([
      item.name,
      item.code || "",
      item.hsnCode || "",
      item.category || "",
      item.unit?.symbol || "",
      item.openingStock,
      currentStock,
      item.reorderLevel || "",
      isLow ? "LOW STOCK" : "",
    ]);

    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
    }

    if (isLow) {
      row.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8E8" } };
      row.getCell(9).font = { color: { argb: "FFBA1A1A" }, bold: true };
    }
  });

  sheet.columns.forEach((col) => { if (col.number) col.width = 18; });

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}

export async function exportDayBook(
  vouchers: Voucher[],
  company: { name: string },
  dateRange: { from: string; to: string }
): Promise<Buffer> {
  const workbook = await getWorkbook();
  const sheet = workbook.addWorksheet("Day Book");

  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = `${company.name} - Day Book`;
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.mergeCells("A2:G2");
  sheet.getCell("A2").value = `From: ${dateRange.from} To: ${dateRange.to}`;
  sheet.getCell("A2").alignment = { horizontal: "center" };

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    "Date", "Voucher No", "Type", "Ledger", "Dr Amount", "Cr Amount", "Narration"
  ]);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF004AC6" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  let totalDr = 0;
  let totalCr = 0;

  vouchers.forEach((v, vi) => {
    v.entries?.forEach((entry, ei) => {
      const row = sheet.addRow([
        ei === 0 ? new Date(v.date).toLocaleDateString("en-IN") : "",
        ei === 0 ? v.number : "",
        ei === 0 ? v.type : "",
        entry.ledger?.name || entry.ledgerId,
        entry.type === "DEBIT" ? entry.amount : "",
        entry.type === "CREDIT" ? entry.amount : "",
        ei === 0 ? v.narration || "" : "",
      ]);

      if (entry.type === "DEBIT") totalDr += entry.amount;
      else totalCr += entry.amount;

      if (vi % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        });
      }
    });
  });

  const totalRow = sheet.addRow(["", "", "", "Total", totalDr, totalCr, ""]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  });
  totalRow.getCell(5).numFmt = '₹#,##0.00';
  totalRow.getCell(6).numFmt = '₹#,##0.00';

  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 30;
  sheet.getColumn(5).width = 15;
  sheet.getColumn(6).width = 15;
  sheet.getColumn(7).width = 30;

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
