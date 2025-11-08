import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function applyIndexes() {
  console.log('🚀 Aplicando índices de performance...\n');

  const indexes = [
    // Pedidos
    `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC)`,
    
    // Order Items
    `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
    
    // Usuários
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
    `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    
    // Download Permissions
    `CREATE INDEX IF NOT EXISTS idx_download_permissions_user_id ON download_permissions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_download_permissions_product_id ON download_permissions(product_id)`,
    
    // Produtos
    `CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured)`,
    `CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_products_featured_created ON products(is_featured, created_at DESC)`,
  ];

  let created = 0;
  let existing = 0;

  for (const index of indexes) {
    try {
      await db.execute(sql.raw(index));
      if (index.includes('IF NOT EXISTS')) {
        console.log(`✅ ${index.split('idx_')[1]?.split(' ')[0] || 'índice'}`);
        created++;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        existing++;
      } else {
        console.error(`❌ Erro ao criar índice: ${error}`);
      }
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ Criados/verificados: ${created}`);
  console.log(`   ⏭️  Já existentes: ${existing}`);
  console.log(`\n🎉 Índices aplicados com sucesso!`);
}

applyIndexes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
