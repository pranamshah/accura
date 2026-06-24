import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: {
      entries: { include: { ledger: { include: { group: true } } } },
      gstLines: true,
      inventoryLines: { include: { item: { include: { unit: true } }, godown: true } },
      tdsEntries: { include: { section: true } },
    },
  });

  if (!voucher) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ voucher });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const old = await prisma.voucher.findUnique({ where: { id } });
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update voucher (simple fields only for now)
  const { entries, gstLines, inventoryLines, ...voucherData } = body as {
    entries?: Array<{ id?: string; ledgerId: string; type: string; amount: number; narration?: string }>;
    gstLines?: Array<Record<string, unknown>>;
    inventoryLines?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  const voucher = await prisma.$transaction(async (tx) => {
    const updated = await tx.voucher.update({
      where: { id },
      data: {
        ...voucherData,
        date: voucherData.date ? new Date(voucherData.date as string) : undefined,
      } as Parameters<typeof tx.voucher.update>[0]["data"],
    });

    if (entries) {
      await tx.voucherEntry.deleteMany({ where: { voucherId: id } });
      await tx.voucherEntry.createMany({
        data: entries.map((e) => ({
          voucherId: id,
          ledgerId: e.ledgerId,
          type: e.type as "DEBIT" | "CREDIT",
          amount: e.amount,
          narration: e.narration,
        })),
      });
    }

    if (gstLines) {
      await tx.gSTLine.deleteMany({ where: { voucherId: id } });
      await tx.gSTLine.createMany({
        data: gstLines.map((l) => ({ ...l, voucherId: id })) as Parameters<typeof tx.gSTLine.createMany>[0]["data"],
      });
    }

    return updated;
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: old.companyId,
      action: "UPDATE",
      entity: "Voucher",
      entityId: id,
      oldData: old as Record<string, unknown>,
      newData: voucherData,
    },
  });

  return NextResponse.json({ voucher });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.voucher.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
