import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { detectAnomalies } from "@/lib/ai";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const vouchers = await prisma.voucher.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      date: { gte: thirtyDaysAgo },
    },
    include: { entries: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  const anomalies = await detectAnomalies(vouchers as Parameters<typeof detectAnomalies>[0]);
  return NextResponse.json({ anomalies });
}
