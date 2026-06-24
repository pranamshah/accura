import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { generateInvoicePDF, generateTrialBalancePDF } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const companyId = searchParams.get("companyId");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  if (type === "invoice" && id) {
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        entries: { include: { ledger: true } },
        gstLines: true,
        inventoryLines: { include: { item: { include: { unit: true } } } },
      },
    });
    if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });

    const dataUri = await generateInvoicePDF(
      voucher as Parameters<typeof generateInvoicePDF>[0],
      {
        name: company.name,
        address: company.address || undefined,
        city: company.city || undefined,
        state: company.state || undefined,
        gstin: company.gstin || undefined,
        phone: company.phone || undefined,
        email: company.email || undefined,
      }
    );

    return NextResponse.json({ dataUri });
  }

  if (type === "trial-balance") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/reports/trial-balance?companyId=${companyId}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`, {
      headers: req.headers,
    });
    const data = await res.json() as { rows: Parameters<typeof generateTrialBalancePDF>[0] };

    const period = from && to ? `${new Date(from).toLocaleDateString("en-IN")} to ${new Date(to).toLocaleDateString("en-IN")}` : "All Dates";
    const dataUri = await generateTrialBalancePDF(data.rows, { name: company.name }, period);
    return NextResponse.json({ dataUri });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
