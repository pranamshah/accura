import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { suggestJournalEntry } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { prompt: string; companyId: string };
  const { prompt, companyId } = body;

  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  let company = null;
  if (companyId) {
    const rows = await sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`;
    company = rows[0] as { name: string; gstin: string | null; state: string | null } | undefined;
  }

  const suggestion = await suggestJournalEntry(prompt, company ? {
    name: company.name,
    gstin: company.gstin || undefined,
    state: company.state || undefined,
  } : undefined);

  if (companyId) {
    await sql`
      INSERT INTO ai_entries (id, company_id, user_id, prompt, response, type)
      VALUES (gen_random_uuid()::text, ${companyId}, ${session.user.id}, ${prompt}, ${JSON.stringify(suggestion)}, 'ENTRY_SUGGESTION')
    `;
  }

  return NextResponse.json({ suggestion });
}
