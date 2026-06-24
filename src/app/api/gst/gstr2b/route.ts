import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

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

  // Get purchase vouchers
  const purchases = await prisma.voucher.findMany({
    where: {
      companyId,
      type: "PURCHASE",
      status: "ACTIVE",
      date: { gte: startDate, lte: endDate },
    },
    include: {
      entries: { include: { ledger: true } },
      gstLines: true,
    },
  });

  return NextResponse.json({
    purchases: purchases.map((v) => ({
      voucherId: v.id,
      number: v.number,
      date: v.date,
      supplierName: v.entries?.find((e) => e.type === "CREDIT")?.ledger?.name || "",
      supplierGstin: v.entries?.find((e) => e.type === "CREDIT")?.ledger?.gstin || "",
      taxableValue: v.gstLines?.reduce((s, l) => s + l.taxableValue, 0) || 0,
      igst: v.gstLines?.reduce((s, l) => s + l.igstAmount, 0) || 0,
      cgst: v.gstLines?.reduce((s, l) => s + l.cgstAmount, 0) || 0,
      sgst: v.gstLines?.reduce((s, l) => s + l.sgstAmount, 0) || 0,
      totalValue: v.totalAmount,
      matched: false, // Compare with uploaded GSTR-2B
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Handle GSTR-2B JSON upload and match with purchases
  const body = await req.json() as { companyId: string; jsonData: Record<string, unknown>; month: string; year: string };
  const { companyId, jsonData, month, year } = body;

  if (!companyId || !jsonData) {
    return NextResponse.json({ error: "companyId and jsonData required" }, { status: 400 });
  }

  // Store the GSTR-2B data
  await prisma.gSTReturn.upsert({
    where: {
      id: `${companyId}-GSTR2B-${month}-${year}`,
    },
    create: {
      companyId,
      type: "GSTR2B",
      period: month,
      year: parseInt(year),
      status: "FILED",
      jsonData,
    },
    update: {
      jsonData,
      status: "FILED",
    },
  }).catch(async () => {
    await prisma.gSTReturn.create({
      data: {
        companyId,
        type: "GSTR2B",
        period: month,
        year: parseInt(year),
        status: "FILED",
        jsonData,
      },
    });
  });

  return NextResponse.json({ success: true, message: "GSTR-2B uploaded successfully" });
}
