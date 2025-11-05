import { db } from '../../src/lib/db/index.js';
import { users } from '../../src/lib/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

interface WordPressHashRecord {
  email: string;
  password_hash: string;
}

async function updatePasswordHashes() {
  console.log('\n🔐 ATUALIZANDO HASHES DE SENHA DO WORDPRESS\n');

  // Ler CSV exportado do WordPress
  const csvPath = 'data/test/wordpress-password-hashes.csv';

  if (!fs.existsSync(csvPath)) {
    console.log('❌ Arquivo não encontrado:', csvPath);
    console.log('\n📝 INSTRUÇÕES:');
    console.log('   1. Abra o Adminer do WordPress');
    console.log('   2. Execute: scripts/migration/export-wordpress-hashes.sql');
    console.log('   3. Exporte como CSV (UTF-8 com BOM)');
    console.log('   4. Salve em: data/test/wordpress-password-hashes.csv');
    console.log('   5. Execute novamente este script\n');
    process.exit(1);
  }

  console.log('📂 Lendo arquivo:', csvPath);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as WordPressHashRecord[];

  console.log(`📊 Total de hashes no CSV: ${records.length}\n`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const [index, record] of records.entries()) {
    const email = record.email?.trim().toLowerCase();
    const hash = record.password_hash?.trim();

    if (!email || !hash) {
      console.log(`⏭️  [${index + 1}/${records.length}] Pulando: dados vazios`);
      errors++;
      continue;
    }

    // NÃO REMOVER O PREFIXO $wp$ - deixar original para testar API do WordPress

    try {
      // Buscar usuário no Next.js
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (user.length === 0) {
        console.log(`⚠️  [${index + 1}/${records.length}] Não encontrado: ${email}`);
        notFound++;
        continue;
      }

      // Determinar tipo de hash
      let hashType = 'wordpress_phpass';
      if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
        hashType = 'wordpress_phpass';
      } else if (hash.startsWith('$2y$') || hash.startsWith('$2b$')) {
        hashType = 'wordpress_phpass'; // bcrypt também veio do WordPress
      }

      // Atualizar hash
      await db
        .update(users)
        .set({
          legacyPasswordHash: hash,
          legacyPasswordType: hashType,
          password: hash.startsWith('$2') ? hash : null, // Se já é bcrypt, usar direto
        })
        .where(eq(users.email, email));

      console.log(
        `✅ [${index + 1}/${records.length}] Atualizado: ${email} (${hash.substring(0, 15)}...)`
      );
      updated++;
    } catch (error) {
      console.log(`❌ [${index + 1}/${records.length}] Erro em ${email}:`, error);
      errors++;
    }
  }

  console.log('\n============================================================');
  console.log('📈 RELATÓRIO DE ATUALIZAÇÃO');
  console.log('============================================================');
  console.log(`Total no CSV:     ${records.length}`);
  console.log(`✅ Atualizados:    ${updated} (${((updated / records.length) * 100).toFixed(1)}%)`);
  console.log(
    `⚠️  Não encontrados: ${notFound} (${((notFound / records.length) * 100).toFixed(1)}%)`
  );
  console.log(`❌ Erros:          ${errors} (${((errors / records.length) * 100).toFixed(1)}%)`);
  console.log('============================================================\n');

  console.log('✨ Atualização concluída!');
  console.log('💡 Agora os usuários podem fazer login com suas senhas antigas do WordPress.\n');

  process.exit(0);
}

updatePasswordHashes().catch(console.error);
