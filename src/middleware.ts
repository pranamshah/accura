import { NextRequest, NextResponse } from 'next/server';

// Single-user mode: no auth required, pass everything through
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
