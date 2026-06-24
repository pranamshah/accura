import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const type = searchParams.get('type');
  const search = searchParams.get('search') || '';

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const parties = await sql`
    SELECT l.*, lg.name as group_name, lg.nature as group_nature
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.company_id = ${companyId}
      AND l.is_party = true
      AND l.is_active = true
      ${type ? sql`AND l.party_type = ${type}` : sql``}
      ${search ? sql`AND l.name ILIKE ${'%' + search + '%'}` : sql``}
    ORDER BY l.name ASC
  `;

  return NextResponse.json({
    parties: parties.map((p) => ({
      ...p,
      group: { id: p.group_id, name: p.group_name, nature: p.group_nature },
    })),
  });
}
