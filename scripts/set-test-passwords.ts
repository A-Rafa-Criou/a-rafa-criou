/**
 * Script para definir senha funcional para usuários específicos de teste
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function setTestPasswords() {
  const testUsers = [
    { email: 'edduardooo2011@hotmail.com', password: 'Teste123!' },
    { email: 'arafacriou@gmail.com', password: 'RafaByEla@2025' },
  ];

  console.log('🔐 Definindo senhas funcionais para usuários de teste...\n');

  for (const testUser of testUsers) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, testUser.email))
        .limit(1);

      if (!user) {
        console.log(`❌ ${testUser.email} - não encontrado`);
        continue;
      }

      // Gerar hash bcrypt funcional
      const hash = await bcrypt.hash(testUser.password, 10);

      // Atualizar no banco
      await db
        .update(users)
        .set({
          password: hash,
          legacyPasswordHash: null,
          legacyPasswordType: null,
        })
        .where(eq(users.id, user.id));

      console.log(`✅ ${testUser.email}`);
      console.log(`   Senha: ${testUser.password}`);
      console.log(`   Hash: ${hash.substring(0, 30)}...`);
      console.log();
    } catch (error) {
      console.error(`❌ Erro ao processar ${testUser.email}:`, error);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Senhas de teste configuradas!');
  console.log();
  console.log('💡 TESTE AGORA:');
  console.log('   1. Acesse http://localhost:3000/auth/login');
  console.log('   2. Use um dos emails acima com a senha informada');
  console.log('   3. Deve funcionar perfeitamente!');
}

setTestPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
