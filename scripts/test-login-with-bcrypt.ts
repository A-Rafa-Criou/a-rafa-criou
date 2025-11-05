import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const email = 'edduardooo2011@hotmail.com';
const password = '@Nike2011@'; // Senha que você está tentando

async function testLogin() {
  console.log('\n🧪 TESTE DE LOGIN COM BCRYPT\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Senha: ${password}\n`);

  try {
    // Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log('📋 DADOS DO BANCO:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   password: ${user.password?.substring(0, 30)}... (${user.password?.length} chars)`);
    console.log(
      `   legacyPasswordHash: ${user.legacyPasswordHash || 'null'}`
    );
    console.log(`   legacyPasswordType: ${user.legacyPasswordType || 'null'}\n`);

    if (!user.password) {
      console.log('❌ Usuário sem senha no banco!');
      process.exit(1);
    }

    // Testar bcrypt
    console.log('🔄 Testando bcrypt.compare()...\n');

    const startTime = Date.now();
    const isValid = await bcrypt.compare(password, user.password);
    const endTime = Date.now();

    console.log(`⏱️  Tempo: ${endTime - startTime}ms`);
    console.log(`📊 Resultado: ${isValid ? '✅ SENHA CORRETA' : '❌ SENHA INCORRETA'}\n`);

    if (!isValid) {
      console.log('🔍 DEBUGANDO...\n');
      
      // Testar criando novo hash da mesma senha
      console.log('1️⃣ Gerando novo hash com a mesma senha...');
      const newHash = await bcrypt.hash(password, 10);
      console.log(`   Novo hash: ${newHash.substring(0, 30)}...`);
      
      console.log('\n2️⃣ Testando novo hash...');
      const testNewHash = await bcrypt.compare(password, newHash);
      console.log(`   Resultado: ${testNewHash ? '✅ OK' : '❌ FALHOU'}`);
      
      console.log('\n3️⃣ Comparando hashes:');
      console.log(`   Hash do banco: ${user.password.substring(0, 30)}...`);
      console.log(`   Hash gerado:   ${newHash.substring(0, 30)}...`);
      console.log(`   Iguais? ${user.password === newHash ? 'Sim' : 'Não (esperado, hashes aleatórios)'}`);

      console.log('\n💡 POSSÍVEIS CAUSAS:');
      console.log('   1. A senha que você está tentando está errada');
      console.log('   2. O hash no banco foi corrompido durante a migração');
      console.log('   3. O hash foi gerado com uma senha diferente');
      console.log('\n❓ SUGESTÃO: Redefina a senha usando o link de reset.');
    } else {
      console.log('🎉 LOGIN BEM-SUCEDIDO!');
      console.log('✅ A senha está correta e o hash funciona perfeitamente.');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

testLogin();
