import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const entries = await prisma.tDSEntry.findMany({
    where: { voucher: { companyId } },
    include: { section: true, voucher: true },
    orderBy: { createdAt: "desc" },
  });

  const totalDue = entries
    .filter((e) => !e.deposited)
    .reduce((s, e) => s + e.tdsAmount, 0);

  return NextResponse.json({ entries, totalDue });
}
