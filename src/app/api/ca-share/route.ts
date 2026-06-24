import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';

const shareSchema = z.object({
  companyId: z.string(),
  caEmail: z.string().email(),
  accessLevel: z.enum(['READ', 'FULL']).default('READ'),
  expiresAt: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const shares = await sql`SELECT * FROM ca_shares WHERE company_id = ${companyId} AND is_active = true ORDER BY created_at DESC`;
  return NextResponse.json({ shares });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const rows = await sql`
    INSERT INTO ca_shares (id, company_id, ca_email, access_level, shared_by, expires_at)
    VALUES (gen_random_uuid()::text, ${d.companyId}, ${d.caEmail}, ${d.accessLevel}, ${'owner'}, ${d.expiresAt ?? null})
    RETURNING *
  `;
  const share = rows[0] as { token: string };
  const shareUrl = `${process.env.NEXTAUTH_URL}/ca-access/${share.token}`;
  return NextResponse.json({ share, shareUrl }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await sql`UPDATE ca_shares SET is_active = false WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
