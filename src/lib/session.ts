import sql from './db';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  companyId: string | null;
}

// Default session used when the DB has no users yet (fresh install, or init
// hasn't run). All API routes rely on getSession() being non-null to proceed,
// so returning a default admin lets them work even before the seed user exists.
const DEFAULT_SESSION: SessionUser = {
  id: 'default',
  email: 'admin@accura.in',
  name: 'Admin',
  role: 'ADMIN',
  companyId: null,
};

// Single-user mode: always return the first admin user, no login required.
// Never returns null — falls back to DEFAULT_SESSION on any error or empty DB
// so the app works on a fresh Neon instance before /api/init is called.
export async function getSession(): Promise<SessionUser> {
  try {
    const rows = await sql`SELECT * FROM users ORDER BY created_at LIMIT 1`;
    if (!rows[0]) return DEFAULT_SESSION;
    return {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name ?? null,
      role: rows[0].role ?? 'ADMIN',
      companyId: rows[0].company_id ?? null,
    };
  } catch {
    // users table may not exist yet on a brand-new DB
    return DEFAULT_SESSION;
  }
}

export function getSessionCookieName() { return 'accura_session'; }
export function getSessionDuration()   { return 7 * 24 * 60 * 60 * 1000; }
export async function createSession(): Promise<string> { return 'no-op'; }
export async function deleteSession(): Promise<void>   { return; }
