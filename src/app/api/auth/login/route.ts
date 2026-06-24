import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { createToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, email, name, password, role, avatar, phone, created_at
      FROM users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    const user = rows[0] as {
      id: string;
      email: string;
      name: string;
      password: string;
      role: string;
      avatar: string | null;
      phone: string | null;
      created_at: string;
    } | undefined;

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = createToken({ userId: user.id, email: user.email, name: user.name });

    // Strip password hash before returning
    const { password: _pw, ...safeUser } = user;
    void _pw;

    const res = NextResponse.json({ user: safeUser });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
    });

    return res;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
