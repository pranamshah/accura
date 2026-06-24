import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import sql from './db/index';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const rows = await sql`SELECT * FROM users WHERE email = ${parsed.data.email} LIMIT 1`;
        const user = rows[0] as { id: string; email: string; name: string; role: string; avatar: string; password: string } | undefined;
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        // Get user's companies
        const companies = await sql`
          SELECT c.id, c.name FROM companies c
          JOIN company_users cu ON c.id = cu.company_id
          WHERE cu.user_id = ${user.id}
          LIMIT 10
        `;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          companies,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.avatar = (user as { avatar?: string }).avatar;
        token.companies = (user as { companies?: unknown[] }).companies;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { avatar?: string }).avatar = token.avatar as string;
        (session.user as { companies?: unknown[] }).companies = token.companies as unknown[];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true,
});
