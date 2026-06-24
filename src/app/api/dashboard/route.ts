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

  // 1. Cash & Bank balances
  const cashLedgers = await prisma.ledger.findMany({
    where: {
      companyId,
      group: { name: { in: ["Cash-in-Hand", "Bank Accounts"] } },
      isActive: true,
    },
    include: { group: true },
  });

  async function getLedgerBalance(ledgerId: string, openingBalance: number, openingType: string) {
    const entries = await prisma.voucherEntry.aggregate({
      where: { ledgerId, voucher: { companyId, status: "ACTIVE" } },
      _sum: {
        amount: true,
      },
    });

    // Calculate from entries
    const drEntries = await prisma.voucherEntry.aggregate({
      where: { ledgerId, type: "DEBIT", voucher: { companyId, status: "ACTIVE" } },
      _sum: { amount: true },
    });
    const crEntries = await prisma.voucherEntry.aggregate({
      where: { ledgerId, type: "CREDIT", voucher: { companyId, status: "ACTIVE" } },
      _sum: { amount: true },
    });

    void entries;

    const drTotal = (drEntries._sum.amount || 0) + (openingType === "DEBIT" ? openingBalance : 0);
    const crTotal = (crEntries._sum.amount || 0) + (openingType === "CREDIT" ? openingBalance : 0);
    return drTotal - crTotal;
  }

  let cashBalance = 0;
  let bankBalance = 0;

  for (const l of cashLedgers) {
    const balance = await getLedgerBalance(l.id, l.openingBalance, l.openingBalanceType);
    if (l.group.name === "Cash-in-Hand") cashBalance += balance;
    else bankBalance += balance;
  }

  // 2. Today's vouchers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayVouchersRaw = await prisma.voucher.groupBy({
    by: ["type"],
    where: { companyId, date: { gte: today, lt: tomorrow }, status: "ACTIVE" },
    _count: true,
  });
  const todayVouchers: Record<string, number> = {};
  todayVouchersRaw.forEach((v) => { todayVouchers[v.type] = v._count; });

  // 3. Outstanding receivables
  const debtors = await prisma.ledger.findMany({
    where: { companyId, group: { name: "Sundry Debtors" }, isActive: true },
    take: 5,
  });

  const topReceivables = await Promise.all(
    debtors.map(async (l) => {
      const balance = await getLedgerBalance(l.id, l.openingBalance, l.openingBalanceType);
      return { ledgerName: l.name, amount: Math.max(0, balance) };
    })
  );

  // 4. Outstanding payables
  const creditors = await prisma.ledger.findMany({
    where: { companyId, group: { name: "Sundry Creditors" }, isActive: true },
    take: 5,
  });

  const topPayables = await Promise.all(
    creditors.map(async (l) => {
      const balance = await getLedgerBalance(l.id, l.openingBalance, l.openingBalanceType);
      return { ledgerName: l.name, amount: Math.abs(Math.min(0, balance)) };
    })
  );

  // 5. GST liability
  const gstOutputLedgers = await prisma.ledger.findMany({
    where: { companyId, name: { in: ["CGST Output", "SGST Output", "IGST Output"] } },
  });
  const gstInputLedgers = await prisma.ledger.findMany({
    where: { companyId, name: { in: ["CGST Input", "SGST Input", "IGST Input"] } },
  });

  let gstOutput = 0;
  let gstInput = 0;
  for (const l of gstOutputLedgers) {
    gstOutput += Math.abs(await getLedgerBalance(l.id, l.openingBalance, l.openingBalanceType));
  }
  for (const l of gstInputLedgers) {
    gstInput += Math.abs(await getLedgerBalance(l.id, l.openingBalance, l.openingBalanceType));
  }
  const gstLiability = Math.max(0, gstOutput - gstInput);

  // 6. Monthly revenue (last 6 months)
  const monthlyRevenue: Array<{ month: string; revenue: number; expense: number }> = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const sales = await prisma.voucher.aggregate({
      where: { companyId, type: "SALES", status: "ACTIVE", date: { gte: start, lte: end } },
      _sum: { totalAmount: true },
    });
    const purchases = await prisma.voucher.aggregate({
      where: { companyId, type: "PURCHASE", status: "ACTIVE", date: { gte: start, lte: end } },
      _sum: { totalAmount: true },
    });

    monthlyRevenue.push({
      month: `${months[d.getMonth()]} ${d.getFullYear()}`,
      revenue: sales._sum.totalAmount || 0,
      expense: purchases._sum.totalAmount || 0,
    });
  }

  // 7. Stock alerts
  const items = await prisma.item.findMany({
    where: { companyId, reorderLevel: { not: null }, isActive: true },
    take: 10,
  });

  const stockAlerts: Array<{ itemName: string; currentStock: number; reorderLevel: number }> = [];
  for (const item of items) {
    if (item.reorderLevel === null) continue;
    const soldQty = await prisma.inventoryLine.aggregate({
      where: { itemId: item.id, voucher: { type: "SALES", status: "ACTIVE" } },
      _sum: { quantity: true },
    });
    const purchasedQty = await prisma.inventoryLine.aggregate({
      where: { itemId: item.id, voucher: { type: "PURCHASE", status: "ACTIVE" } },
      _sum: { quantity: true },
    });
    const currentStock = item.openingStock + (purchasedQty._sum.quantity || 0) - (soldQty._sum.quantity || 0);
    if (currentStock <= item.reorderLevel) {
      stockAlerts.push({ itemName: item.name, currentStock, reorderLevel: item.reorderLevel });
    }
  }

  // 8. TDS due
  const tdsLedger = await prisma.ledger.findFirst({
    where: { companyId, name: "TDS Payable" },
  });
  let tdsDue = 0;
  if (tdsLedger) {
    tdsDue = Math.abs(await getLedgerBalance(tdsLedger.id, tdsLedger.openingBalance, tdsLedger.openingBalanceType));
  }

  // 9. Recent 10 transactions
  const recentVouchers = await prisma.voucher.findMany({
    where: { companyId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, date: true, type: true, number: true, totalAmount: true, narration: true },
  });

  void dateFilter;

  return NextResponse.json({
    cashBalance,
    bankBalance,
    todayVouchers,
    topReceivables: topReceivables.sort((a, b) => b.amount - a.amount).slice(0, 5),
    topPayables: topPayables.sort((a, b) => b.amount - a.amount).slice(0, 5),
    gstLiability,
    monthlyRevenue,
    stockAlerts,
    tdsDue,
    recentTransactions: recentVouchers,
    anomalies: [],
  });
}
