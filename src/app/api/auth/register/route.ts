import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const rows = await sql`
    INSERT INTO users (id, name, email, password, role)
    VALUES (gen_random_uuid()::text, ${name}, ${email}, ${hashed}, 'ADMIN')
    RETURNING id, name, email, role
  `;

  return NextResponse.json({ user: rows[0] }, { status: 201 });
}
