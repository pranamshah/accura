import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const items = await prisma.item.findMany({
    where: { companyId, isActive: true },
    include: { unit: true },
  });

  const stock = await Promise.all(
    items.map(async (item) => {
      const sold = await prisma.inventoryLine.aggregate({
        where: { itemId: item.id, voucher: { type: "SALES", status: "ACTIVE", companyId } },
        _sum: { quantity: true, amount: true },
      });
      const purchased = await prisma.inventoryLine.aggregate({
        where: { itemId: item.id, voucher: { type: "PURCHASE", status: "ACTIVE", companyId } },
        _sum: { quantity: true, amount: true },
      });

      const currentQty = item.openingStock + (purchased._sum.quantity || 0) - (sold._sum.quantity || 0);
      const currentValue = (item.openingStock * item.openingRate) + (purchased._sum.amount || 0) - (sold._sum.amount || 0);

      return {
        id: item.id,
        name: item.name,
        code: item.code,
        hsnCode: item.hsnCode,
        category: item.category,
        unit: item.unit?.symbol,
        openingStock: item.openingStock,
        openingRate: item.openingRate,
        inQty: purchased._sum.quantity || 0,
        outQty: sold._sum.quantity || 0,
        currentQty,
        currentValue,
        avgRate: currentQty > 0 ? currentValue / currentQty : 0,
        reorderLevel: item.reorderLevel,
        isLow: item.reorderLevel !== null && currentQty <= item.reorderLevel,
      };
    })
  );

  return NextResponse.json({ stock, total: stock.length });
}
