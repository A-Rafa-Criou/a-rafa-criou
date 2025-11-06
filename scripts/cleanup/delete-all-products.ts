import 'dotenv/config';
import { db } from '../../src/lib/db';
import {
  products,
  productVariations,
  productImages,
  productAttributes,
  variationAttributeValues,
  files,
  productI18n,
  orderItems,
  downloadPermissions,
  downloads,
} from '../../src/lib/db/schema';

/**
 * SCRIPT DE LIMPEZA - EXCLUIR TODOS PRODUTOS E VARIAÇÕES
 * 
 * ⚠️ ATENÇÃO: Este script é DESTRUTIVO e IRREVERSÍVEL!
 * 
 * O que será deletado:
 * - Todos os produtos
 * - Todas as variações
 * - Todas as imagens de produtos/variações
 * - Todos os arquivos anexados
 * - Todas as traduções (i18n)
 * - Todos os atributos de produtos
 * - Todos os pedidos e items de pedidos
 * - Todas as permissões de download
 * - Todos os logs de downloads
 */

async function deleteAllProducts() {
  console.log('🧹 INICIANDO LIMPEZA COMPLETA DO BANCO DE DADOS\n');
  console.log('⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!\n');

  try {
    // 1. Deletar logs de downloads
    console.log('1️⃣  Deletando logs de downloads...');
    const deletedDownloads = await db.delete(downloads);
    console.log(`   ✅ ${deletedDownloads.rowCount || 0} downloads deletados\n`);

    // 2. Deletar permissões de download
    console.log('2️⃣  Deletando permissões de download...');
    const deletedPermissions = await db.delete(downloadPermissions);
    console.log(`   ✅ ${deletedPermissions.rowCount || 0} permissões deletadas\n`);

    // 3. Deletar items de pedidos
    console.log('3️⃣  Deletando items de pedidos...');
    const deletedOrderItems = await db.delete(orderItems);
    console.log(`   ✅ ${deletedOrderItems.rowCount || 0} items deletados\n`);

    // 4. Deletar traduções de produtos
    console.log('4️⃣  Deletando traduções (i18n)...');
    const deletedI18n = await db.delete(productI18n);
    console.log(`   ✅ ${deletedI18n.rowCount || 0} traduções deletadas\n`);

    // 5. Deletar valores de atributos de variações
    console.log('5️⃣  Deletando valores de atributos...');
    const deletedAttrValues = await db.delete(variationAttributeValues);
    console.log(`   ✅ ${deletedAttrValues.rowCount || 0} valores deletados\n`);

    // 6. Deletar atributos de produtos
    console.log('6️⃣  Deletando atributos de produtos...');
    const deletedProdAttrs = await db.delete(productAttributes);
    console.log(`   ✅ ${deletedProdAttrs.rowCount || 0} atributos deletados\n`);

    // 7. Deletando imagens de produtos
    console.log('7️⃣  Deletando imagens de produtos...');
    const deletedProdImages = await db.delete(productImages);
    console.log(`   ✅ ${deletedProdImages.rowCount || 0} imagens deletadas\n`);

    // 8. Deletar arquivos
    console.log('8️⃣  Deletando arquivos...');
    const deletedFiles = await db.delete(files);
    console.log(`   ✅ ${deletedFiles.rowCount || 0} arquivos deletados\n`);

    // 9. Deletar variações
    console.log('9️⃣  Deletando variações de produtos...');
    const deletedVariations = await db.delete(productVariations);
    console.log(`   ✅ ${deletedVariations.rowCount || 0} variações deletadas\n`);

    // 10. Deletar produtos
    console.log('🔟 Deletando produtos...');
    const deletedProducts = await db.delete(products);
    console.log(`   ✅ ${deletedProducts.rowCount || 0} produtos deletados\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📊 RESUMO:');
    console.log(`   • Downloads: ${deletedDownloads.rowCount || 0}`);
    console.log(`   • Permissões: ${deletedPermissions.rowCount || 0}`);
    console.log(`   • Items de pedidos: ${deletedOrderItems.rowCount || 0}`);
    console.log(`   • Traduções: ${deletedI18n.rowCount || 0}`);
    console.log(`   • Valores de atributos: ${deletedAttrValues.rowCount || 0}`);
    console.log(`   • Atributos: ${deletedProdAttrs.rowCount || 0}`);
    console.log(`   • Imagens de produtos: ${deletedProdImages.rowCount || 0}`);
    console.log(`   • Arquivos: ${deletedFiles.rowCount || 0}`);
    console.log(`   • Variações: ${deletedVariations.rowCount || 0}`);
    console.log(`   • Produtos: ${deletedProducts.rowCount || 0}`);
    console.log('\n🎯 Banco de dados limpo! Pronto para novos produtos.\n');

  } catch (error) {
    console.error('\n❌ ERRO durante a limpeza:', error);
    process.exit(1);
  }
}

// Executar
deleteAllProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
