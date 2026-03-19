import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/cache/upstash';

/**
 * 🚀 Rate Limiting com Upstash Redis
 *
 * Protege contra:
 * - DDoS attacks
 * - API abuse
 * - Scraping agressivo
 * - Spike de tráfego
 *
 * Limites sugeridos:
 * - API pública: 60 requests/minuto por IP
 * - API admin: 30 requests/minuto por usuário
 * - Login: 5 tentativas/minuto por IP
 */

export interface RateLimitConfig {
  limit: number; // Máximo de requests
  window: number; // Janela de tempo em segundos
  identifier?: string; // ID customizado (user ID, session, etc.)
}

/**
 * Verifica rate limit usando sliding window
 * Retorna { success: boolean, remaining: number, reset: number }
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}> {
  const redis = getRedis();

  // Se Redis não configurado, permitir (modo degradado)
  if (!redis) {
    return { success: true, remaining: config.limit, reset: 0, limit: config.limit };
  }

  try {
    // Identificador único (IP ou custom)
    const identifier =
      config.identifier ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const method = request.method || 'GET';
    const pathname = request.nextUrl?.pathname || 'unknown-path';
    const key = `ratelimit:${identifier}:${method}:${pathname}`;
    const now = Date.now();
    const windowMs = config.window * 1000;

    // Usar pipeline para atomicidade
    const pipeline = redis.pipeline();

    // Remover timestamps antigos
    pipeline.zremrangebyscore(key, 0, now - windowMs);

    // Adicionar request atual
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // Contar requests na janela
    pipeline.zcard(key);

    // Definir TTL
    pipeline.expire(key, config.window);

    const results = await pipeline.exec();
    const count = (results[2] as number) || 0;

    const remaining = Math.max(0, config.limit - count);
    const resetTime = now + windowMs;

    return {
      success: count <= config.limit,
      remaining,
      reset: Math.ceil(resetTime / 1000),
      limit: config.limit,
    };
  } catch (error) {
    console.error('[RATE LIMIT ERROR]', error);
    // Em caso de erro, permitir (fail-open)
    return { success: true, remaining: config.limit, reset: 0, limit: config.limit };
  }
}

/**
 * Middleware helper para aplicar rate limit
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, config);

  // Adicionar headers de rate limit (padrão RateLimit spec)
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.reset));

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Limite de ${config.limit} requests por ${config.window} segundos excedido. Tente novamente em ${Math.ceil((result.reset * 1000 - Date.now()) / 1000)}s.`,
        retryAfter: result.reset,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  // Rate limit OK, retornar null (continuar)
  return null;
}

/**
 * Configurações pré-definidas
 */
export const RATE_LIMITS = {
  // APIs públicas (produtos, categorias)
  public: { limit: 60, window: 60 }, // 60 req/min

  // APIs de busca (mais pesadas)
  search: { limit: 30, window: 60 }, // 30 req/min

  // Admin
  admin: { limit: 100, window: 60 }, // 100 req/min

  // Auth (mais restritivo)
  auth: { limit: 5, window: 60 }, // 5 tentativas/min

  // Upload (muito restritivo)
  upload: { limit: 10, window: 300 }, // 10 uploads/5min

  // Webhooks
  webhook: { limit: 100, window: 60 }, // 100 req/min
} as const;
