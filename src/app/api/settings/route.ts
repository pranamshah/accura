import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const companyRows = await sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`;
  if (companyRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const users = await sql`
    SELECT cu.*, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role, u.avatar as user_avatar
    FROM company_users cu JOIN users u ON cu.user_id = u.id
    WHERE cu.company_id = ${companyId}
  `;

  return NextResponse.json({
    company: companyRows[0],
    users: (users as { user_id: string; user_name: string; user_email: string; user_role: string; user_avatar: string | null }[]).map((u) => ({
      ...u,
      user: { id: u.user_id, name: u.user_name, email: u.user_email, role: u.user_role, avatar: u.user_avatar },
    })),
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const { companyId, ...data } = body as { companyId: string; [key: string]: unknown };
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const rows = await sql`
    UPDATE companies SET
      name = COALESCE(${data.name as string ?? null}, name),
      legal_name = COALESCE(${data.legalName as string ?? null}, legal_name),
      gstin = COALESCE(${data.gstin as string ?? null}, gstin),
      pan = COALESCE(${data.pan as string ?? null}, pan),
      tan = COALESCE(${data.tan as string ?? null}, tan),
      address = COALESCE(${data.address as string ?? null}, address),
      city = COALESCE(${data.city as string ?? null}, city),
      state = COALESCE(${data.state as string ?? null}, state),
      state_code = COALESCE(${data.stateCode as string ?? null}, state_code),
      pincode = COALESCE(${data.pincode as string ?? null}, pincode),
      phone = COALESCE(${data.phone as string ?? null}, phone),
      email = COALESCE(${data.email as string ?? null}, email),
      website = COALESCE(${data.website as string ?? null}, website),
      logo_url = COALESCE(${data.logoUrl as string ?? null}, logo_url),
      bank_name = COALESCE(${data.bankName as string ?? null}, bank_name),
      bank_account = COALESCE(${data.bankAccount as string ?? null}, bank_account),
      bank_ifsc = COALESCE(${data.bankIfsc as string ?? null}, bank_ifsc),
      updated_at = NOW()
    WHERE id = ${companyId}
    RETURNING *
  `;

  return NextResponse.json({ company: rows[0] });
}
