import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const email = process.argv[2] || 'edduardooo2011@hotmail.com';

async function generateResetLink() {
  try {
    console.log('\n🔍 Buscando usuário:', email);

    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      console.error('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log('✅ Usuário encontrado:', user.id);

    // Gerar token novo
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    console.log('\n🔐 Gerando novo token...');
    console.log('Token:', resetToken);
    console.log('Expira em:', resetTokenExpiry.toLocaleString('pt-BR'));

    // Salvar no banco
    await db.update(users)
      .set({
        resetToken,
        resetTokenExpiry,
      })
      .where(eq(users.id, user.id));

    console.log('✅ Token salvo no banco de dados!');

    // Gerar URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    // Exibir link formatado
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🔐 LINK DE RECUPERAÇÃO DE SENHA - VÁLIDO POR 1 HORA                      ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  📧 Email: ${email.padEnd(68)}║`);
    console.log('╠════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  🔗 ${resetUrl.padEnd(74)}║`);
    console.log('╠════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  ⏰ Expira: ${resetTokenExpiry.toLocaleString('pt-BR').padEnd(63)}║`);
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Link copiável:');
    console.log(resetUrl);
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

generateResetLink();
