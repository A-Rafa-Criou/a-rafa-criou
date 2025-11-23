/**
 * Script para RESTAURAR as senhas originais do WordPress do CSV
 *
 * Este script:
 * 1. Lê o CSV com os hashes originais ($wp$...)
 * 2. Restaura para legacyPasswordHash
 * 3. Limpa o campo password (será gerado no login)
 * 4. Define legacyPasswordType como 'wordpress_phpass'
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface CustomerCSV {
  user_id: string;
  email: string;
  password_hash: string;
  name: string;
}

async function parseCSV(filePath: string): Promise<CustomerCSV[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const customers: CustomerCSV[] = [];

  // Pular cabeçalho
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 4) continue;

    customers.push({
      user_id: parts[0],
      email: parts[1],
      password_hash: parts[2],
      name: parts[3],
    });
  }

  return customers;
}

async function restoreWordPressPasswords() {
  const csvPath = path.join(process.cwd(), 'data', 'test', 'customers.csv');

  console.log('📁 Lendo CSV:', csvPath);
  console.log();

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo CSV não encontrado!');
    process.exit(1);
  }

  const customers = await parseCSV(csvPath);
  console.log(`✅ CSV carregado: ${customers.length} registros`);
  console.log();

  let restored = 0;
  let notFound = 0;
  let skipped = 0;
  let errors = 0;

  for (const customer of customers) {
    try {
      // Buscar usuário no banco
      const [user] = await db.select().from(users).where(eq(users.email, customer.email)).limit(1);

      if (!user) {
        notFound++;
        continue;
      }

      // Verificar se tem hash válido do WordPress no CSV
      if (!customer.password_hash || !customer.password_hash.startsWith('$wp$')) {
        skipped++;
        continue;
      }

      // MANTER o prefixo $wp$ como está no CSV
      const hashWithPrefix = customer.password_hash; // Mantém $wp$2y$10$...

      // RESTAURAR para o estado original de migração
      await db
        .update(users)
        .set({
          password: null, // Limpar - será gerado no login
          legacyPasswordHash: hashWithPrefix, // Hash COM prefixo $wp$
          legacyPasswordType: 'wordpress_phpass',
        })
        .where(eq(users.id, user.id));

      restored++;

      if (restored % 100 === 0) {
        console.log(`   Processados: ${restored}...`);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${customer.email}:`, error);
      errors++;
    }
  }

  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESULTADO:');
  console.log(`   ✅ Restaurados: ${restored}`);
  console.log(`   ⚠️  Usuário não encontrado: ${notFound}`);
  console.log(`   ⏭️  Pulados (sem hash válido): ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('🎉 SENHAS RESTAURADAS!');
  console.log();
  console.log('💡 PRÓXIMOS PASSOS:');
  console.log('   1. Os usuários têm os hashes originais do WordPress');
  console.log('   2. O campo password está limpo (null)');
  console.log('   3. No próximo login, a senha será validada e migrada');
  console.log('   4. Um hash bcrypt novo será gerado automaticamente');
}

restoreWordPressPasswords()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
