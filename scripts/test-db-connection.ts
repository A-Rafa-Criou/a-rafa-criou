/**
 * Script para testar conexão com banco de dados
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env.local manualmente
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function testConnection() {
  console.log('🔌 Testando conexão com banco de dados...');
  console.log('📍 DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

  try {
    // Tenta executar query simples
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Conexão bem-sucedida!');
    console.log('⏰ Timestamp do servidor:', result[0]);

    // Testa se tabelas i18n existem
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%_i18n'
      ORDER BY table_name
    `);

    console.log('\n📋 Tabelas i18n encontradas:');
    tables.forEach(row => {
      console.log('  ✓', row.table_name);
    });

    if (tables.length === 0) {
      console.log('  ⚠️ Nenhuma tabela i18n encontrada - rode `npx drizzle-kit push`');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    console.log('\n💡 Possíveis soluções:');
    console.log('  1. Verifique se DATABASE_URL está correta no .env.local');
    console.log('  2. Banco Neon pode estar em sleep - aguarde ~10s e tente novamente');
    console.log('  3. Verifique firewall/VPN');
    process.exit(1);
  }
}

testConnection()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
