import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: { reconciliations: { orderBy: { date: "desc" } } },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ account });
}
