import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { exportTrialBalance, exportGSTR1, exportStockSummary, exportDayBook } from "@/lib/excel";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const companyId = searchParams.get("companyId");
  const from = searchParams.get("from") || new Date(new Date().getFullYear(), 3, 1).toISOString();
  const to = searchParams.get("to") || new Date().toISOString();

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  let buffer: Buffer;
  let filename: string;

  if (type === "trial-balance") {
    const ledgers = await prisma.ledger.findMany({
      where: { companyId, isActive: true },
      include: { group: true },
    });

    const rows = await Promise.all(
      ledgers.map(async (l) => {
        const dr = await prisma.voucherEntry.aggregate({
          where: { ledgerId: l.id, type: "DEBIT", voucher: { companyId, status: "ACTIVE" } },
          _sum: { amount: true },
        });
        const cr = await prisma.voucherEntry.aggregate({
          where: { ledgerId: l.id, type: "CREDIT", voucher: { companyId, status: "ACTIVE" } },
          _sum: { amount: true },
        });
        const drTotal = (dr._sum.amount || 0) + (l.openingBalanceType === "DEBIT" ? l.openingBalance : 0);
        const crTotal = (cr._sum.amount || 0) + (l.openingBalanceType === "CREDIT" ? l.openingBalance : 0);
        return {
          ledgerName: l.name,
          groupName: l.group.name,
          nature: l.group.nature as "ASSETS" | "LIABILITIES" | "INCOME" | "EXPENSES",
          debit: Math.max(0, drTotal - crTotal),
          credit: Math.max(0, crTotal - drTotal),
        };
      })
    );

    buffer = await exportTrialBalance(rows.filter(r => r.debit > 0 || r.credit > 0), { name: company.name }, `${new Date(from).toLocaleDateString("en-IN")} to ${new Date(to).toLocaleDateString("en-IN")}`);
    filename = "trial-balance.xlsx";
  } else if (type === "gstr1") {
    const month = searchParams.get("month") || String(new Date().getMonth() + 1);
    const year = searchParams.get("year") || String(new Date().getFullYear());

    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId,
        type: "SALES",
        status: "ACTIVE",
        date: {
          gte: new Date(parseInt(year), parseInt(month) - 1, 1),
          lte: new Date(parseInt(year), parseInt(month), 0),
        },
      },
      include: { entries: { include: { ledger: true } }, gstLines: true },
    });

    buffer = await exportGSTR1(vouchers as Parameters<typeof exportGSTR1>[0], { name: company.name, gstin: company.gstin || undefined }, `${month}/${year}`);
    filename = `gstr1-${month}-${year}.xlsx`;
  } else if (type === "stock") {
    const items = await prisma.item.findMany({
      where: { companyId, isActive: true },
      include: { unit: true },
    });

    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        const sold = await prisma.inventoryLine.aggregate({
          where: { itemId: item.id, voucher: { type: "SALES", status: "ACTIVE" } },
          _sum: { quantity: true },
        });
        const purchased = await prisma.inventoryLine.aggregate({
          where: { itemId: item.id, voucher: { type: "PURCHASE", status: "ACTIVE" } },
          _sum: { quantity: true },
        });
        return {
          ...item,
          currentStock: item.openingStock + (purchased._sum.quantity || 0) - (sold._sum.quantity || 0),
        };
      })
    );

    buffer = await exportStockSummary(itemsWithStock as Parameters<typeof exportStockSummary>[0], { name: company.name });
    filename = "stock-summary.xlsx";
  } else if (type === "daybook") {
    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        date: { gte: new Date(from), lte: new Date(to) },
      },
      include: { entries: { include: { ledger: true } } },
      orderBy: { date: "asc" },
    });

    buffer = await exportDayBook(vouchers as Parameters<typeof exportDayBook>[0], { name: company.name }, { from: new Date(from).toLocaleDateString("en-IN"), to: new Date(to).toLocaleDateString("en-IN") });
    filename = "daybook.xlsx";
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
