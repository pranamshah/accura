import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { readToken, SESSION_COOKIE } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = readToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, email, name, role, avatar, phone, created_at
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error('[auth/me]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
