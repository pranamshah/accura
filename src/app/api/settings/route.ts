import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const users = await prisma.companyUser.findMany({
    where: { companyId },
    include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
  });

  return NextResponse.json({ company, users });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const { companyId, ...data } = body as { companyId: string; [key: string]: unknown };
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const company = await prisma.company.update({
    where: { id: companyId },
    data: data as Parameters<typeof prisma.company.update>[0]["data"],
  });

  return NextResponse.json({ company });
}
