import { auth } from './server/auth/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/inventory', '/history'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) return NextResponse.next();

  const session = await auth();

  if (!session?.user?.id) {
    const signInUrl = new URL('/', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on game routes but not on static files or Next.js internals
  matcher: ['/dashboard/:path*', '/inventory/:path*', '/history/:path*'],
};

export default proxy;
