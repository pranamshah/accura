import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const dateFilter = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };

  // Receipts = Cash/Bank inflows
  const receipts = await prisma.voucher.findMany({
    where: {
      companyId,
      type: { in: ["RECEIPT", "CONTRA"] },
      status: "ACTIVE",
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    },
    include: { entries: { include: { ledger: { include: { group: true } } } } },
  });

  // Payments = Cash/Bank outflows
  const payments = await prisma.voucher.findMany({
    where: {
      companyId,
      type: { in: ["PAYMENT", "CONTRA"] },
      status: "ACTIVE",
      ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    },
    include: { entries: { include: { ledger: { include: { group: true } } } } },
  });

  const cashInflows = receipts.reduce((s, v) => s + v.totalAmount, 0);
  const cashOutflows = payments.reduce((s, v) => s + v.totalAmount, 0);

  // Opening cash balance
  const cashLedgers = await prisma.ledger.findMany({
    where: {
      companyId,
      group: { name: { in: ["Cash-in-Hand", "Bank Accounts"] } },
    },
  });
  const openingCash = cashLedgers.reduce((s, l) =>
    l.openingBalanceType === "DEBIT" ? s + l.openingBalance : s - l.openingBalance, 0
  );

  return NextResponse.json({
    openingBalance: openingCash,
    inflows: [
      { category: "Receipts from Customers", amount: cashInflows },
    ],
    outflows: [
      { category: "Payments to Suppliers", amount: cashOutflows },
    ],
    netCashFlow: cashInflows - cashOutflows,
    closingBalance: openingCash + cashInflows - cashOutflows,
  });
}
