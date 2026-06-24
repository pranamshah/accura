import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateGSTR3BData } from "@/lib/gst";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!companyId || !month || !year) {
    return NextResponse.json({ error: "companyId, month, year required" }, { status: 400 });
  }

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

  const vouchers = await prisma.voucher.findMany({
    where: {
      companyId,
      type: { in: ["SALES", "PURCHASE", "DEBIT_NOTE", "CREDIT_NOTE"] },
      status: "ACTIVE",
      date: { gte: startDate, lte: endDate },
    },
    include: { gstLines: true },
  });

  const gstr3bData = generateGSTR3BData(vouchers as Parameters<typeof generateGSTR3BData>[0]);

  // Summary breakdown
  const outputSales = vouchers.filter((v) => v.type === "SALES");
  const inputPurchases = vouchers.filter((v) => v.type === "PURCHASE");

  return NextResponse.json({
    data: gstr3bData,
    summary: {
      outwardSupplies: {
        taxable: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.taxableValue, 0) || 0), 0),
        igst: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.igstAmount, 0) || 0), 0),
        cgst: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.cgstAmount, 0) || 0), 0),
        sgst: outputSales.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.sgstAmount, 0) || 0), 0),
      },
      itcAvailable: {
        igst: inputPurchases.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.igstAmount, 0) || 0), 0),
        cgst: inputPurchases.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.cgstAmount, 0) || 0), 0),
        sgst: inputPurchases.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.sgstAmount, 0) || 0), 0),
      },
    },
  });
}
