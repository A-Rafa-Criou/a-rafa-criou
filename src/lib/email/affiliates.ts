/**
 * Sistema de Emails para Afiliados
 *
 * Usando Resend para envio de emails transacionais
 * Templates: boas-vindas, aprovação, notificações
 */

import { Resend } from 'resend';

// Verificar se está configurado
if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY não configurada - emails de afiliados não serão enviados');
}

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key');

// Configurações
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'A Rafa Criou <afiliados@arafacriou.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@arafacriou.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';

/**
 * Email de boas-vindas para afiliado comum (auto-aprovado)
 */
export async function sendAffiliateWelcomeEmail({
  to,
  name,
  code,
}: {
  to: string;
  name: string;
  code: string;
}) {
  try {
    const dashboardUrl = `${APP_URL}/afiliados-da-rafa/dashboard`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Bem-vindo ao Programa de Afiliados! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #000; margin: 0; font-size: 28px;">A Rafa Criou</h1>
              <p style="color: #000; margin: 10px 0 0 0; font-size: 16px;">Programa de Afiliados</p>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #000; margin-top: 0;">Olá ${name}! 👋</h2>
              
              <p>Sua conta de afiliado foi <strong>aprovada automaticamente</strong>!</p>
              
              <div style="background: #F4F4F4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Seu código de afiliado:</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #FD9555; letter-spacing: 2px;">${code}</p>
              </div>
              
              <p>Você já pode começar a divulgar nossos produtos e ganhar <strong>10% de comissão</strong> sobre cada venda!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #FED466; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Acessar Dashboard
                </a>
              </div>
              
              <p>Em breve você receberá um email com os materiais de divulgação.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Boas vendas! 🚀<br>
                Equipe A Rafa Criou
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} A Rafa Criou. Todos os direitos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      return { success: false, error };
    }

    console.log('✅ Email de boas-vindas enviado:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return { success: false, error };
  }
}

/**
 * Email confirmando recebimento da solicitação de licença comercial
 */
export async function sendCommercialLicensePendingEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Solicitação de Licença Comercial Recebida ⏳',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #000; margin: 0; font-size: 28px;">A Rafa Criou</h1>
              <p style="color: #000; margin: 10px 0 0 0; font-size: 16px;">Licença Comercial</p>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #000; margin-top: 0;">Olá ${name}! 👋</h2>
              
              <p>Recebemos sua solicitação para <strong>Licença Comercial</strong>.</p>
              
              <div style="background: #FFF3CD; border-left: 4px solid #FD9555; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;">
                  ⏳ Nossa equipe está analisando seu cadastro e você receberá um retorno em até <strong>48 horas</strong>.
                </p>
              </div>
              
              <p>Assim que aprovado, você terá acesso aos arquivos dos produtos vendidos por até 5 dias após cada venda.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Obrigada pelo interesse! 😊<br>
                Equipe A Rafa Criou
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} A Rafa Criou. Todos os direitos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar email de confirmação:', error);
      return { success: false, error };
    }

    console.log('✅ Email de confirmação enviado:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
    return { success: false, error };
  }
}

/**
 * Email de aprovação de licença comercial
 */
export async function sendCommercialLicenseApprovedEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  try {
    const dashboardUrl = `${APP_URL}/afiliados-da-rafa/dashboard`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Licença Comercial Aprovada! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #000; margin: 0; font-size: 28px;">A Rafa Criou</h1>
              <p style="color: #000; margin: 10px 0 0 0; font-size: 16px;">Licença Comercial</p>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #000; margin-top: 0;">Olá ${name}! 🎉</h2>
              
              <div style="background: #D4EDDA; border-left: 4px solid #28A745; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #155724;">
                  ✅ Sua Licença Comercial foi aprovada!
                </p>
              </div>
              
              <p>Agora você pode:</p>
              <ul>
                <li>Visualizar os arquivos dos produtos vendidos</li>
                <li>Acesso por <strong>até 5 dias</strong> após cada venda</li>
                <li>Dados completos do comprador para contato</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #FED466; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Acessar Dashboard
                </a>
              </div>
              
              <p>Em breve você receberá um email com os materiais de divulgação.</p>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Boas vendas! 🚀<br>
                Equipe A Rafa Criou
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} A Rafa Criou. Todos os direitos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar email de aprovação:', error);
      return { success: false, error };
    }

    console.log('✅ Email de aprovação enviado:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar email de aprovação:', error);
    return { success: false, error };
  }
}

/**
 * Notificação para admin sobre nova solicitação de licença comercial
 */
