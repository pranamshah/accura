import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

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
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  financialYearStart: z.number().min(1).max(12).default(4),
  businessType: z
    .enum([
      'SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LLP',
      'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'OPC', 'TRUST', 'NGO',
    ])
    .default('PRIVATE_LIMITED'),
  taxRegistered: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companies = await sql`
    SELECT c.* FROM companies c
    JOIN company_users cu ON c.id = cu.company_id
    WHERE cu.user_id = ${session.user.id}
    ORDER BY c.created_at DESC
  `;

  return NextResponse.json({ companies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const result = await sql.transaction(async (txn) => {
    const coRows = await txn`
      INSERT INTO companies (id, name, legal_name, gstin, pan, tan, address, city, state, state_code, pincode, phone, email, website, financial_year_start, business_type, tax_registered)
      VALUES (gen_random_uuid()::text, ${d.name}, ${d.legalName ?? null}, ${d.gstin ?? null}, ${d.pan ?? null}, ${d.tan ?? null},
              ${d.address ?? null}, ${d.city ?? null}, ${d.state ?? null}, ${d.stateCode ?? null}, ${d.pincode ?? null},
              ${d.phone ?? null}, ${d.email ?? null}, ${d.website ?? null}, ${d.financialYearStart}, ${d.businessType}, ${d.taxRegistered})
      RETURNING *
    `;
    const co = coRows[0] as { id: string };

    await txn`
      INSERT INTO company_users (id, company_id, user_id, role)
      VALUES (gen_random_uuid()::text, ${co.id}, ${session.user!.id}, 'ADMIN')
    `;

    await txn`INSERT INTO units (id, company_id, name, symbol, is_system) VALUES (gen_random_uuid()::text, ${co.id}, 'Numbers', 'NOS', true)`;
    await txn`INSERT INTO units (id, company_id, name, symbol, is_system) VALUES (gen_random_uuid()::text, ${co.id}, 'Kilograms', 'KG', true)`;
    await txn`INSERT INTO godowns (id, company_id, name, is_main) VALUES (gen_random_uuid()::text, ${co.id}, 'Main Location', true)`;

    const g = async (name: string, nature: string, parentId?: string) => {
      const r = await txn`INSERT INTO ledger_groups (id,company_id,name,nature,is_system,parent_id) VALUES (gen_random_uuid()::text,${co.id},${name},${nature},true,${parentId ?? null}) RETURNING id`;
      return (r[0] as { id: string }).id;
    };

    const capitalId = await g('Capital Account', 'LIABILITIES');
    const currLiabId = await g('Current Liabilities', 'LIABILITIES');
    await g('Sundry Creditors', 'LIABILITIES', currLiabId);
    const dutiesTaxId = await g('Duties & Taxes', 'LIABILITIES', currLiabId);
    await g('Provisions', 'LIABILITIES', currLiabId);
    await g('Loans (Liability)', 'LIABILITIES');
    await g('Fixed Assets', 'ASSETS');
    const currAssetsId = await g('Current Assets', 'ASSETS');
    const cashGrpId = await g('Cash-in-Hand', 'ASSETS', currAssetsId);
    const bankGrpId = await g('Bank Accounts', 'ASSETS', currAssetsId);
    await g('Sundry Debtors', 'ASSETS', currAssetsId);
    await g('Stock-in-Hand', 'ASSETS', currAssetsId);
    await g('Loans & Advances (Asset)', 'ASSETS', currAssetsId);
    await g('Investments', 'ASSETS');
    const salesGrpId = await g('Sales Accounts', 'INCOME');
    await g('Other Income', 'INCOME');
    const purchaseGrpId = await g('Purchase Accounts', 'EXPENSES');
    await g('Direct Expenses', 'EXPENSES');
    const indirectExpId = await g('Indirect Expenses', 'EXPENSES');

    const ledgers = [
      [cashGrpId, 'Cash', true],
      [bankGrpId, 'HDFC Bank', false],
      [salesGrpId, 'Sales', true],
      [purchaseGrpId, 'Purchases', true],
      [dutiesTaxId, 'CGST Output', true],
      [dutiesTaxId, 'SGST Output', true],
      [dutiesTaxId, 'IGST Output', true],
      [currAssetsId, 'CGST Input', true],
      [currAssetsId, 'SGST Input', true],
      [currAssetsId, 'IGST Input', true],
      [dutiesTaxId, 'TDS Payable', true],
      [currLiabId, 'Salary Payable', true],
      [indirectExpId, 'Rent', false],
      [capitalId, 'Capital Account', true],
      [capitalId, 'Retained Earnings', true],
      [indirectExpId, 'Bank Charges', false],
      [indirectExpId, 'Depreciation', false],
      [indirectExpId, 'Travelling Expenses', false],
      [indirectExpId, 'Salary', false],
    ];

    for (const [groupId, name, isSystem] of ledgers) {
      await txn`
        INSERT INTO ledgers (id, company_id, group_id, name, is_system)
        VALUES (gen_random_uuid()::text, ${co.id}, ${groupId as string}, ${name as string}, ${isSystem as boolean})
      `;
    }

    return co;
  });

  return NextResponse.json({ company: result }, { status: 201 });
}
