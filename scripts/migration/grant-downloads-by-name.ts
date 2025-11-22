/**
 * Script: Liberar Downloads por Nome do Produto
 * 
 * Usa um CSV exportado do WordPress com:
 * - email_cliente
 * - produto_nome (ou produto_slug)
 * - vezes_comprado
 * - ultima_compra
 * 
 * Mapeia produtos por nome/slug (não precisa do ID do WordPress)
 * e cria permissões de download para os clientes.
 */

import { db } from '@/lib/db';
import { users, products, orders, orderItems } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import fs from 'fs';
import Papa from 'papaparse';

interface CustomerProductRow {
  email_cliente?: string;
  cliente_email?: string; // Alternativa
  produto_nome: string;
  produto_slug?: string;
  vezes_comprado?: string;
  ultima_compra?: string;
  data_pedido?: string; // Alternativa
}

async function grantDownloadsByName(csvPath: string) {
  console.log('📂 Lendo CSV:', csvPath);

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const { data: rows } = Papa.parse<CustomerProductRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`📊 Total de linhas: ${rows.length}`);

  let processed = 0;
  let granted = 0;
  let notFound = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      processed++;
      
      // Aceitar ambos os formatos de coluna
      const email = (row.email_cliente || row.cliente_email)?.trim().toLowerCase();
      const productName = row.produto_nome?.trim();
      const productSlug = row.produto_slug?.trim();
      const lastPurchase = row.ultima_compra || row.data_pedido;

      if (!email || !productName) {
        console.warn(`⚠️  Linha ${processed}: Email ou produto vazio`);
        continue;
      }

      // 1. Buscar usuário por email
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        console.warn(`⚠️  Usuário não encontrado: ${email}`);
        notFound++;
        continue;
      }

      // 2. Buscar produto por nome ou slug
      let product;
      
      // Tentar por slug primeiro (mais preciso)
      if (productSlug) {
        [product] = await db
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(eq(products.slug, productSlug))
          .limit(1);
      }

      // Se não achou por slug, tentar por nome (case insensitive)
      if (!product) {
        [product] = await db
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(sql`LOWER(${products.name}) = LOWER(${productName})`)
          .limit(1);
      }

      // Se ainda não achou, tentar busca parcial
      if (!product) {
        [product] = await db
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(sql`LOWER(${products.name}) LIKE LOWER(${`%${productName}%`})`)
          .limit(1);
      }

      if (!product) {
        console.warn(`⚠️  Produto não encontrado: "${productName}" (slug: ${productSlug})`);
        notFound++;
        continue;
      }

      // 3. Verificar se já tem um pedido com esse produto
      const [existingOrder] = await db
        .select({ id: orders.id })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.userId, user.id),
            eq(orderItems.productId, product.id),
            eq(orders.status, 'paid')
          )
        )
        .limit(1);

      if (existingOrder) {
        console.log(`✅ ${email} já tem acesso a "${product.name}"`);
        granted++;
        continue;
      }

      // 4. Criar pedido "migrado" do WordPress
      const orderId = crypto.randomUUID();
      const orderItemId = crypto.randomUUID();

      await db.insert(orders).values({
        id: orderId,
        userId: user.id,
        email: user.email,
        status: 'paid',
        paymentProvider: 'wordpress_migrated',
        subtotal: '0.00',
        total: '0.00',
        createdAt: lastPurchase ? new Date(lastPurchase) : new Date(),
        updatedAt: new Date(),
      });

      await db.insert(orderItems).values({
        id: orderItemId,
        orderId: orderId,
        productId: product.id,
        variationId: null,
        name: product.name, // ✅ Campo obrigatório
        price: '0.00', // ✅ Campo obrigatório
        quantity: 1,
        total: '0.00', // ✅ Campo obrigatório
      });

      console.log(`✅ Liberado: ${email} → "${product.name}"`);
      granted++;
    } catch (error) {
      console.error(`❌ Erro na linha ${processed}:`, error);
      errors++;
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`✅ Processadas: ${processed} linhas`);
  console.log(`✅ Liberações criadas: ${granted}`);
  console.log(`⚠️  Não encontrados: ${notFound}`);
  console.log(`❌ Erros: ${errors}`);
}

// Executar
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('❌ Uso: npx tsx scripts/migration/grant-downloads-by-name.ts <caminho-do-csv>');
  console.error('Exemplo: npx tsx scripts/migration/grant-downloads-by-name.ts data/migration/customer-products.csv');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Arquivo não encontrado: ${csvPath}`);
  process.exit(1);
}

grantDownloadsByName(csvPath)
  .then(() => {
    console.log('✅ Concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
