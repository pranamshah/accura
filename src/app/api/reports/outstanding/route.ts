import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const type = searchParams.get("type") || "receivable"; // receivable | payable
  const asOf = searchParams.get("asOf");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const groupName = type === "receivable" ? "Sundry Debtors" : "Sundry Creditors";

  const ledgers = await prisma.ledger.findMany({
    where: { companyId, group: { name: groupName }, isActive: true },
  });

  const dateFilter = asOf ? { lte: new Date(asOf) } : undefined;

  const results = await Promise.all(
    ledgers.map(async (ledger) => {
      const dr = await prisma.voucherEntry.aggregate({
        where: {
          ledgerId: ledger.id,
          type: "DEBIT",
          voucher: { companyId, status: "ACTIVE", ...(dateFilter ? { date: dateFilter } : {}) },
        },
        _sum: { amount: true },
      });
      const cr = await prisma.voucherEntry.aggregate({
        where: {
          ledgerId: ledger.id,
          type: "CREDIT",
          voucher: { companyId, status: "ACTIVE", ...(dateFilter ? { date: dateFilter } : {}) },
        },
        _sum: { amount: true },
      });

      const drTotal = (dr._sum.amount || 0) + (ledger.openingBalanceType === "DEBIT" ? ledger.openingBalance : 0);
      const crTotal = (cr._sum.amount || 0) + (ledger.openingBalanceType === "CREDIT" ? ledger.openingBalance : 0);
      const balance = drTotal - crTotal;

      return {
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        gstin: ledger.gstin,
        phone: ledger.mobileNo,
        balance: type === "receivable" ? balance : -balance,
        creditDays: ledger.creditDays,
        creditLimit: ledger.creditLimit,
      };
    })
  );

  const filtered = results.filter((r) => r.balance > 0.01);

  return NextResponse.json({
    type,
    outstanding: filtered.sort((a, b) => b.balance - a.balance),
    total: filtered.reduce((s, r) => s + r.balance, 0),
  });
}
