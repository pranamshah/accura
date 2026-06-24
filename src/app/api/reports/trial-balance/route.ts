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

  const ledgers = await prisma.ledger.findMany({
    where: { companyId, isActive: true },
    include: { group: true },
  });

  const rows = await Promise.all(
    ledgers.map(async (ledger) => {
      const drEntries = await prisma.voucherEntry.aggregate({
        where: {
          ledgerId: ledger.id,
          type: "DEBIT",
          voucher: {
            companyId,
            status: "ACTIVE",
            ...(from || to ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            } : {}),
          },
        },
        _sum: { amount: true },
      });

      const crEntries = await prisma.voucherEntry.aggregate({
        where: {
          ledgerId: ledger.id,
          type: "CREDIT",
          voucher: {
            companyId,
            status: "ACTIVE",
            ...(from || to ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            } : {}),
          },
        },
        _sum: { amount: true },
      });

      const drTotal = (drEntries._sum.amount || 0) + (ledger.openingBalanceType === "DEBIT" ? ledger.openingBalance : 0);
      const crTotal = (crEntries._sum.amount || 0) + (ledger.openingBalanceType === "CREDIT" ? ledger.openingBalance : 0);

      const netDr = Math.max(0, drTotal - crTotal);
      const netCr = Math.max(0, crTotal - drTotal);

      return {
        ledgerName: ledger.name,
        groupName: ledger.group.name,
        nature: ledger.group.nature,
        debit: netDr,
        credit: netCr,
      };
    })
  );

  const filtered = rows.filter((r) => r.debit > 0 || r.credit > 0);

  return NextResponse.json({
    rows: filtered,
    totalDebit: filtered.reduce((s, r) => s + r.debit, 0),
    totalCredit: filtered.reduce((s, r) => s + r.credit, 0),
  });
}
