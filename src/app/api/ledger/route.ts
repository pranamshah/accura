import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const ledgerSchema = z.object({
  companyId: z.string(),
  groupId: z.string(),
  name: z.string().min(1),
  alias: z.string().optional(),
  openingBalance: z.number().default(0),
  openingBalanceType: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  mobileNo: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  creditLimit: z.number().optional(),
  creditDays: z.number().optional(),
  isParty: z.boolean().default(false),
  partyType: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]).optional(),
  gstType: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED", "CONSUMER", "OVERSEAS", "SEZ"]).optional(),
  tdsApplicable: z.boolean().default(false),
  tdsSectionId: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const search = searchParams.get("search") || "";
  const groupId = searchParams.get("groupId");
  const isParty = searchParams.get("isParty");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "100");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const where = {
    companyId,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(groupId ? { groupId } : {}),
    ...(isParty !== null ? { isParty: isParty === "true" } : {}),
    isActive: true,
  };

  const [ledgers, total] = await Promise.all([
    prisma.ledger.findMany({
      where,
      include: { group: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ledger.count({ where }),
  ]);

  return NextResponse.json({ ledgers, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = ledgerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ledger = await prisma.ledger.create({
    data: parsed.data,
    include: { group: true },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: parsed.data.companyId,
      action: "CREATE",
      entity: "Ledger",
      entityId: ledger.id,
      newData: parsed.data,
    },
  });

  return NextResponse.json({ ledger }, { status: 201 });
}
