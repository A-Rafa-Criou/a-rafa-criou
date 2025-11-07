import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // ========================================================================
    // 1. REDIRECIONAMENTOS 301 (url_map)
    // ========================================================================
    // NOTA: Redirecionamentos via banco desabilitados no Edge Runtime
    // Para usar redirecionamentos, configure-os diretamente no next.config.ts
    // ou use Vercel redirects/rewrites

    // ========================================================================
    // 2. LOCALE COOKIE (i18n)
    // ========================================================================
    // Ensure NEXT_LOCALE cookie exists so server-side rendering can read it
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    if (!cookieLocale) {
      const accept = request.headers.get('accept-language') || '';
      const pref = accept.split(',')[0]?.split('-')[0] || 'pt';
      const locale = ['pt', 'en', 'es'].includes(pref) ? pref : 'pt';
      const res = NextResponse.next();
      // Set cookie for 1 year
      res.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
      return res;
    }

    // ========================================================================
    // 3. AUTENTICAÇÃO - ROTAS ADMIN
    // ========================================================================
    // Rotas que precisam de autenticação de admin
    if (pathname.startsWith('/admin')) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
      });

      if (!token) {
        return NextResponse.redirect(new URL('/auth/login?callbackUrl=/admin', request.url));
      }

      // Verificar se o usuário tem role de admin
      if (token.role !== 'admin') {
        return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
      }
    }

    // ========================================================================
    // 4. AUTENTICAÇÃO - ROTAS DE CONTA
    // ========================================================================
    // Rotas que precisam de autenticação básica
    if (pathname.startsWith('/conta')) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
      });

      if (!token) {
        return NextResponse.redirect(new URL('/auth/login?callbackUrl=/conta', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/.*|.*\\..*).*)'],
};
