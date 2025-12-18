/**
 * Script para garantir que o usuário admin existe no banco
 * Execute: npx tsx scripts/ensure-admin-user.ts
 */

import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const ADMIN_EMAIL = 'arafacriou@gmail.com';
const ADMIN_NAME = 'A Rafa Criou';

async function ensureAdminUser() {
  try {
    console.log('🔍 Verificando se admin existe...');

    // Verificar se admin já existe
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1);

    if (existingAdmin.length > 0) {
      const admin = existingAdmin[0];

      // Verificar se já é admin
      if (admin.role === 'admin') {
        console.log('✅ Usuário admin já existe com role=admin');
        console.log('   Email:', admin.email);
        console.log('   Name:', admin.name);
        console.log('   Role:', admin.role);
        return;
      }

      // Atualizar para admin se não for
      console.log('⚠️  Usuário existe mas não é admin. Atualizando...');
      await db.update(users).set({ role: 'admin' }).where(eq(users.email, ADMIN_EMAIL));

      console.log('✅ Usuário atualizado para admin');
      return;
    }

    // Criar novo usuário admin
    console.log('📝 Criando novo usuário admin...');

    const hashedPassword = await bcrypt.hash('Admin@123456', 10);

    await db.insert(users).values({
      id: randomUUID(),
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: hashedPassword,
      role: 'admin',
      emailVerified: new Date(),
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Senha temporária: Admin@123456');
    console.log('   ⚠️  ALTERE A SENHA após o primeiro login!');
  } catch (error) {
    console.error('❌ Erro ao garantir admin:', error);
    process.exit(1);
  }

  process.exit(0);
}

ensureAdminUser();
