/**
 * Script de Importação de Clientes do WordPress
 * 
 * Este script importa clientes do WordPress para o Next.js,
 * mantendo as senhas phpass originais para conversão posterior.
 * 
 * Uso:
 *   npx tsx scripts/migration/import-customers.ts
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

interface WordPressUser {
  user_id?: string;
  email: string;
  password_hash?: string | null; // phpass hash do WordPress (NULL para convidados)
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  created_at: string;
}

async function importCustomers(csvPath: string = 'data/test/all-customers.csv') {
  console.log('🚀 Iniciando importação de clientes...\n');
  console.log(`📂 Arquivo: ${csvPath}\n`);

  // Verificar se arquivo existe
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo não encontrado: ${csvPath}`);
    console.log('\n💡 Dica: Exporte os clientes do WordPress primeiro!');
    console.log('   Consulte: scripts/migration/export-all-customers.sql\n');
    process.exit(1);
  }

  // Ler CSV
  let csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Remover BOM se existir
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.substring(1);
    console.log('✅ BOM removido do arquivo CSV\n');
  }
  
  const records: WordPressUser[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`📊 Total de clientes no CSV: ${records.length}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: { email: string; error: string }[] = [];

  for (const [index, customer] of records.entries()) {
    try {
      // Validar dados obrigatórios
      if (!customer.email) {
        console.log(`⏭️  [${index + 1}/${records.length}] Email vazio - pulando`);
        skipped++;
        continue;
      }

      // Verificar se já existe
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, customer.email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  [${index + 1}/${records.length}] Já existe: ${customer.email}`);
        skipped++;
        continue;
      }

      // Gerar ID único
      const userId = crypto.randomUUID();

      // Preparar hash de senha
      const hasPasswordHash = customer.password_hash && customer.password_hash.trim();
      const isGuest = !hasPasswordHash;

      // Inserir cliente
      await db.insert(users).values({
        id: userId,
        email: customer.email.toLowerCase().trim(),
        name: customer.name || 'Cliente',
        phone: customer.phone || null,
        password: hasPasswordHash || null, // Hash phpass do WP (NULL para convidados)
        legacyPasswordHash: hasPasswordHash || null, // Backup do hash original
        legacyPasswordType: hasPasswordHash ? 'wordpress_phpass' : null, // Marcador para conversão
        role: 'customer',
        emailVerified: isGuest ? null : null, // Convidados não têm email verificado
        image: null,
        resetToken: null,
        resetTokenExpiry: null,
        createdAt: customer.created_at ? new Date(customer.created_at) : new Date(),
        updatedAt: new Date(),
      });

      const userType = isGuest ? '👤 Convidado' : '🔐 Registrado';
      console.log(`✅ [${index + 1}/${records.length}] ${userType}: ${customer.email}`);
      success++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${index + 1}/${records.length}] Erro: ${customer.email}`, errorMessage);
      errors++;
      errorList.push({
        email: customer.email,
        error: errorMessage,
      });
    }
  }

  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📈 RELATÓRIO DE IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`Total no CSV:     ${records.length}`);
  console.log(`✅ Importados:    ${success} (${Math.round((success / records.length) * 100)}%)`);
  console.log(`⏭️  Pulados:       ${skipped} (${Math.round((skipped / records.length) * 100)}%)`);
  console.log(`❌ Erros:         ${errors} (${Math.round((errors / records.length) * 100)}%)`);
  console.log('='.repeat(60));

  if (errorList.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    errorList.forEach(({ email, error }) => {
      console.log(`   • ${email}: ${error}`);
    });
  }

  if (success > 0) {
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar dados no Drizzle Studio: npm run db:studio');
    console.log('   2. Re-importar pedidos (vai pegar os 254 que falharam):');
    console.log('      npx tsx scripts/migration/import-orders.ts data/test/pedidos-completo.csv data/test/order-items-completo.csv');
  }

  console.log('\n✨ Importação concluída!\n');
}

// Executar
const csvPath = process.argv[2] || 'data/test/all-customers.csv';
importCustomers(csvPath).catch(console.error);
