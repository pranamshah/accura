import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const companySchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  financialYearStart: z.number().min(1).max(12).default(4),
  businessType: z
    .enum([
      "SOLE_PROPRIETORSHIP",
      "PARTNERSHIP",
      "LLP",
      "PRIVATE_LIMITED",
      "PUBLIC_LIMITED",
      "OPC",
      "TRUST",
      "NGO",
    ])
    .default("PRIVATE_LIMITED"),
  taxRegistered: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: {
      users: { some: { userId: session.user.id } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Create company + default groups + ledgers + add user
  const company = await prisma.$transaction(async (tx) => {
    const co = await tx.company.create({ data });

    // Add user as admin
    await tx.companyUser.create({
      data: { companyId: co.id, userId: session.user.id!, role: "ADMIN" },
    });

    // Create default units
    const nos = await tx.unit.create({
      data: { companyId: co.id, name: "Numbers", symbol: "NOS", isSystem: true },
    });
    await tx.unit.create({
      data: { companyId: co.id, name: "Kilograms", symbol: "KG", isSystem: true },
    });

    // Create default godown
    await tx.godown.create({
      data: { companyId: co.id, name: "Main Location", isMain: true },
    });

    // Create default ledger groups
    const capitalGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Capital Account", nature: "LIABILITIES", isSystem: true },
    });

    const currentLiabGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Current Liabilities", nature: "LIABILITIES", isSystem: true },
    });
    await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Sundry Creditors", nature: "LIABILITIES", parentId: currentLiabGroup.id, isSystem: true },
    });
    const dutiesTaxGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Duties & Taxes", nature: "LIABILITIES", parentId: currentLiabGroup.id, isSystem: true },
    });
    await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Provisions", nature: "LIABILITIES", parentId: currentLiabGroup.id, isSystem: true },
    });

    const loansLiabGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Loans (Liability)", nature: "LIABILITIES", isSystem: true },
    });
    await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Bank Overdraft", nature: "LIABILITIES", parentId: loansLiabGroup.id, isSystem: true },
    });
    await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Secured Loans", nature: "LIABILITIES", parentId: loansLiabGroup.id, isSystem: true },
    });

    const fixedAssetsGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Fixed Assets", nature: "ASSETS", isSystem: true },
    });
    void fixedAssetsGroup;

    const currentAssetsGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Current Assets", nature: "ASSETS", isSystem: true },
    });
    const cashGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Cash-in-Hand", nature: "ASSETS", parentId: currentAssetsGroup.id, isSystem: true },
    });
    const bankGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Bank Accounts", nature: "ASSETS", parentId: currentAssetsGroup.id, isSystem: true },
    });
    const sundryDebtorsGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Sundry Debtors", nature: "ASSETS", parentId: currentAssetsGroup.id, isSystem: true },
    });
    void sundryDebtorsGroup;
    const stockGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Stock-in-Hand", nature: "ASSETS", parentId: currentAssetsGroup.id, isSystem: true },
    });
    void stockGroup;
    await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Loans & Advances (Asset)", nature: "ASSETS", parentId: currentAssetsGroup.id, isSystem: true },
    });
    await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Investments", nature: "ASSETS", isSystem: true },
    });

    const salesGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Sales Accounts", nature: "INCOME", isSystem: true },
    });
    await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Other Income", nature: "INCOME", isSystem: true },
    });

    const purchaseGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Purchase Accounts", nature: "EXPENSES", isSystem: true },
    });
    const directExpGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Direct Expenses", nature: "EXPENSES", isSystem: true },
    });
    const indirectExpGroup = await tx.ledgerGroup.create({
      data: { companyId: co.id, name: "Indirect Expenses", nature: "EXPENSES", isSystem: true },
    });

    // Create default ledgers
    await tx.ledger.createMany({
      data: [
        { companyId: co.id, groupId: cashGroup.id, name: "Cash", isSystem: true },
        { companyId: co.id, groupId: bankGroup.id, name: "HDFC Bank", isSystem: false },
        { companyId: co.id, groupId: salesGroup.id, name: "Sales", isSystem: true },
        { companyId: co.id, groupId: purchaseGroup.id, name: "Purchases", isSystem: true },
        { companyId: co.id, groupId: dutiesTaxGroup.id, name: "CGST Output", isSystem: true },
        { companyId: co.id, groupId: dutiesTaxGroup.id, name: "SGST Output", isSystem: true },
        { companyId: co.id, groupId: dutiesTaxGroup.id, name: "IGST Output", isSystem: true },
        { companyId: co.id, groupId: currentAssetsGroup.id, name: "CGST Input", isSystem: true },
        { companyId: co.id, groupId: currentAssetsGroup.id, name: "SGST Input", isSystem: true },
        { companyId: co.id, groupId: currentAssetsGroup.id, name: "IGST Input", isSystem: true },
        { companyId: co.id, groupId: dutiesTaxGroup.id, name: "TDS Payable", isSystem: true },
        { companyId: co.id, groupId: currentLiabGroup.id, name: "Salary Payable", isSystem: true },
        { companyId: co.id, groupId: indirectExpGroup.id, name: "Rent", isSystem: false },
        { companyId: co.id, groupId: capitalGroup.id, name: "Capital Account", isSystem: true },
        { companyId: co.id, groupId: capitalGroup.id, name: "Retained Earnings", isSystem: true },
        { companyId: co.id, groupId: indirectExpGroup.id, name: "Bank Charges", isSystem: false },
        { companyId: co.id, groupId: directExpGroup.id, name: "Depreciation", isSystem: false },
        { companyId: co.id, groupId: indirectExpGroup.id, name: "Travelling Expenses", isSystem: false },
        { companyId: co.id, groupId: indirectExpGroup.id, name: "Salary", isSystem: false },
      ],
    });

    // Create default unit (for items reference)
    void nos;

    return co;
  });

  return NextResponse.json({ company }, { status: 201 });
}
