/**
 * Script para limpar TODO o cache do Redis/Upstash
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Redis } from '@upstash/redis';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🗑️  Limpando cache do Redis...\n');

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('❌ Redis não configurado - sem cache para limpar');
    process.exit(0);
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    // Limpar TODAS as chaves do Redis (flushdb)
    console.log('🔥 Limpando TODAS as chaves do Redis...');
    const keys = await redis.keys('*');
    console.log(`   Encontradas ${keys.length} chaves`);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`   ✅ ${keys.length} chaves deletadas`);
    }
    
    console.log('\n✅ Cache completamente limpo!');
    console.log('   Recarregue a página para ver as traduções');
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
