import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const sectionSchema = z.object({
  companyId: z.string(),
  section: z.string().min(1),
  description: z.string().optional(),
  rate: z.number(),
  thresholdLimit: z.number().default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const sections = await prisma.tDSSection.findMany({
    where: { companyId },
    orderBy: { section: "asc" },
  });

  return NextResponse.json({ sections });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = sectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const section = await prisma.tDSSection.create({ data: parsed.data });
  return NextResponse.json({ section }, { status: 201 });
}
