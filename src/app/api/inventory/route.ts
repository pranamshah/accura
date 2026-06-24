import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const itemSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  alias: z.string().optional(),
  code: z.string().optional(),
  hsnCode: z.string().optional(),
  sacCode: z.string().optional(),
  unitId: z.string().optional(),
  category: z.string().optional(),
  igstRate: z.number().default(0),
  cgstRate: z.number().default(0),
  sgstRate: z.number().default(0),
  cessRate: z.number().default(0),
  openingStock: z.number().default(0),
  openingRate: z.number().default(0),
  reorderLevel: z.number().optional(),
  maxStock: z.number().optional(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const search = searchParams.get("search") || "";

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const items = await prisma.item.findMany({
    where: {
      companyId,
      isActive: true,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { unit: true },
    orderBy: { name: "asc" },
  });

  // Calculate current stock for each item
  const itemsWithStock = await Promise.all(
    items.map(async (item) => {
      const soldQty = await prisma.inventoryLine.aggregate({
        where: { itemId: item.id, voucher: { type: "SALES", status: "ACTIVE" } },
        _sum: { quantity: true },
      });
      const purchasedQty = await prisma.inventoryLine.aggregate({
        where: { itemId: item.id, voucher: { type: "PURCHASE", status: "ACTIVE" } },
        _sum: { quantity: true },
      });
      return {
        ...item,
        currentStock: item.openingStock + (purchasedQty._sum.quantity || 0) - (soldQty._sum.quantity || 0),
      };
    })
  );

  return NextResponse.json({ items: itemsWithStock, total: items.length });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.item.create({
    data: parsed.data,
    include: { unit: true },
  });

  return NextResponse.json({ item }, { status: 201 });
}