export async function sendAdminNewAffiliateRequest({
  affiliateName,
  affiliateEmail,
  cpfCnpj,
}: {
  affiliateName: string;
  affiliateEmail: string;
  cpfCnpj?: string;
}) {
  try {
    const adminDashboardUrl = `${APP_URL}/admin/afiliados`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: '🔔 Nova Solicitação de Licença Comercial',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #FD9555; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">Nova Solicitação de Afiliado</h1>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #000; margin-top: 0;">Licença Comercial</h2>
              
              <div style="background: #F4F4F4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Nome:</strong> ${affiliateName}</p>
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${affiliateEmail}</p>
                ${cpfCnpj ? `<p style="margin: 0;"><strong>CPF/CNPJ:</strong> ${cpfCnpj}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminDashboardUrl}" style="display: inline-block; background: #FED466; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Ver no Admin
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                ⚡ Responda em até 48 horas para manter um bom relacionamento com o afiliado.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar notificação ao admin:', error);
      return { success: false, error };
    }

    console.log('✅ Notificação ao admin enviada:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar notificação ao admin:', error);
    return { success: false, error };
  }
}

/**
 * Notificação sobre acesso a arquivo concedido (licença comercial)
 */
export async function sendFileAccessGrantedEmail({
  to,
  name,
  productName,
  expiresAt,
  buyerName,
}: {
  to: string;
  name: string;
  productName: string;
  expiresAt: Date;
  buyerName: string;
}) {
  try {
    const dashboardUrl = `${APP_URL}/afiliados-da-rafa/dashboard`;
    const expiresDate = new Date(expiresAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Novo Acesso a Arquivo Concedido 🎯',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #000; margin: 0; font-size: 28px;">Novo Acesso Concedido!</h1>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #000; margin-top: 0;">Olá ${name}! 🎯</h2>
              
              <p>Você recebeu acesso temporário ao arquivo de um produto vendido:</p>
              
              <div style="background: #F4F4F4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Produto:</strong> ${productName}</p>
                <p style="margin: 0 0 10px 0;"><strong>Comprador:</strong> ${buyerName}</p>
                <p style="margin: 0;"><strong>Válido até:</strong> ${expiresDate}</p>
              </div>
              
              <div style="background: #FFF3CD; border-left: 4px solid #FD9555; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;">
                  ⚠️ Você tem <strong>5 dias</strong> para visualizar e imprimir o arquivo. Após esse período, o acesso expira automaticamente.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #FED466; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Acessar Arquivo
                </a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Equipe A Rafa Criou
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} A Rafa Criou. Todos os direitos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar notificação de acesso:', error);
      return { success: false, error };
    }

    console.log('✅ Notificação de acesso enviada:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar notificação de acesso:', error);
    return { success: false, error };
  }
}

/**
 * Notificação para afiliado quando há uma nova venda através do seu link
 */
export async function sendAffiliateSaleNotificationEmail({
  to,
  name,
  affiliateType,
  productNames,
  orderTotal,
  currency,
  commission,
  buyerEmail,
}: {
  to: string;
  name: string;
  affiliateType: 'common' | 'commercial_license';
  productNames: string[];
  orderTotal: number;
  currency: string;
  commission?: number; // Apenas para afiliados comuns
  buyerEmail: string;
}) {
  try {
    const dashboardUrl = `${APP_URL}/afiliados-da-rafa/dashboard`;
    const isCommon = affiliateType === 'common';
    const productsText =
      productNames.length === 1 ? productNames[0] : `${productNames.length} produtos`;

    const formattedTotal = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(orderTotal);

    const formattedCommission = commission
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: currency || 'BRL',
        }).format(commission)
      : null;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `🎉 Nova Venda Através do Seu Link!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #000; margin: 0; font-size: 28px;">🎉 Nova Venda!</h1>
            </div>
            
            <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #000; margin-top: 0;">Parabéns ${name}! 🎊</h2>
              
              <p>Alguém acabou de comprar através do seu link de afiliado!</p>
              
              <div style="background: #F4F4F4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Produto(s):</strong> ${productsText}</p>
                <p style="margin: 0 0 10px 0;"><strong>Valor da venda:</strong> ${formattedTotal}</p>
                <p style="margin: 0 0 10px 0;"><strong>Comprador:</strong> ${buyerEmail}</p>
                ${
                  isCommon && formattedCommission
                    ? `<p style="margin: 0; font-size: 18px; color: #FD9555;"><strong>Sua comissão:</strong> ${formattedCommission} 💰</p>`
                    : ''
                }
              </div>
              
              ${
                isCommon
                  ? `
                  <div style="background: #D4EDDA; border-left: 4px solid #28A745; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #155724;">
                      ✅ Sua comissão foi registrada e está aguardando aprovação para pagamento.
                    </p>
                  </div>
                `
                  : `
                  <div style="background: #FFF3CD; border-left: 4px solid #FD9555; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px;">
                      📁 Como você tem <strong>Licença Comercial</strong>, você recebeu acesso temporário aos arquivos do produto. Acesse seu dashboard para visualizar!
                    </p>
                  </div>
                `
              }
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #FED466; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Ver no Dashboard
                </a>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Continue divulgando! 🚀<br>
                Equipe A Rafa Criou
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} A Rafa Criou. Todos os direitos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar notificação de venda:', error);
      return { success: false, error };
    }

    console.log('✅ Notificação de venda enviada ao afiliado:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao enviar notificação de venda:', error);
    return { success: false, error };
  }
}
