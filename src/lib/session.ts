import sql from './db';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  companyId: string | null;
}

// Single-user mode: always return the first admin user, no login required.
// Use SELECT * so this works even when the live DB is missing columns like
// company_id (schema drift) — missing columns just come back as undefined.
export async function getSession(): Promise<SessionUser | null> {
  const rows = await sql`SELECT * FROM users ORDER BY created_at LIMIT 1`;
  if (!rows[0]) return null;
  return { id: rows[0].id, email: rows[0].email, name: rows[0].name ?? null, role: rows[0].role ?? 'ADMIN', companyId: rows[0].company_id ?? null };
}

export function getSessionCookieName() { return 'accura_session'; }
export function getSessionDuration() { return 7 * 24 * 60 * 60 * 1000; }
export async function createSession(): Promise<string> { return 'no-op'; }
export async function deleteSession(): Promise<void> { return; }
