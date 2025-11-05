import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db/index.js';
import { users } from '../src/lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function createMyPassword() {
  const email = 'edduardooo2011@hotmail.com';

  // ============================================
  // 👇 ESCOLHA SUA NOVA SENHA AQUI
  const newPassword = '@Nike2011@'; // Pode ser a mesma ou outra
  // ============================================

  console.log('\n🔐 CRIANDO NOVA SENHA\n');
  console.log('📧 Email:', email);
  console.log('🔑 Nova senha:', newPassword);

  console.log('\n⏳ Gerando hash bcrypt...');
  const newHash = await bcrypt.hash(newPassword, 10);
  console.log('✅ Hash gerado:', newHash);

  console.log('\n⏳ Atualizando no banco...');
  await db
    .update(users)
    .set({
      password: newHash,
      legacyPasswordHash: null, // Limpar hash legado
      legacyPasswordType: null,
    })
    .where(eq(users.email, email));

  console.log('✅ Senha atualizada com sucesso!\n');
  console.log('🎉 Login com:');
  console.log('   📧', email);
  console.log('   🔑', newPassword);
  console.log('\n');

  process.exit(0);
}

createMyPassword().catch(console.error);
