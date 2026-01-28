/**
 * Processamento de Acesso a Arquivos para Afiliados com Licença Comercial
 *
 * Automaticamente concede acesso temporário aos arquivos após venda
 * O número de dias é configurável no painel admin (site_settings.commercial_license_access_days)
 */

import { db } from '@/lib/db';
import {
  affiliateFileAccess,
  affiliates,
  orders,
  orderItems,
  siteSettings,
  products,
  productVariations,
  files,
  users,
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { sendAffiliateSaleNotificationEmail } from '@/lib/email/affiliates';

/**
 * Concede acesso temporário aos arquivos para afiliado com licença comercial
 * IMPORTANTE: Funciona para pedidos PAGOS e GRATUITOS (produtos FREE)
 * Afiliados comerciais recebem ACESSO aos arquivos, NÃO comissão
 */
export async function grantFileAccessForOrder(orderId: string) {
  try {
    console.log('='.repeat(60));
    console.log(`🔐 [ACESSO ARQUIVOS] Iniciando para pedido: ${orderId}`);
    console.log('='.repeat(60));

    // Buscar pedido com afiliado
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: {
        id: true,
        affiliateId: true,
        userId: true,
        email: true,
        total: true,
        currency: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      console.log('❌ [ACESSO ARQUIVOS] Pedido não encontrado');
      return;
    }

    if (!order.affiliateId) {
      console.log('❌ [ACESSO ARQUIVOS] Pedido sem afiliado - ignorando');
      return;
    }

    const orderTotal = parseFloat(order.total);
    const isFree = orderTotal === 0;
    console.log(`📊 [ACESSO ARQUIVOS] Pedido: ${order.id}`);
    console.log(
      `💰 [ACESSO ARQUIVOS] Total: ${order.total} ${order.currency} ${isFree ? '(GRATUITO)' : '(PAGO)'}`
    );
    console.log(`📌 [ACESSO ARQUIVOS] Status: ${order.status} / Pagamento: ${order.paymentStatus}`);

    // Verificar se afiliado tem licença comercial
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.id, order.affiliateId),
      columns: {
        id: true,
        affiliateType: true,
        status: true,
        name: true,
        email: true,
      },
    });

    if (!affiliate) {
      console.log('❌ [ACESSO ARQUIVOS] Afiliado não encontrado');
      return;
    }

    console.log(`👤 [ACESSO ARQUIVOS] Afiliado: ${affiliate.name}`);
    console.log(`🏷️  [ACESSO ARQUIVOS] Tipo: ${affiliate.affiliateType}`);
    console.log(`✅ [ACESSO ARQUIVOS] Status: ${affiliate.status}`);

    if (affiliate.affiliateType !== 'commercial_license') {
      console.log('⚠️ [ACESSO ARQUIVOS] Afiliado NÃO tem licença comercial - IGNORANDO');
      console.log(
        '💡 [ACESSO ARQUIVOS] Apenas afiliados com licença comercial recebem acesso a arquivos'
      );
      return;
    }

    if (affiliate.status !== 'active') {
      console.log('⚠️ [ACESSO ARQUIVOS] Afiliado não está ATIVO - IGNORANDO');
      return;
    }

    // ✅ IMPORTANTE: Produtos gratuitos TAMBÉM concedem acesso
    console.log('✅ [ACESSO ARQUIVOS] Afiliado COMERCIAL + ATIVO - prosseguindo...');
    if (isFree) {
      console.log('🎁 [ACESSO ARQUIVOS] PRODUTO GRATUITO - concedendo acesso normalmente');
    }

    // Buscar dados do comprador (usuário)
    let buyerName: string | null = null;
    let buyerPhone: string | null = null;

    if (order.userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, order.userId),
        columns: {
          name: true,
          phone: true,
        },
      });

      if (user) {
        buyerName = user.name;
        buyerPhone = user.phone;
        console.log(`👤 [ACESSO ARQUIVOS] Comprador: ${buyerName || 'N/A'}`);
      }
    } else {
      console.log('⚠️ [ACESSO ARQUIVOS] Pedido sem userId - nome não disponível');
    }

    // Buscar itens do pedido COM VARIAÇÕES
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
      columns: {
        id: true,
        productId: true,
        variationId: true,
        name: true,
        quantity: true,
        price: true,
      },
    });

    if (items.length === 0) {
      console.log('❌ [ACESSO ARQUIVOS] Pedido sem itens - ignorando');
      return;
    }

    console.log(`📦 [ACESSO ARQUIVOS] ${items.length} itens encontrados no pedido`);

    // Buscar configuração de dias de acesso
    const [settings] = await db
      .select({ commercialLicenseAccessDays: siteSettings.commercialLicenseAccessDays })
      .from(siteSettings)
      .limit(1);

    const accessDays = settings?.commercialLicenseAccessDays || 5;
    console.log(`⏰ [ACESSO ARQUIVOS] Dias de acesso configurados: ${accessDays}`);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + accessDays);

    // Processar cada item do pedido
    const accessPromises = items.map(async item => {
      console.log(`\n📦 [ACESSO ARQUIVOS] Processando item: ${item.name}`);
      console.log(`   - Product ID: ${item.productId || 'N/A'}`);
      console.log(`   - Variation ID: ${item.variationId || 'N/A'}`);

      if (!item.productId) {
        console.log('⚠️ [ACESSO ARQUIVOS] Item sem productId - ignorando');
        return null;
      }

      // Buscar produto
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (!product) {
        console.log('❌ [ACESSO ARQUIVOS] Produto não encontrado - ignorando');
        return null;
      }

      // Buscar arquivo - PRIORIZAR VARIAÇÃO se existir
      let fileData: { path: string; name: string } | null = null;

      if (item.variationId) {
        console.log('🔍 [ACESSO ARQUIVOS] Buscando arquivo da variação...');

        // Buscar arquivo da variação específica
        const variationFile = await db.query.files.findFirst({
          where: eq(files.variationId, item.variationId),
        });

        if (variationFile) {
          fileData = {
            path: variationFile.path,
            name: variationFile.name,
          };
          console.log(`✅ [ACESSO ARQUIVOS] Arquivo da variação encontrado: ${variationFile.name}`);
        } else {
          console.log('⚠️ [ACESSO ARQUIVOS] Variação sem arquivo - tentando produto...');
        }
      }

      // Se não achou na variação, buscar no produto
      if (!fileData) {
        console.log('🔍 [ACESSO ARQUIVOS] Buscando arquivo do produto...');

        const productFile = await db.query.files.findFirst({
          where: eq(files.productId, item.productId),
        });

        if (productFile) {
          fileData = {
            path: productFile.path,
            name: productFile.name,
          };
          console.log(`✅ [ACESSO ARQUIVOS] Arquivo do produto encontrado: ${productFile.name}`);
        }
      }

      if (!fileData) {
        console.log('❌ [ACESSO ARQUIVOS] Nenhum arquivo encontrado para este item');
        return null;
      }

      // Verificar se já existe acesso para este produto/variação/pedido
      const existingAccess = await db.query.affiliateFileAccess.findFirst({
        where: and(
          eq(affiliateFileAccess.affiliateId, affiliate.id),
          eq(affiliateFileAccess.productId, product.id),
          eq(affiliateFileAccess.orderId, orderId)
        ),
      });

      if (existingAccess) {
        console.log(`⚠️ [ACESSO ARQUIVOS] Acesso já existe - ignorando`);
        return null;
      }

      // Criar novo acesso
      console.log(
        `✅ [ACESSO ARQUIVOS] Criando acesso até ${expiresAt.toLocaleDateString('pt-BR')}`
      );

      const [access] = await db
        .insert(affiliateFileAccess)
        .values({
          affiliateId: affiliate.id,
          productId: product.id,
          orderId: orderId,
          fileUrl: fileData.path, // Salvar apenas path do R2
          expiresAt,
          buyerEmail: order.email,
          buyerName: buyerName, // Nome do usuário
          buyerPhone: buyerPhone, // Telefone do usuário
          viewCount: 0,
          printCount: 0,
        })
        .returning();

      console.log(`✅ [ACESSO ARQUIVOS] Acesso concedido com sucesso!`);
      return { access, productName: item.name };
    });

    const createdAccesses = (await Promise.all(accessPromises)).filter(Boolean);

    console.log(`📁 Total de acessos criados: ${createdAccesses.length}`);

    // Enviar email de notificação de VENDA (não de acesso)
    if (createdAccesses.length > 0) {
      const productNames = createdAccesses.map(a => a!.productName);
      const orderTotal = parseFloat(order.total);

      console.log(`📧 Enviando notificação de VENDA para ${affiliate.email}...`);

      sendAffiliateSaleNotificationEmail({
        to: affiliate.email,
        name: affiliate.name,
        affiliateType: 'commercial_license',
        productNames,
        orderTotal,
        currency: order.currency,
        buyerEmail: order.email,
      }).catch(err => {
        console.error('❌ Erro ao enviar email de notificação de venda:', err);
      });
    }

    return createdAccesses.length;
  } catch (error) {
    console.error('❌ Erro ao conceder acesso a arquivos:', error);
    throw error;
  }
}
