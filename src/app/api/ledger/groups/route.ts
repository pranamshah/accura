import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const groupSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  alias: z.string().optional(),
  parentId: z.string().optional(),
  nature: z.enum(["ASSETS", "LIABILITIES", "INCOME", "EXPENSES"]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const groups = await prisma.ledgerGroup.findMany({
    where: { companyId },
    include: {
      children: {
        include: {
          children: true,
          ledgers: { select: { id: true, name: true } },
        },
      },
      ledgers: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  // Return flat and tree versions
  const rootGroups = groups.filter((g) => !g.parentId);

  return NextResponse.json({ groups, rootGroups });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const group = await prisma.ledgerGroup.create({ data: parsed.data });
  return NextResponse.json({ group }, { status: 201 });
}
