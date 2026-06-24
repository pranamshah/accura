import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { buildEInvoicePayload } from "@/lib/gst";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const voucherId = searchParams.get("voucherId");

  if (!companyId || !voucherId) {
    return NextResponse.json({ error: "companyId and voucherId required" }, { status: 400 });
  }

  const [voucher, company] = await Promise.all([
    prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        entries: { include: { ledger: true } },
        gstLines: true,
        inventoryLines: { include: { item: true } },
      },
    }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);

  if (!voucher || !company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buyerLedger = voucher.entries?.find((e) => e.type === "DEBIT")?.ledger;

  const payload = buildEInvoicePayload(
    voucher as Parameters<typeof buildEInvoicePayload>[0],
    {
      gstin: company.gstin || "",
      name: company.name,
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      stateCode: company.stateCode || "33",
      pincode: company.pincode || "600001",
    },
    {
      gstin: buyerLedger?.gstin || undefined,
      name: buyerLedger?.name || "Consumer",
      address: buyerLedger?.address || "",
      city: buyerLedger?.city || "",
      state: buyerLedger?.state || "",
      stateCode: buyerLedger?.stateCode || "33",
      pincode: buyerLedger?.pincode || "600001",
    }
  );

  return NextResponse.json({ payload, voucher });
}
