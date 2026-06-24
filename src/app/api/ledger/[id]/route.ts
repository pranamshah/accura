import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ledger = await prisma.ledger.findUnique({
    where: { id },
    include: { group: true, tdsSection: true },
  });

  if (!ledger) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get voucher entries for this ledger (for statement)
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const includeStatement = searchParams.get("statement") === "true";

  if (includeStatement) {
    const entries = await prisma.voucherEntry.findMany({
      where: {
        ledgerId: id,
        voucher: {
          status: "ACTIVE",
          ...(from || to
            ? {
                date: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
      },
      include: { voucher: true },
      orderBy: { voucher: { date: "asc" } },
    });

    return NextResponse.json({ ledger, entries });
  }

  return NextResponse.json({ ledger });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const old = await prisma.ledger.findUnique({ where: { id } });

  const ledger = await prisma.ledger.update({
    where: { id },
    data: body,
    include: { group: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: ledger.companyId,
      action: "UPDATE",
      entity: "Ledger",
      entityId: id,
      oldData: old as Record<string, unknown>,
      newData: body,
    },
  });

  return NextResponse.json({ ledger });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ledger = await prisma.ledger.findUnique({ where: { id } });
  if (!ledger) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ledger.isSystem) return NextResponse.json({ error: "Cannot delete system ledger" }, { status: 400 });

  await prisma.ledger.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
