/**
 * Script para testar fluxo completo de reset de senha
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function testPasswordReset() {
  const testEmail = 'edduardooo2011@hotmail.com';
  
  console.log('🧪 TESTE DE RESET DE SENHA\n');
  console.log(`📧 Email de teste: ${testEmail}\n`);

  try {
    // 1. Buscar usuário
    console.log('1️⃣ Buscando usuário...');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário não encontrado!');
      return;
    }

    console.log(`✅ Usuário encontrado: ${user.email}`);
    console.log(`   ID: ${user.id}\n`);

    // 2. Gerar token de reset
    console.log('2️⃣ Gerando token de reset...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    console.log(`✅ Token gerado: ${resetToken.substring(0, 20)}...`);
    console.log(`   Expira em: ${resetTokenExpiry.toLocaleString('pt-BR')}\n`);

    // 3. Salvar token no banco
    console.log('3️⃣ Salvando token no banco...');
    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry,
      })
      .where(eq(users.id, user.id));

    console.log('✅ Token salvo com sucesso!\n');

    // 4. Verificar se token foi salvo
    console.log('4️⃣ Verificando token salvo...');
    const [updatedUser] = await db
      .select({
        resetToken: users.resetToken,
        resetTokenExpiry: users.resetTokenExpiry,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (updatedUser.resetToken === resetToken) {
      console.log('✅ Token verificado no banco!');
      console.log(`   Token: ${updatedUser.resetToken?.substring(0, 20)}...`);
      console.log(`   Expira: ${updatedUser.resetTokenExpiry?.toLocaleString('pt-BR')}\n`);
    } else {
      console.log('❌ Token não foi salvo corretamente!');
      return;
    }

    // 5. Gerar URL de reset
    const resetUrl = `http://localhost:3000/auth/reset-password?token=${resetToken}`;
    console.log('5️⃣ URL de Reset de Senha:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(resetUrl);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log('6️⃣ Testando API de reset...');
    console.log('   Você pode testar manualmente:');
    console.log('   1. Abra o navegador');
    console.log(`   2. Cole a URL: ${resetUrl}`);
    console.log('   3. Digite uma nova senha (mínimo 6 caracteres)');
    console.log('   4. Clique em "Redefinir Senha"\n');

    console.log('📋 INFORMAÇÕES PARA TESTE MANUAL:');
    console.log(`   Token: ${resetToken}`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Nova senha sugerida: NovaSenha123!\n`);

    console.log('✅ Teste de preparação concluído!');
    console.log('⏰ Token expira em 1 hora.');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    process.exit(0);
  }
}

testPasswordReset();
