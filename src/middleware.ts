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
    // 4. SEGURANÇA - PROTEÇÃO DE API DE PEDIDOS GRÁTIS
    // ========================================================================
    // Adicionar headers de segurança para API de pedidos grátis
    if (pathname === '/api/orders/free') {
      // Bloquear acesso direto sem autenticação via headers
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
      });

      if (!token) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      // Adicionar headers anti-cache para prevenir indexação
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    }

    // ========================================================================
    // 5. TRACKING DE AFILIADOS
    // ========================================================================
    // Capturar parâmetro ?ref= e criar cookie
    const refParam = request.nextUrl.searchParams.get('ref');
    if (refParam) {
      const res = NextResponse.next();

      // Criar cookie com código do afiliado (duração: 30 dias por padrão)
      res.cookies.set('affiliate_code', refParam, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        httpOnly: true, // Seguro - apenas server-side
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      // Chamar API de tracking para registrar o click
      // Não bloquear o fluxo se falhar
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'https://arafacriou.com.br';
        const userAgent = request.headers.get('user-agent') || '';
        const referer = request.headers.get('referer') || '';
        const ip =
          request.headers.get('x-forwarded-for')?.split(',')[0] ||
          request.headers.get('x-real-ip') ||
          'unknown';

        // Fazer tracking assíncrono (não aguardar resposta)
        fetch(`${baseUrl}/api/affiliates/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: refParam,
            userAgent,
            referer,
            ip,
          }),
        }).catch(err => {
          console.error('[Middleware] Erro ao rastrear click de afiliado:', err);
        });
      } catch (err) {
        console.error('[Middleware] Erro ao processar tracking:', err);
      }

      return res;
    }

    // ========================================================================
    // ========================================================================
    // 6. AUTENTICAÇÃO - ROTAS ADMIN
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
    // 7. AUTENTICAÇÃO - ROTAS DE CONTA
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

    // ========================================================================
    // 8. AUTENTICAÇÃO - ÁREA DO AFILIADO
    // ========================================================================
    // Rotas que precisam que o usuário seja afiliado
    if (pathname.startsWith('/afiliado')) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
      });

      if (!token) {
        return NextResponse.redirect(new URL('/auth/login?callbackUrl=/afiliado', request.url));
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
