/**
 * Script para popular a tabela url_map com redirecionamentos comuns do WordPress para Next.js
 *
 * Este script cria redirecionamentos 301 para URLs antigas do WooCommerce que precisam
 * ser redirecionadas para as novas URLs do Next.js
 *
 * Uso: npx tsx scripts/seed-url-redirects.ts
 */

import { db } from '../src/lib/db';
import { urlMap } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

interface UrlRedirect {
  oldUrl: string;
  newUrl: string;
  statusCode?: number;
  isActive?: boolean;
}

const redirects: UrlRedirect[] = [
  // Páginas WordPress antigas -> Next.js
  { oldUrl: '/produto', newUrl: '/produtos' },
  { oldUrl: '/loja', newUrl: '/produtos' },
  { oldUrl: '/shop', newUrl: '/produtos' },
  { oldUrl: '/minha-conta', newUrl: '/conta' },
  { oldUrl: '/my-account', newUrl: '/conta' },
  { oldUrl: '/carrinho-de-compras', newUrl: '/carrinho' },
  { oldUrl: '/cart', newUrl: '/carrinho' },
  { oldUrl: '/finalizar-compra', newUrl: '/checkout' },
  { oldUrl: '/checkout-2', newUrl: '/checkout' },

  // Páginas informacionais
  { oldUrl: '/sobre-rafaela', newUrl: '/sobre' },
  { oldUrl: '/sobre-nos', newUrl: '/sobre' },
  { oldUrl: '/about', newUrl: '/sobre' },
  { oldUrl: '/contato-2', newUrl: '/contato' },
  { oldUrl: '/fale-conosco', newUrl: '/contato' },
  { oldUrl: '/contact', newUrl: '/contato' },

  // Políticas
  { oldUrl: '/politica-de-privacidade', newUrl: '/privacidade' },
  { oldUrl: '/privacy-policy', newUrl: '/privacidade' },
  { oldUrl: '/termos-de-uso', newUrl: '/termos' },
  { oldUrl: '/terms-of-service', newUrl: '/termos' },
  { oldUrl: '/trocas-devolucoes-e-reembolsos', newUrl: '/politica-de-devolucao' },
  { oldUrl: '/direitos-autorais', newUrl: '/direitos-autorais' },

  // Categorias WordPress -> Next.js
  {
    oldUrl: '/product-category/categorias/lembrancinhas',
    newUrl: '/produtos?categoria=lembrancinhas',
  },
  { oldUrl: '/product-category/categorias/cartas', newUrl: '/produtos?categoria=cartas' },
  { oldUrl: '/product-category/lembrancinhas', newUrl: '/produtos?categoria=lembrancinhas' },
  { oldUrl: '/product-category/cartas', newUrl: '/produtos?categoria=cartas' },
  { oldUrl: '/categoria/lembrancinhas', newUrl: '/produtos?categoria=lembrancinhas' },
  { oldUrl: '/categoria/cartas', newUrl: '/produtos?categoria=cartas' },

  // URLs antigas de produtos (exemplo - adicionar mais conforme necessário)
  { oldUrl: '/produto/abas-para-biblia', newUrl: '/produtos/abas-para-biblia' },
  { oldUrl: '/produto/calendario-de-ima-2025', newUrl: '/produtos/calendario-de-ima-2025' },
  { oldUrl: '/produto/calendario', newUrl: '/produtos/calendario-de-mesa-2025' },

  // Páginas de conta WordPress -> Next.js
  { oldUrl: '/minha-conta/orders', newUrl: '/conta/pedidos' },
  { oldUrl: '/minha-conta/downloads', newUrl: '/conta/pedidos' },
  { oldUrl: '/minha-conta/edit-address', newUrl: '/conta/configuracoes' },
  { oldUrl: '/minha-conta/edit-account', newUrl: '/conta/configuracoes' },
  { oldUrl: '/my-account/orders', newUrl: '/conta/pedidos' },
  { oldUrl: '/my-account/downloads', newUrl: '/conta/pedidos' },

  // Paginação antiga
  { oldUrl: '/page/2', newUrl: '/produtos?pagina=2' },
  { oldUrl: '/page/3', newUrl: '/produtos?pagina=3' },

  // Feeds e arquivos
  { oldUrl: '/feed', newUrl: '/', statusCode: 410 }, // Gone
  { oldUrl: '/comments/feed', newUrl: '/', statusCode: 410 },
  { oldUrl: '/wp-json', newUrl: '/api', statusCode: 410 },

  // WordPress admin (bloquear)
  { oldUrl: '/wp-admin', newUrl: '/', statusCode: 410 },
  { oldUrl: '/wp-login.php', newUrl: '/auth/login' },
  { oldUrl: '/wp-login', newUrl: '/auth/login' },
];

async function seedUrlRedirects() {
  console.log('🚀 Iniciando seed de redirecionamentos URL...\n');

  try {
    let created = 0;
    let skipped = 0;

    for (const redirect of redirects) {
      try {
        // Verificar se já existe
        const existing = await db
          .select()
          .from(urlMap)
          .where(eq(urlMap.oldUrl, redirect.oldUrl))
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`⏭️  Pulado: ${redirect.oldUrl} -> ${redirect.newUrl} (já existe)`);
          skipped++;
          continue;
        }

        // Inserir redirecionamento
        await db.insert(urlMap).values({
          oldUrl: redirect.oldUrl,
          newUrl: redirect.newUrl,
          statusCode: redirect.statusCode || 301,
          isActive: redirect.isActive !== false,
        });

        console.log(
          `✅ Criado: ${redirect.oldUrl} -> ${redirect.newUrl} (${redirect.statusCode || 301})`
        );
        created++;
      } catch (error) {
        console.error(`❌ Erro ao criar redirecionamento ${redirect.oldUrl}:`, error);
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ ${created} redirecionamentos criados`);
    console.log(`   ⏭️  ${skipped} redirecionamentos pulados (já existiam)`);
    console.log(`   📝 Total de ${redirects.length} redirecionamentos processados\n`);

    console.log('✨ Seed de redirecionamentos concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao fazer seed de redirecionamentos:', error);
    process.exit(1);
  }
}

// Executar seed
seedUrlRedirects()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
