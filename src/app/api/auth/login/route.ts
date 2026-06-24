import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createSession, getSessionCookieName, getSessionDuration } from '@/lib/session';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const users = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (!users[0]) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    const user = users[0];
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.company_id }
    });
    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getSessionDuration() / 1000,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
