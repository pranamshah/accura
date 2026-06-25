import sql from './db';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  companyId: string | null;
}

// Single-user mode: always return the first admin user, no login required
export async function getSession(): Promise<SessionUser | null> {
  const rows = await sql`SELECT id, email, name, role, company_id FROM users ORDER BY created_at LIMIT 1`;
  if (!rows[0]) return null;
  return { id: rows[0].id, email: rows[0].email, name: rows[0].name, role: rows[0].role, companyId: rows[0].company_id };
}

export function getSessionCookieName() { return 'accura_session'; }
export function getSessionDuration() { return 7 * 24 * 60 * 60 * 1000; }
export async function createSession(): Promise<string> { return 'no-op'; }
export async function deleteSession(): Promise<void> { return; }
