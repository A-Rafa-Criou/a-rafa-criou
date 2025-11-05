import { db } from '../src/lib/db/index.js';
import { users } from '../src/lib/db/schema.js';
import { sql } from 'drizzle-orm';

async function fixAllPasswordHashes() {
  console.log('\n🔧 CORRIGINDO TODOS OS HASHES DE SENHA\n');
  
  console.log('📊 Problema identificado:');
  console.log('   Todos os hashes têm prefixo $wp$ que não é válido');
  console.log('   Precisamos limpar para usar bcrypt puro\n');
  
  console.log('⏳ Atualizando hashes...');
  
  // Remover prefixo $wp$ de todos os hashes
  const result = await db
    .update(users)
    .set({
      password: sql`REPLACE(${users.password}, '$wp', '')`,
      legacyPasswordHash: sql`REPLACE(${users.legacyPasswordHash}, '$wp', '')`,
    })
    .where(sql`${users.password} LIKE '$wp%'`);
  
  console.log(`✅ Hashes atualizados!\n`);
  
  // Verificar resultado
  const sample = await db
    .select({
      email: users.email,
      passwordPrefix: sql<string>`SUBSTRING(${users.password}, 1, 10)`,
    })
    .from(users)
    .limit(5);
  
  console.log('📊 Amostra após correção:\n');
  for (const user of sample) {
    console.log(`   ${user.email}: ${user.passwordPrefix}...`);
  }
  
  console.log('\n✨ Correção completa!');
  console.log('💡 Agora todos os usuários podem fazer login com suas senhas antigas.\n');
  
  process.exit(0);
}

fixAllPasswordHashes().catch(console.error);
