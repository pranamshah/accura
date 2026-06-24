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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "100");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const where = {
    companyId,
    status: "ACTIVE" as const,
    ...(from || to ? {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  };

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: {
        entries: { include: { ledger: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.voucher.count({ where }),
  ]);

  return NextResponse.json({ vouchers, total });
}
