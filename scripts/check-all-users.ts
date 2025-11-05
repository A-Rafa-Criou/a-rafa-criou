import { db } from '../src/lib/db/index.js';
import { users } from '../src/lib/db/schema.js';
import { sql } from 'drizzle-orm';

async function checkAllUsers() {
  console.log('\n🔍 VERIFICANDO TODOS OS USUÁRIOS\n');

  // Pegar 10 usuários aleatórios
  const allUsers = await db
    .select({
      email: users.email,
      name: users.name,
      hasPassword: sql<boolean>`${users.password} IS NOT NULL`,
      hasLegacyHash: sql<boolean>`${users.legacyPasswordHash} IS NOT NULL`,
      legacyType: users.legacyPasswordType,
      passwordPrefix: sql<string>`SUBSTRING(${users.password}, 1, 10)`,
      legacyPrefix: sql<string>`SUBSTRING(${users.legacyPasswordHash}, 1, 10)`,
    })
    .from(users)
    .limit(10);

  console.log('📊 Amostra de 10 usuários:\n');

  for (const user of allUsers) {
    console.log(`📧 ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(
      `   password: ${user.hasPassword ? '✅ ' + user.passwordPrefix + '...' : '❌ NULL'}`
    );
    console.log(
      `   legacyPasswordHash: ${user.hasLegacyHash ? '✅ ' + user.legacyPrefix + '...' : '❌ NULL'}`
    );
    console.log(`   legacyType: ${user.legacyType || 'NULL'}`);
    console.log('');
  }

  // Estatísticas
  const stats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      comPassword: sql<number>`COUNT(${users.password})`,
      comLegacy: sql<number>`COUNT(${users.legacyPasswordHash})`,
      comAmbos: sql<number>`SUM(CASE WHEN ${users.password} IS NOT NULL AND ${users.legacyPasswordHash} IS NOT NULL THEN 1 ELSE 0 END)`,
    })
    .from(users);

  console.log('📈 ESTATÍSTICAS GERAIS:\n');
  console.log(`   Total de usuários: ${stats[0].total}`);
  console.log(`   Com password (bcrypt): ${stats[0].comPassword}`);
  console.log(`   Com legacyPasswordHash: ${stats[0].comLegacy}`);
  console.log(`   Com ambos: ${stats[0].comAmbos}`);
  console.log('');

  process.exit(0);
}

checkAllUsers().catch(console.error);
