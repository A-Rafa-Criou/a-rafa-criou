import { db } from '../src/lib/db/index.js';
import { products, downloadPermissions } from '../src/lib/db/schema.js';

async function verify() {
  const produtosCount = await db.select().from(products);
  const permissoesCount = await db.select().from(downloadPermissions);

  console.log('\n📊 RESUMO DA IMPORTAÇÃO\n');
  console.log('✅ Produtos importados:', produtosCount.length);
  console.log('✅ Permissões de download:', permissoesCount.length);

  if (produtosCount.length > 0) {
    console.log('\n📦 Amostra de produtos:');
    produtosCount.slice(0, 5).forEach(p => {
      console.log(`   - ${p.name} (R$ ${p.price})`);
    });
  }

  console.log('\n🎯 PRÓXIMO PASSO:');
  if (produtosCount.length > 0) {
    console.log('   npx tsx scripts/migration/create-download-permissions.ts');
  } else {
    console.log('   ❌ Nenhum produto importado! Verifique os erros acima.');
  }

  process.exit(0);
}

verify().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
