import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const email = 'edduardooo2011@hotmail.com';
const newPassword = '@Nike2011@'; // Mesma senha, mas hash novo e correto

async function fixUserHash() {
  console.log('\n🔧 CORRIGINDO HASH DO USUÁRIO\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Nova senha: ${newPassword}\n`);

  try {
    // Gerar hash correto
    console.log('1️⃣ Gerando hash bcrypt correto...');
    const correctHash = await bcrypt.hash(newPassword, 10);
    console.log(`   Hash: ${correctHash.substring(0, 30)}... (${correctHash.length} chars)`);

    // Testar hash antes de salvar
    console.log('\n2️⃣ Testando hash...');
    const testHash = await bcrypt.compare(newPassword, correctHash);
    console.log(`   Resultado: ${testHash ? '✅ OK' : '❌ FALHOU'}`);

    if (!testHash) {
      console.log('\n❌ Hash inválido! Abortando...');
      process.exit(1);
    }

    // Atualizar no banco
    console.log('\n3️⃣ Atualizando no banco de dados...');
    const result = await db
      .update(users)
      .set({
        password: correctHash,
        legacyPasswordHash: null,
        legacyPasswordType: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning({ id: users.id, email: users.email });

    if (result.length === 0) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log(`✅ Usuário atualizado: ${result[0].email}`);
    console.log(`   ID: ${result[0].id}`);

    // Verificar atualização
    console.log('\n4️⃣ Verificando hash no banco...');
    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    console.log(`   Hash salvo: ${user.password?.substring(0, 30)}...`);

    // Testar login com hash salvo
    console.log('\n5️⃣ Testando login com hash salvo...');
    const finalTest = await bcrypt.compare(newPassword, user.password!);
    console.log(`   Resultado: ${finalTest ? '✅ LOGIN FUNCIONA' : '❌ LOGIN FALHOU'}`);

    if (finalTest) {
      console.log('\n🎉 SUCESSO!');
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ Hash corrigido e testado');
      console.log('✅ Login funcionando perfeitamente');
      console.log('═══════════════════════════════════════════════════');
      console.log('\n💡 Agora você pode fazer login normalmente!');
      console.log(`   📧 Email: ${email}`);
      console.log(`   🔑 Senha: ${newPassword}`);
    } else {
      console.log('\n❌ FALHOU! Hash não está funcionando.');
    }
  } catch (error) {
    console.error('\n❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

fixUserHash();
