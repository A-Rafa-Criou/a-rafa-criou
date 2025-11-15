/**
 * Script de Backup Completo - Antes da Migration
 * 
 * Faz backup de:
 * - Produtos
 * - Variações de produtos
 * - Imagens de produtos
 * - Atributos e valores
 * - Relações variação-atributos
 * - Traduções (i18n)
 * 
 * Execução: npx tsx scripts/backup-before-migration.ts
 */

import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const BACKUP_FILE = path.join(BACKUP_DIR, `backup-${TIMESTAMP}.json`);

interface BackupData {
  timestamp: string;
  products: any[];
  productVariations: any[];
  productImages: any[];
  variationAttributeValues: any[];
  productI18n: any[];
  productVariationI18n: any[];
  attributes: any[];
  attributeValues: any[];
  stats: {
    totalProducts: number;
    totalVariations: number;
    totalImages: number;
    totalAttributes: number;
  };
}

async function createBackup() {
  console.log('🔄 Iniciando backup completo do banco de dados...\n');

  try {
    // Criar diretório de backup se não existir
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('✅ Diretório de backup criado:', BACKUP_DIR);
    }

    console.log('📦 Coletando dados...\n');

    // 1. Produtos (usando SQL direto para evitar erro de coluna inexistente)
    console.log('  → Produtos...');
    const allProducts = await db.execute(
      sql`SELECT id, name, slug, description, short_description, category_id, is_active, is_featured, seo_title, seo_description, created_at, updated_at FROM products`
    );
    console.log(`    ✓ ${allProducts.length} produtos`);

    // 2. Variações
    console.log('  → Variações...');
    const allVariations = await db.execute(sql`SELECT * FROM product_variations`);
    console.log(`    ✓ ${allVariations.length} variações`);

    // 3. Imagens
    console.log('  → Imagens...');
    const allImages = await db.execute(sql`SELECT * FROM product_images`);
    console.log(`    ✓ ${allImages.length} imagens`);

    // 4. Relações variação-atributos
    console.log('  → Relações variação-atributos...');
    const allVariationAttrs = await db.execute(sql`SELECT * FROM variation_attribute_values`);
    console.log(`    ✓ ${allVariationAttrs.length} relações`);

    // 5. Traduções de produtos
    console.log('  → Traduções de produtos...');
    const allProductI18n = await db.execute(sql`SELECT * FROM product_i18n`);
    console.log(`    ✓ ${allProductI18n.length} traduções de produtos`);

    // 6. Traduções de variações
    console.log('  → Traduções de variações...');
    const allVariationI18n = await db.execute(sql`SELECT * FROM product_variation_i18n`);
    console.log(`    ✓ ${allVariationI18n.length} traduções de variações`);

    // 7. Atributos
    console.log('  → Atributos...');
    const allAttributes = await db.execute(sql`SELECT * FROM attributes`);
    console.log(`    ✓ ${allAttributes.length} atributos`);

    // 8. Valores de atributos
    console.log('  → Valores de atributos...');
    const allAttributeValues = await db.execute(sql`SELECT * FROM attribute_values`);
    console.log(`    ✓ ${allAttributeValues.length} valores de atributos`);

    // Criar objeto de backup
    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      products: Array.from(allProducts),
      productVariations: Array.from(allVariations),
      productImages: Array.from(allImages),
      variationAttributeValues: Array.from(allVariationAttrs),
      productI18n: Array.from(allProductI18n),
      productVariationI18n: Array.from(allVariationI18n),
      attributes: Array.from(allAttributes),
      attributeValues: Array.from(allAttributeValues),
      stats: {
        totalProducts: allProducts.length,
        totalVariations: allVariations.length,
        totalImages: allImages.length,
        totalAttributes: allAttributes.length,
      },
    };

    // Salvar backup em JSON
    console.log('\n💾 Salvando backup...');
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2), 'utf-8');

    // Criar também um arquivo de resumo legível
    const summaryFile = path.join(BACKUP_DIR, `backup-${TIMESTAMP}-resumo.txt`);
    const summary = `
╔════════════════════════════════════════════════════════════╗
║           BACKUP COMPLETO - PRODUTOS & VARIAÇÕES           ║
╠════════════════════════════════════════════════════════════╣
║ Data/Hora: ${new Date().toLocaleString('pt-BR')}                    ║
║ Arquivo: backup-${TIMESTAMP}.json                          ║
╠════════════════════════════════════════════════════════════╣
║ ESTATÍSTICAS:                                              ║
║                                                            ║
║ → Produtos................................ ${String(backupData.stats.totalProducts).padStart(4)} ║
║ → Variações............................... ${String(backupData.stats.totalVariations).padStart(4)} ║
║ → Imagens de produtos..................... ${String(backupData.stats.totalImages).padStart(4)} ║
║ → Relações variação-atributos............. ${String(backupData.variationAttributeValues.length).padStart(4)} ║
║ → Traduções de produtos................... ${String(backupData.productI18n.length).padStart(4)} ║
║ → Traduções de variações.................. ${String(backupData.productVariationI18n.length).padStart(4)} ║
║ → Atributos............................... ${String(backupData.stats.totalAttributes).padStart(4)} ║
║ → Valores de atributos.................... ${String(backupData.attributeValues.length).padStart(4)} ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║ PRODUTOS SALVOS:                                           ║
║                                                            ║
${backupData.products.map((p: any, i: number) => `║ ${String(i + 1).padStart(3)}. ${(p.name || 'Sem nome').slice(0, 48).padEnd(48)} ║`).join('\n')}
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📍 LOCAL DO BACKUP:
${BACKUP_FILE}

🔄 COMO RESTAURAR (se necessário):
1. Abra o arquivo backup-${TIMESTAMP}.json
2. Use o script de restore (se criado) ou importe manualmente
3. Execute: npx tsx scripts/restore-backup.ts backup-${TIMESTAMP}.json

⚠️  IMPORTANTE:
- NÃO DELETE este arquivo até confirmar que a migration funcionou
- Guarde este backup em local seguro
- Teste a aplicação após a migration antes de deletar o backup

✅ Backup concluído com sucesso!
`;

    fs.writeFileSync(summaryFile, summary, 'utf-8');

    // Exibir resumo no console
    console.log('\n' + '═'.repeat(62));
    console.log('✅ BACKUP CONCLUÍDO COM SUCESSO!');
    console.log('═'.repeat(62));
    console.log(`\n📍 Arquivo de backup: ${BACKUP_FILE}`);
    console.log(`📄 Resumo legível: ${summaryFile}`);
    console.log(`📊 Tamanho: ${(fs.statSync(BACKUP_FILE).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('\n📦 Dados salvos:');
    console.log(`   • ${backupData.stats.totalProducts} produtos`);
    console.log(`   • ${backupData.stats.totalVariations} variações`);
    console.log(`   • ${backupData.stats.totalImages} imagens`);
    console.log(`   • ${backupData.variationAttributeValues.length} relações de atributos`);
    console.log(`   • ${backupData.productI18n.length} traduções de produtos`);
    console.log(`   • ${backupData.productVariationI18n.length} traduções de variações`);
    console.log('\n' + '═'.repeat(62));
    console.log('🔐 Seus dados estão SEGUROS!');
    console.log('🚀 Agora você pode executar: npm run db:push');
    console.log('═'.repeat(62) + '\n');

  } catch (error) {
    console.error('\n❌ ERRO ao criar backup:', error);
    console.error('\n⚠️  NÃO EXECUTE A MIGRATION até resolver este erro!\n');
    process.exit(1);
  }
}

// Executar backup
createBackup().then(() => {
  console.log('✅ Script finalizado.');
  process.exit(0);
});
