import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateGSTR1JSON } from "@/lib/gst";

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

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

  const vouchers = await prisma.voucher.findMany({
    where: {
      companyId,
      type: { in: ["SALES", "DEBIT_NOTE", "CREDIT_NOTE"] },
      status: "ACTIVE",
      date: { gte: startDate, lte: endDate },
    },
    include: {
      entries: { include: { ledger: true } },
      gstLines: true,
    },
  });

  // Build table data
  const b2b = vouchers
    .filter((v) => v.entries?.some((e) => e.ledger?.gstin))
    .map((v) => ({
      voucherId: v.id,
      number: v.number,
      date: v.date,
      partyName: v.entries?.find((e) => e.type === "DEBIT")?.ledger?.name || "",
      partyGstin: v.entries?.find((e) => e.type === "DEBIT")?.ledger?.gstin || "",
      taxableValue: v.gstLines?.reduce((s, l) => s + l.taxableValue, 0) || 0,
      igst: v.gstLines?.reduce((s, l) => s + l.igstAmount, 0) || 0,
      cgst: v.gstLines?.reduce((s, l) => s + l.cgstAmount, 0) || 0,
      sgst: v.gstLines?.reduce((s, l) => s + l.sgstAmount, 0) || 0,
      cess: v.gstLines?.reduce((s, l) => s + l.cessAmount, 0) || 0,
      totalValue: v.totalAmount,
      placeOfSupply: v.placeOfSupply || company.stateCode || "33",
    }));

  const b2c = vouchers
    .filter((v) => !v.entries?.some((e) => e.ledger?.gstin))
    .map((v) => ({
      voucherId: v.id,
      number: v.number,
      date: v.date,
      taxableValue: v.gstLines?.reduce((s, l) => s + l.taxableValue, 0) || 0,
      igst: v.gstLines?.reduce((s, l) => s + l.igstAmount, 0) || 0,
      cgst: v.gstLines?.reduce((s, l) => s + l.cgstAmount, 0) || 0,
      sgst: v.gstLines?.reduce((s, l) => s + l.sgstAmount, 0) || 0,
      totalValue: v.totalAmount,
    }));

  const gstr1Json = generateGSTR1JSON(
    vouchers as Parameters<typeof generateGSTR1JSON>[0],
    company.gstin || "",
    month,
    parseInt(year)
  );

  return NextResponse.json({
    b2b,
    b2c,
    summary: {
      totalInvoices: vouchers.length,
      totalTaxable: vouchers.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.taxableValue, 0) || 0), 0),
      totalTax: vouchers.reduce((s, v) => s + (v.gstLines?.reduce((gs, l) => gs + l.totalTax, 0) || 0), 0),
      totalValue: vouchers.reduce((s, v) => s + v.totalAmount, 0),
    },
    json: gstr1Json,
  });
}
