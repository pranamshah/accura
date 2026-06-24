import { NextResponse } from 'next/server';
import { deleteSession, getSessionCookieName } from '@/lib/session';

export async function POST() {
  try {
    await deleteSession();
    const res = NextResponse.json({ success: true });
    res.cookies.set(getSessionCookieName(), '', { maxAge: 0, path: '/' });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: true });
  }
}
