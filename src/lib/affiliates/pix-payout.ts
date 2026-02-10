/**
 * Sistema de Pagamentos PIX Automáticos para Afiliados
 *
 * Alternativa ao Stripe Connect - Pagamentos diretos via PIX
 * Usa Mercado Pago (já integrado no projeto)
 *
 * Data: 04/02/2026
 */

import { db } from '@/lib/db';
import { affiliates, affiliateCommissions, financialTransactions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
// ⚠️ SEM VALOR MÍNIMO - Pagamento instantâneo para qualquer comissão > R$ 0,01
// Split payment automático: afiliado recebe imediatamente
const MINIMUM_PAYOUT = 0.01; // R$ 0,01 - praticamente sem mínimo

interface PayoutResult {
  affiliateId: string;
  name: string;
  amount: number;
  status: 'success' | 'error';
  transferId?: string;
  error?: string;
}

/**
 * Processa pagamentos PIX automáticos para afiliados
 * Chamado por cron job diário (10h da manhã)
 *
 * Busca afiliados com comissões aprovadas >= R$ 50
 * Faz transferência PIX via Mercado Pago
 * Atualiza status das comissões
 * Envia email de confirmação
 */
export async function processPendingPayouts(): Promise<PayoutResult[]> {
  console.log('[PIX Payout] 🚀 Iniciando processamento de pagamentos...');

  if (!MERCADOPAGO_ACCESS_TOKEN) {
    console.error('[PIX Payout] ❌ MERCADOPAGO_ACCESS_TOKEN não configurado');
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  // 1. Buscar afiliados com comissões aprovadas (qualquer valor > R$ 0,01)
  // ⚠️ IMPORTANTE: Pagamento INSTANTÂNEO, sem acúmulo
  const affiliatesWithCommissions = await db
    .select({
      affiliateId: affiliateCommissions.affiliateId,
      totalCommission: sql<number>`SUM(${affiliateCommissions.commissionAmount})`,
      pixKey: affiliates.pixKey,
      name: affiliates.name,
      email: affiliates.email,
      minimumPayout: affiliates.minimumPayout,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliates.id, affiliateCommissions.affiliateId))
    .where(
      and(
        eq(affiliateCommissions.status, 'approved'),
        eq(affiliates.pixAutoTransferEnabled, true),
        sql`${affiliates.pixKey} IS NOT NULL AND ${affiliates.pixKey} != ''`
      )
    )
    .groupBy(
      affiliateCommissions.affiliateId,
      affiliates.pixKey,
      affiliates.name,
      affiliates.email,
      affiliates.minimumPayout
    )
    .having(
      // Paga qualquer valor >= R$ 0,01 (split instantâneo)
      sql`SUM(${affiliateCommissions.commissionAmount}) >= ${MINIMUM_PAYOUT}`
    );

  console.log(
    `[PIX Payout] 📊 ${affiliatesWithCommissions.length} afiliados com pagamentos pendentes`
  );

  if (affiliatesWithCommissions.length === 0) {
    console.log('[PIX Payout] ℹ️ Nenhum pagamento a processar');
    return [];
  }

  const results: PayoutResult[] = [];

  for (const affiliate of affiliatesWithCommissions) {
    try {
      console.log(
        `[PIX Payout] 💸 Processando pagamento: ${affiliate.name} - R$ ${affiliate.totalCommission.toFixed(2)}`
      );

      // 2. Fazer transferência PIX via Mercado Pago
      const transferResult = await transferPixMercadoPago(
        affiliate.pixKey!,
        affiliate.totalCommission,
        affiliate.affiliateId,
        affiliate.name
      );

      // 3. Atualizar status das comissões para 'paid'
      await db
        .update(affiliateCommissions)
        .set({
          status: 'paid',
          paidAt: new Date(),
          pixTransferId: transferResult.transferId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(affiliateCommissions.affiliateId, affiliate.affiliateId),
            eq(affiliateCommissions.status, 'approved')
          )
        );

      // 4. Atualizar totais do afiliado
      await db
        .update(affiliates)
        .set({
          paidCommission: sql`COALESCE(${affiliates.paidCommission}, 0) + ${affiliate.totalCommission}`,
          pendingCommission: sql`GREATEST(COALESCE(${affiliates.pendingCommission}, 0) - ${affiliate.totalCommission}, 0)`,
          lastPayoutAt: new Date(),
          totalPaidOut: sql`COALESCE(${affiliates.totalPaidOut}, 0) + ${affiliate.totalCommission}`,
          updatedAt: new Date(),
        })
        .where(eq(affiliates.id, affiliate.affiliateId));

      // 5. Criar registro na tabela de transações financeiras
      try {
        await db.insert(financialTransactions).values({
          date: new Date(),
          type: 'EXPENSE', // Saída de dinheiro
          scope: 'STORE', // Relacionado à loja
          description: `Pagamento PIX automático - ${affiliate.name}`,
          paymentMethod: 'PIX',
          amount: affiliate.totalCommission.toString(),
          paid: true,
          paidAt: new Date(),
          affiliateCommissionId: null, // Múltiplas comissões
          notes: JSON.stringify({
            affiliateId: affiliate.affiliateId,
            pixKey: affiliate.pixKey,
            transferId: transferResult.transferId,
            provider: 'mercadopago',
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (txError) {
        // Não bloquear se houver erro
        console.log(
          '[PIX Payout] ℹ️ Não foi possível criar registro em financialTransactions:',
          txError
        );
      }

      // 6. Enviar email de confirmação
      await sendPayoutConfirmationEmail(
        affiliate.email,
        affiliate.name,
        affiliate.totalCommission,
        transferResult.transferId
      );

      results.push({
        affiliateId: affiliate.affiliateId,
        name: affiliate.name,
        amount: affiliate.totalCommission,
        status: 'success',
        transferId: transferResult.transferId,
      });

      console.log(
        `[PIX Payout] ✅ R$ ${affiliate.totalCommission.toFixed(2)} pago para ${affiliate.name} (${transferResult.transferId})`
      );
    } catch (error) {
      console.error(`[PIX Payout] ❌ Erro ao pagar ${affiliate.name}:`, error);

      // Incrementar contador de tentativas
      await db
        .update(affiliateCommissions)
        .set({
          transferError: error instanceof Error ? error.message : 'Erro desconhecido',
          transferAttemptCount: sql`COALESCE(${affiliateCommissions.transferAttemptCount}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(affiliateCommissions.affiliateId, affiliate.affiliateId),
            eq(affiliateCommissions.status, 'approved')
          )
        );

      results.push({
        affiliateId: affiliate.affiliateId,
        name: affiliate.name,
        amount: affiliate.totalCommission,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  console.log('[PIX Payout] ✅ Processamento concluído');
  console.log(
    `[PIX Payout] 📊 Sucesso: ${results.filter(r => r.status === 'success').length} | Erros: ${results.filter(r => r.status === 'error').length}`
  );

  return results;
}

/**
 * Transfere PIX via Mercado Pago
 *
 * IMPORTANTE: Esta implementação é um EXEMPLO
 * Você precisará adaptar para a API real do Mercado Pago
 *
 * Opções:
 * 1. Transferência entre contas MP (grátis)
 * 2. Transferência direta para PIX (via API específica)
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/mp-money/transfer-money
 */
async function transferPixMercadoPago(
  pixKey: string,
  amount: number,
  affiliateId: string,
  affiliateName: string
): Promise<{ transferId: string; status: string }> {
  const idempotencyKey = `payout-${affiliateId}-${Date.now()}`;

  console.log(`[PIX Payout] 🔄 Iniciando transferência PIX: ${pixKey} - R$ ${amount.toFixed(2)}`);

  /**
   * OPÇÃO 1: Transferência via API de Money Transfer do Mercado Pago
   * Requer que o afiliado tenha conta no Mercado Pago
   *
   * API: POST /v1/money_transfers
   * Docs: https://www.mercadopago.com.br/developers/pt/reference/money_transfers/_money_transfers/post
   */

  const response = await fetch('https://api.mercadopago.com/v1/money_transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      amount: amount,
      description: `Comissão Afiliado - ${affiliateName}`,
      // Aqui você precisa do user_id do Mercado Pago do afiliado
      // OU usar API de PIX direto (depende da conta MP da plataforma)

      // EXEMPLO para transferência:
      // receiver_id: "afiliado_mp_user_id",

      // OU para PIX direto (se disponível):
      pix_key: pixKey,
      pix_key_type: detectPixKeyType(pixKey),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Resposta inválida' }));
    console.error('[PIX Payout] ❌ Erro na API do Mercado Pago:', errorData);
    const errorMsg = typeof errorData === 'object' && errorData !== null && 'message' in errorData
      ? String(errorData.message)
      : JSON.stringify(errorData);
    throw new Error(`Erro ao transferir PIX: ${errorMsg}`);
  }

  const data = await response.json();

  console.log(`[PIX Payout] ✅ Transferência criada: ${data.id} (status: ${data.status})`);

  return {
    transferId: data.id.toString(),
    status: data.status,
  };
}

/**
 * Detecta tipo da chave PIX
 */
function detectPixKeyType(pixKey: string): string {
  // CPF: 11 dígitos numéricos
  if (/^\d{11}$/.test(pixKey)) return 'cpf';

  // CNPJ: 14 dígitos numéricos
  if (/^\d{14}$/.test(pixKey)) return 'cnpj';

  // Email
  if (pixKey.includes('@')) return 'email';

  // Telefone: +55...
  if (/^\+55/.test(pixKey)) return 'phone';

  // Chave aleatória (UUID)
  return 'random';
}

/**
 * Envia email de confirmação de pagamento
 */
async function sendPayoutConfirmationEmail(
  email: string,
  name: string,
  amount: number,
  transferId: string
): Promise<void> {
  try {
    // Usar sistema de email existente (Resend)
    const { sendEmail } = await import('@/lib/email');

    const firstName = name.split(' ')[0];

    await sendEmail({
      to: email,
      subject: '💰 Comissão Paga via PIX - A Rafa Criou',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); color: #000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .amount { font-size: 32px; font-weight: bold; color: #10b981; margin: 20px 0; }
            .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px; }
            .code { background: #f1f5f9; padding: 8px 12px; border-radius: 4px; font-family: monospace; color: #475569; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Pagamento Realizado!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${firstName}</strong>!</p>
              
              <p>Sua comissão foi paga via <strong>PIX</strong>! 💸</p>
              
              <div style="text-align: center;">
                <div class="amount">R$ ${amount.toFixed(2)}</div>
              </div>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>📋 Detalhes da Transferência</strong></p>
                <p style="margin: 10px 0 0;">ID: <span class="code">${transferId}</span></p>
              </div>
              
              <p>O valor deve aparecer na sua conta em <strong>instantes</strong>! ⚡</p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p><strong>Continue promovendo nossos produtos e ganhe mais!</strong></p>
              
              <p style="margin-bottom: 0;">Qualquer dúvida, estamos à disposição.</p>
            </div>
            <div class="footer">
              <p><strong>A Rafa Criou</strong></p>
              <p>Programa de Afiliados</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[PIX Payout] 📧 Email enviado para ${email}`);
  } catch (error) {
    console.error(`[PIX Payout] ⚠️ Erro ao enviar email para ${email}:`, error);
    // Não bloquear o processo se email falhar
  }
}

/**
 * Processa um pagamento manual (chamado pelo admin)
 */
export async function processManualPayout(
  affiliateId: string,
  amount: number,
  pixKey: string,
  notes?: string
): Promise<{ success: boolean; transferId?: string; error?: string }> {
  try {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate) {
      return { success: false, error: 'Afiliado não encontrado' };
    }

    const transferResult = await transferPixMercadoPago(
      pixKey,
      amount,
      affiliateId,
      affiliate.name
    );

    // Atualizar totais
    await db
      .update(affiliates)
      .set({
        paidCommission: sql`COALESCE(${affiliates.paidCommission}, 0) + ${amount}`,
        pendingCommission: sql`GREATEST(COALESCE(${affiliates.pendingCommission}, 0) - ${amount}, 0)`,
        lastPayoutAt: new Date(),
        totalPaidOut: sql`COALESCE(${affiliates.totalPaidOut}, 0) + ${amount}`,
        notes: notes
          ? sql`CONCAT(COALESCE(${affiliates.notes}, ''), '\n', ${notes})`
          : affiliates.notes,
      })
      .where(eq(affiliates.id, affiliateId));

    return { success: true, transferId: transferResult.transferId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
