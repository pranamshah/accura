import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const bankAccountSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  accountNo: z.string().min(1),
  bankName: z.string().min(1),
  ifsc: z.string().optional(),
  branch: z.string().optional(),
  openingBalance: z.number().default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const accounts = await prisma.bankAccount.findMany({
    where: { companyId },
    include: { reconciliations: { where: { isReconciled: false } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = bankAccountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const account = await prisma.bankAccount.create({ data: parsed.data });
  return NextResponse.json({ account }, { status: 201 });
}
