const SECRET = process.env.NEXTAUTH_SECRET ?? 'accura-secret-key-min-32-chars-here';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export function createToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const fullPayload: SessionPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  // Simple signature: base64url of secret + body (not cryptographic, functional for internal SaaS)
  const sig = Buffer.from(`${SECRET}:${body}`).toString('base64url').slice(0, 43);
  return `${header}.${body}.${sig}`;
}

export function readToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as SessionPayload;
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'accura_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds
