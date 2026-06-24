import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { generateVoucherNumber } from "@/lib/utils";
import { getFinancialYear } from "@/lib/utils";

const entrySchema = z.object({
  ledgerId: z.string(),
  type: z.enum(["DEBIT", "CREDIT"]),
  amount: z.number(),
  narration: z.string().optional(),
  billRef: z.string().optional(),
  billDate: z.string().optional(),
});

const gstLineSchema = z.object({
  hsnCode: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  rate: z.number().optional(),
  taxableValue: z.number(),
  igstRate: z.number().default(0),
  cgstRate: z.number().default(0),
  sgstRate: z.number().default(0),
  cessRate: z.number().default(0),
  igstAmount: z.number().default(0),
  cgstAmount: z.number().default(0),
  sgstAmount: z.number().default(0),
  cessAmount: z.number().default(0),
  totalTax: z.number().default(0),
});

const inventoryLineSchema = z.object({
  itemId: z.string(),
  godownId: z.string().optional(),
  batchNo: z.string().optional(),
  serialNo: z.string().optional(),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
  discount: z.number().default(0),
});

const voucherSchema = z.object({
  companyId: z.string(),
  type: z.enum([
    "SALES", "PURCHASE", "PAYMENT", "RECEIPT", "JOURNAL", "CONTRA",
    "DEBIT_NOTE", "CREDIT_NOTE", "SALES_ORDER", "PURCHASE_ORDER",
    "DELIVERY_NOTE", "GOODS_RECEIPT", "OPENING_BALANCE", "PAYROLL",
  ]),
  date: z.string(),
  narration: z.string().optional(),
  reference: z.string().optional(),
  status: z.enum(["ACTIVE", "CANCELLED", "DRAFT"]).default("ACTIVE"),
  gstApplicable: z.boolean().default(false),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().default(false),
  costCentreId: z.string().optional(),
  aiGenerated: z.boolean().default(false),
  entries: z.array(entrySchema).min(2),
  gstLines: z.array(gstLineSchema).optional(),
  inventoryLines: z.array(inventoryLineSchema).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const where = {
    companyId,
    ...(type ? { type: type as "SALES" } : {}),
    ...(status ? { status: status as "ACTIVE" } : {}),
    ...(from || to ? {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
    ...(search ? { narration: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: {
        entries: { include: { ledger: true } },
        gstLines: true,
        inventoryLines: { include: { item: { include: { unit: true } } } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.voucher.count({ where }),
  ]);

  return NextResponse.json({ vouchers, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = voucherSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  // Validate Dr = Cr
  const totalDr = data.entries.filter((e) => e.type === "DEBIT").reduce((s, e) => s + e.amount, 0);
  const totalCr = data.entries.filter((e) => e.type === "CREDIT").reduce((s, e) => s + e.amount, 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    return NextResponse.json({ error: "Debit and Credit must be equal" }, { status: 400 });
  }

  // Generate voucher number
  const count = await prisma.voucher.count({
    where: { companyId: data.companyId, type: data.type },
  });

  const fy = getFinancialYear(new Date(data.date));
  const number = generateVoucherNumber(data.type, count + 1, fy.label);

  const voucher = await prisma.voucher.create({
    data: {
      companyId: data.companyId,
      type: data.type,
      number,
      date: new Date(data.date),
      narration: data.narration,
      reference: data.reference,
      totalAmount: totalDr,
      status: data.status,
      gstApplicable: data.gstApplicable,
      placeOfSupply: data.placeOfSupply,
      reverseCharge: data.reverseCharge,
      costCentreId: data.costCentreId,
      aiGenerated: data.aiGenerated,
      entries: {
        create: data.entries.map((e) => ({
          ledgerId: e.ledgerId,
          type: e.type,
          amount: e.amount,
          narration: e.narration,
          billRef: e.billRef,
          billDate: e.billDate ? new Date(e.billDate) : undefined,
        })),
      },
      ...(data.gstLines?.length
        ? { gstLines: { create: data.gstLines } }
        : {}),
      ...(data.inventoryLines?.length
        ? { inventoryLines: { create: data.inventoryLines } }
        : {}),
    },
    include: {
      entries: { include: { ledger: true } },
      gstLines: true,
      inventoryLines: { include: { item: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: data.companyId,
      action: "CREATE",
      entity: "Voucher",
      entityId: voucher.id,
      newData: { type: data.type, number, amount: totalDr },
    },
  });

  return NextResponse.json({ voucher }, { status: 201 });
}
