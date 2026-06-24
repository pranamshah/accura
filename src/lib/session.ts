import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import sql from './db';

const SESSION_COOKIE = 'accura_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  companyId: string | null;
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  await sql`INSERT INTO sessions (user_id, token, expires_at) VALUES (${userId}, ${token}, ${expiresAt.toISOString()})`;
  return token;
}

export async function getSession(req?: NextRequest): Promise<SessionUser | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(SESSION_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE)?.value;
  }
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.email, u.name, u.role, u.company_id
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `;
  if (!rows[0]) return null;
  return { id: rows[0].id, email: rows[0].email, name: rows[0].name, role: rows[0].role, companyId: rows[0].company_id };
}

export async function deleteSession(req?: NextRequest): Promise<void> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(SESSION_COOKIE)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE)?.value;
  }
  if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export function getSessionCookieName() { return SESSION_COOKIE; }
export function getSessionDuration() { return SESSION_DURATION; }
