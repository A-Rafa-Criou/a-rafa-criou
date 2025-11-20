/**
 * Script para testar notificação de venda ao admin
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { render } from '@react-email/render';
import AdminSaleNotification from '@/emails/admin-sale-notification';
import { sendEmailViaGmail } from '@/lib/notifications/channels/email-gmail';

async function testAdminNotification() {
  console.log('\n🔍 Buscando admins no banco...\n');

  // Buscar todos os usuários com role='admin'
  const adminUsers = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.role, 'admin'));

  console.log(`✅ Encontrado(s) ${adminUsers.length} admin(s):\n`);
  adminUsers.forEach((admin: { id: string; email: string; name: string | null; role: string }) => {
    console.log(`  - ID: ${admin.id}`);
    console.log(`  - Nome: ${admin.name || 'N/A'}`);
    console.log(`  - Email: ${admin.email}`);
    console.log(`  - Role: ${admin.role}\n`);
  });

  if (adminUsers.length === 0) {
    console.warn('⚠️ Nenhum admin encontrado. Crie um usuário com role="admin" primeiro.');
    return;
  }

  // Renderizar email de teste
  console.log('📧 Renderizando email de teste...\n');

  const emailHtml = await render(
    AdminSaleNotification({
      customerName: 'João Silva (TESTE)',
      customerEmail: 'joao.silva@example.com',
      orderId: 'test-' + Date.now(),
      orderTotal: 'R$ 149,90',
      orderItems: [
        { name: 'PDF de Teste 1', quantity: 1, price: 'R$ 99,90' },
        { name: 'PDF de Teste 2', quantity: 1, price: 'R$ 50,00' },
      ],
      orderDate: new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    })
  );

  console.log('✅ Email renderizado com sucesso\n');

  // Enviar email para TODOS os admins
  console.log('📤 Enviando emails para admins...\n');

  const emailPromises = adminUsers.map((admin: { email: string; name: string | null }) =>
    sendEmailViaGmail({
      to: admin.email,
      subject: '🛒 Nova Venda (TESTE) - João Silva - R$ 149,90',
      html: emailHtml,
      metadata: { tags: ['admin', 'venda', 'teste'] },
    })
      .then(() => {
        console.log(`  ✅ Email enviado para ${admin.email}`);
      })
      .catch((error: unknown) => {
        console.error(`  ❌ Erro ao enviar email para ${admin.email}:`, error);
      })
  );

  await Promise.allSettled(emailPromises);

  console.log('\n✅ Teste concluído!\n');
}

testAdminNotification().catch(console.error);
