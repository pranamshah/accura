import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const asOf = searchParams.get("asOf");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const dateFilter = asOf ? { lte: new Date(asOf) } : undefined;

  async function getLedgerBalance(ledgerId: string, openingBalance: number, openingType: string) {
    const dr = await prisma.voucherEntry.aggregate({
      where: {
        ledgerId,
        type: "DEBIT",
        voucher: { companyId, status: "ACTIVE", ...(dateFilter ? { date: dateFilter } : {}) },
      },
      _sum: { amount: true },
    });
    const cr = await prisma.voucherEntry.aggregate({
      where: {
        ledgerId,
        type: "CREDIT",
        voucher: { companyId, status: "ACTIVE", ...(dateFilter ? { date: dateFilter } : {}) },
      },
      _sum: { amount: true },
    });

    const drTotal = (dr._sum.amount || 0) + (openingType === "DEBIT" ? openingBalance : 0);
    const crTotal = (cr._sum.amount || 0) + (openingType === "CREDIT" ? openingBalance : 0);
    return drTotal - crTotal;
  }

  // Get all ledger groups
  const groups = await prisma.ledgerGroup.findMany({
    where: { companyId, parentId: null },
    include: {
      ledgers: { where: { isActive: true } },
      children: {
        include: {
          ledgers: { where: { isActive: true } },
          children: {
            include: { ledgers: { where: { isActive: true } } },
          },
        },
      },
    },
  });

  const assets: Array<{ name: string; amount: number; children?: Array<{ name: string; amount: number }> }> = [];
  const liabilities: Array<{ name: string; amount: number; children?: Array<{ name: string; amount: number }> }> = [];

  for (const group of groups) {
    if (group.nature !== "ASSETS" && group.nature !== "LIABILITIES") continue;

    const groupData = {
      name: group.name,
      amount: 0,
      children: [] as Array<{ name: string; amount: number }>,
    };

    // Direct ledgers
    for (const ledger of group.ledgers) {
      const balance = await getLedgerBalance(ledger.id, ledger.openingBalance, ledger.openingBalanceType);
      if (balance !== 0) {
        groupData.children.push({ name: ledger.name, amount: Math.abs(balance) });
        groupData.amount += Math.abs(balance);
      }
    }

    // Child groups
    for (const child of group.children) {
      let childAmt = 0;
      for (const ledger of child.ledgers) {
        const balance = await getLedgerBalance(ledger.id, ledger.openingBalance, ledger.openingBalanceType);
        childAmt += Math.abs(balance);
      }
      if (childAmt > 0) {
        groupData.children.push({ name: child.name, amount: childAmt });
        groupData.amount += childAmt;
      }
    }

    if (groupData.amount > 0) {
      if (group.nature === "ASSETS") assets.push(groupData);
      else liabilities.push(groupData);
    }
  }

  return NextResponse.json({
    assets,
    liabilities,
    totalAssets: assets.reduce((s, a) => s + a.amount, 0),
    totalLiabilities: liabilities.reduce((s, l) => s + l.amount, 0),
  });
}
