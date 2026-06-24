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

  // Get all income ledgers
  const incomeGroups = await prisma.ledgerGroup.findMany({
    where: { companyId, nature: "INCOME" },
    include: {
      ledgers: {
        where: { isActive: true },
        include: { group: true },
      },
    },
  });

  // Get all expense ledgers
  const expenseGroups = await prisma.ledgerGroup.findMany({
    where: { companyId, nature: "EXPENSES" },
    include: {
      ledgers: {
        where: { isActive: true },
        include: { group: true },
      },
    },
  });

  async function getLedgerNetAmount(ledgerId: string, nature: "INCOME" | "EXPENSES") {
    const dr = await prisma.voucherEntry.aggregate({
      where: {
        ledgerId,
        type: "DEBIT",
        voucher: { companyId, status: "ACTIVE", ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
      },
      _sum: { amount: true },
    });
    const cr = await prisma.voucherEntry.aggregate({
      where: {
        ledgerId,
        type: "CREDIT",
        voucher: { companyId, status: "ACTIVE", ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
      },
      _sum: { amount: true },
    });

    const drAmt = dr._sum.amount || 0;
    const crAmt = cr._sum.amount || 0;

    // Income = Credit - Debit; Expenses = Debit - Credit
    if (nature === "INCOME") return crAmt - drAmt;
    return drAmt - crAmt;
  }

  const income: Array<{ name: string; amount: number }> = [];
  const expenses: Array<{ name: string; amount: number }> = [];

  for (const group of incomeGroups) {
    for (const ledger of group.ledgers) {
      const amount = await getLedgerNetAmount(ledger.id, "INCOME");
      if (amount !== 0) income.push({ name: ledger.name, amount });
    }
  }

  for (const group of expenseGroups) {
    for (const ledger of group.ledgers) {
      const amount = await getLedgerNetAmount(ledger.id, "EXPENSES");
      if (amount !== 0) expenses.push({ name: ledger.name, amount });
    }
  }

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalIncome - expenses.filter(e => ["Purchases", "Direct Expenses"].some(g => e.name.includes(g))).reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  return NextResponse.json({
    income,
    expenses,
    grossProfit,
    netProfit,
    totalIncome,
    totalExpenses,
  });
}
