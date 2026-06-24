import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    bankAccountId: string;
    transactions: Array<{
      date: string;
      description: string;
      amount: number;
      type: "DEBIT" | "CREDIT";
    }>;
  };
  const { bankAccountId, transactions } = body;

  if (!bankAccountId || !transactions) {
    return NextResponse.json({ error: "bankAccountId and transactions required" }, { status: 400 });
  }

  const created = await prisma.bankReconciliation.createMany({
    data: transactions.map((t) => ({
      bankAccountId,
      date: new Date(t.date),
      description: t.description,
      amount: t.amount,
      type: t.type,
      isReconciled: false,
    })),
  });

  return NextResponse.json({ created: created.count });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id: string; isReconciled: boolean; voucherId?: string };
  const { id, isReconciled, voucherId } = body;

  const entry = await prisma.bankReconciliation.update({
    where: { id },
    data: {
      isReconciled,
      reconciledDate: isReconciled ? new Date() : null,
      voucherId,
    },
  });

  return NextResponse.json({ entry });
}
