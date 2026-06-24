import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const type = searchParams.get("type"); // CUSTOMER | SUPPLIER | BOTH
  const search = searchParams.get("search") || "";

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const parties = await prisma.ledger.findMany({
    where: {
      companyId,
      isParty: true,
      isActive: true,
      ...(type ? { partyType: type as "CUSTOMER" | "SUPPLIER" | "BOTH" } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { group: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ parties });
}
