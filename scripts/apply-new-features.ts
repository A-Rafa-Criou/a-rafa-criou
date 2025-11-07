import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function applyNewFeatures() {
  console.log('🚀 Aplicando novas funcionalidades ao banco de dados...\n');

  try {
    // 1. Criar tabela de notificações
    console.log('📧 Criando tabela notifications...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id text NOT NULL,
        type varchar(50) NOT NULL,
        channel varchar(20) NOT NULL,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        subject varchar(255),
        content text NOT NULL,
        metadata text,
        sent_at timestamp,
        read_at timestamp,
        failed_reason text,
        retry_count integer DEFAULT 0,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 2. Criar tabela de configurações de notificações
    console.log('⚙️ Criando tabela notification_settings...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id text NOT NULL UNIQUE,
        order_confirmation_email boolean DEFAULT true NOT NULL,
        order_confirmation_sms boolean DEFAULT false NOT NULL,
        order_confirmation_whatsapp boolean DEFAULT false NOT NULL,
        download_ready_email boolean DEFAULT true NOT NULL,
        download_ready_sms boolean DEFAULT false NOT NULL,
        download_ready_whatsapp boolean DEFAULT false NOT NULL,
        promotional_email boolean DEFAULT true NOT NULL,
        promotional_sms boolean DEFAULT false NOT NULL,
        promotional_whatsapp boolean DEFAULT false NOT NULL,
        security_email boolean DEFAULT true NOT NULL,
        dnd_enabled boolean DEFAULT false NOT NULL,
        dnd_start_hour integer DEFAULT 22,
        dnd_end_hour integer DEFAULT 8,
        whatsapp_number varchar(20),
        sms_number varchar(20),
        web_push_subscription text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT notification_settings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 3. Criar tabela de afiliados
    console.log('💰 Criando tabela affiliates...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS affiliates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id text NOT NULL UNIQUE,
        code varchar(50) NOT NULL UNIQUE,
        name varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        phone varchar(20),
        commission_type varchar(20) DEFAULT 'percent' NOT NULL,
        commission_value numeric(10, 2) NOT NULL,
        pix_key varchar(255),
        bank_name varchar(255),
        bank_account varchar(50),
        status varchar(20) DEFAULT 'active' NOT NULL,
        total_clicks integer DEFAULT 0,
        total_orders integer DEFAULT 0,
        total_revenue numeric(10, 2) DEFAULT '0',
        total_commission numeric(10, 2) DEFAULT '0',
        pending_commission numeric(10, 2) DEFAULT '0',
        paid_commission numeric(10, 2) DEFAULT '0',
        approved_by text,
        approved_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT affiliates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT affiliates_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES users(id)
      );
    `);

    // 4. Criar tabela de links de afiliados
    console.log('🔗 Criando tabela affiliate_links...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS affiliate_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        affiliate_id uuid NOT NULL,
        product_id uuid,
        url text NOT NULL,
        short_code varchar(20) NOT NULL UNIQUE,
        clicks integer DEFAULT 0,
        conversions integer DEFAULT 0,
        revenue numeric(10, 2) DEFAULT '0',
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT affiliate_links_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        CONSTRAINT affiliate_links_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // 5. Criar tabela de comissões de afiliados
    console.log('💵 Criando tabela affiliate_commissions...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        affiliate_id uuid NOT NULL,
        order_id uuid NOT NULL,
        link_id uuid,
        order_total numeric(10, 2) NOT NULL,
        commission_rate numeric(10, 2) NOT NULL,
        commission_amount numeric(10, 2) NOT NULL,
        currency varchar(3) DEFAULT 'BRL' NOT NULL,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        approved_by text,
        approved_at timestamp,
        paid_at timestamp,
        payment_method varchar(50),
        payment_proof text,
        notes text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT affiliate_commissions_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        CONSTRAINT affiliate_commissions_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT affiliate_commissions_link_id_affiliate_links_id_fk FOREIGN KEY (link_id) REFERENCES affiliate_links(id),
        CONSTRAINT affiliate_commissions_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES users(id)
      );
    `);

    // 6. Criar tabela de reviews
    console.log('⭐ Criando tabela product_reviews...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        product_id uuid NOT NULL,
        variation_id uuid,
        user_id text NOT NULL,
        order_id uuid NOT NULL,
        rating integer NOT NULL,
        title varchar(255),
        comment text,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        moderated_by text,
        moderated_at timestamp,
        rejection_reason text,
        helpful_count integer DEFAULT 0,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT product_reviews_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT product_reviews_variation_id_product_variations_id_fk FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE CASCADE,
        CONSTRAINT product_reviews_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT product_reviews_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES orders(id),
        CONSTRAINT product_reviews_moderated_by_users_id_fk FOREIGN KEY (moderated_by) REFERENCES users(id)
      );
    `);

    // 7. Criar tabela de helpful em reviews
    console.log('👍 Criando tabela review_helpful...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS review_helpful (
        review_id uuid NOT NULL,
        user_id text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        PRIMARY KEY (review_id, user_id),
        CONSTRAINT review_helpful_review_id_product_reviews_id_fk FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE,
        CONSTRAINT review_helpful_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 8. Criar tabela de produtos relacionados
    console.log('🔄 Criando tabela related_products...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS related_products (
        product_id uuid NOT NULL,
        related_product_id uuid NOT NULL,
        sort_order integer DEFAULT 0,
        created_at timestamp DEFAULT now() NOT NULL,
        PRIMARY KEY (product_id, related_product_id),
        CONSTRAINT related_products_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT related_products_related_product_id_products_id_fk FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    // 9. Adicionar campos de proteção de PDFs
    console.log('🔒 Adicionando campos de proteção em download_permissions...');
    await db.execute(sql`
      ALTER TABLE download_permissions 
      ADD COLUMN IF NOT EXISTS download_limit integer DEFAULT 3,
      ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS watermark_enabled boolean DEFAULT true NOT NULL,
      ADD COLUMN IF NOT EXISTS watermark_text text;
    `);

    console.log('🔒 Adicionando campos de auditoria em downloads...');
    await db.execute(sql`
      ALTER TABLE downloads 
      ADD COLUMN IF NOT EXISTS watermark_applied boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS watermark_text text,
      ADD COLUMN IF NOT EXISTS fingerprint_hash varchar(64);
    `);

    // 10. Adicionar campo icon em categories
    console.log('🎨 Adicionando campo icon em categories...');
    await db.execute(sql`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS icon varchar(500);
    `);

    console.log('\n✅ Todas as novas funcionalidades foram aplicadas com sucesso!');
    console.log('\n📊 Resumo:');
    console.log('  ✓ Notificações: notifications, notification_settings');
    console.log('  ✓ Afiliação: affiliates, affiliate_links, affiliate_commissions');
    console.log('  ✓ Reviews: product_reviews, review_helpful');
    console.log('  ✓ Produtos Relacionados: related_products');
    console.log('  ✓ Proteção de PDFs: campos em download_permissions e downloads');
    console.log('  ✓ Categorias: campo icon\n');

  } catch (error) {
    console.error('❌ Erro ao aplicar mudanças:', error);
    throw error;
  }
}

applyNewFeatures()
  .then(() => {
    console.log('🎉 Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Processo falhou:', error);
    process.exit(1);
  });
