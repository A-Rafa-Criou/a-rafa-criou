import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function applyNewIndexes() {
  console.log('🚀 Aplicando NOVOS índices críticos de performance...\n');

  const indexes = [
    // Produtos
    `CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = true`,
    `CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active) WHERE is_active = true`,
    `CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`,

    // Variações
    `CREATE INDEX IF NOT EXISTS idx_variations_product_id ON product_variations(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_variations_product_active ON product_variations(product_id, is_active) WHERE is_active = true`,

    // Imagens
    `CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_images_product_main ON product_images(product_id, is_main) WHERE is_main = true`,
    `CREATE INDEX IF NOT EXISTS idx_images_variation_id ON product_images(variation_id)`,

    // Files
    `CREATE INDEX IF NOT EXISTS idx_files_product_id ON files(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_files_variation_id ON files(variation_id)`,

    // Categorias
    `CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active) WHERE is_active = true`,
    `CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`,

    // Sessions
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires)`,

    // Cart
    `CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cart_session_id ON cart(session_id)`,
  ];

  let created = 0;
  let existing = 0;

  for (const index of indexes) {
    try {
      await db.execute(sql.raw(index));
      const indexName = index.split('idx_')[1]?.split(' ')[0] || 'índice';
      console.log(`✅ ${indexName}`);
      created++;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        existing++;
      } else {
        console.error(`❌ Erro ao criar índice: ${error}`);
      }
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ Novos índices criados: ${created}`);
  console.log(`   ⏭️  Já existentes: ${existing}`);
  console.log(`\n🎉 Total de ${created + existing} índices aplicados!`);
  console.log(`\n💡 Dica: Execute ANALYZE no PostgreSQL para atualizar estatísticas.`);
}

applyNewIndexes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
