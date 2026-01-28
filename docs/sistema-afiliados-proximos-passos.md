# Sistema de Afiliados - Próximos Passos

> ⚠️ **DOCUMENTO OBSOLETO** - 18 de Dezembro de 2025
>
> 📄 **Use o novo documento**: [`sistema-afiliados-analise-completa-stripe-connect.md`](./sistema-afiliados-analise-completa-stripe-connect.md)
>
> Este documento foi substituído pela versão consolidada em 26/01/2026, que inclui:
>
> - ✅ Status atualizado de todas as implementações
> - ✅ Confirmação de migrations executadas
> - ✅ 17 rotas API documentadas
> - ✅ Análise completa do Stripe Connect
> - 🚫 Proteção contra duplicação de dados
> - ♻️ Ênfase em reutilizar o que existe

**Data**: 18 de Dezembro de 2025  
**Status da Implementação**: Fase 1 Completa (70% do sistema)

---

## ✅ O Que Foi Implementado

### 1. Estrutura de Banco de Dados

- ✅ Migration `0029_add_affiliate_system_overhaul.sql` criada
- ✅ 14 novos campos na tabela `affiliates`
- ✅ 3 novas tabelas: `affiliate_materials`, `affiliate_material_downloads`, `affiliate_file_access`
- ✅ Schema Drizzle atualizado com todas as relações
- ✅ Indexes de performance criados
- ✅ Executar a migration no banco de dados

### 2. Rotas e Páginas Públicas

- ✅ Redirect 301: `/seja-afiliado` → `/afiliados-da-rafa`
- ✅ Landing page `/afiliados-da-rafa` com comparação dos tipos
- ✅ Formulário de cadastro: `/afiliados-da-rafa/cadastro/comum`
- ✅ Formulário de cadastro: `/afiliados-da-rafa/cadastro/licenca-comercial`
- ✅ Página de aguardando aprovação
- ✅ Dashboard unificado: `/afiliados-da-rafa/dashboard`

### 3. APIs Implementadas

- ✅ `POST /api/affiliates/register/common` - Cadastro afiliado comum
- ✅ `POST /api/affiliates/register/commercial-license` - Cadastro licença comercial
- ✅ `GET /api/affiliates/me` - Dados do afiliado logado
- ✅ `GET /api/affiliates/file-access/[accessId]` - Visualizar arquivo (5 dias)
- ✅ `POST /api/affiliates/file-access/[accessId]/print` - Contador de impressões
- ✅ `GET /api/get-ip` - Obter IP para rastreamento

### 4. Componentes de Dashboard

- ✅ `CommonAffiliateDashboard` - Dashboard para afiliados comuns
- ✅ `CommercialLicenseDashboard` - Dashboard para licença comercial
- ✅ Sistema de assinatura digital (react-signature-canvas)
- ✅ Proteção de arquivos com iframe sandbox

### 5. Recursos de Segurança

- ✅ Rastreamento de IP na aceitação de termos
- ✅ Bloqueio de download nos arquivos temporários
- ✅ Contador de visualizações e impressões
- ✅ Validação com Zod em todos os formulários
- ✅ Verificação de sessão em todas as APIs

---

## 🚧 APIs Faltantes (Alta Prioridade)

### 1. API de Vendas para Afiliado Comum

**Arquivo**: `src/app/api/affiliates/sales/route.ts`

```typescript
GET / api / affiliates / sales;
```

**Deve retornar**:

- Lista de vendas (orders) com `affiliateId` do usuário logado
- Dados do cliente: nome, email, telefone
- Valor da venda e comissão
- Status do pagamento da comissão
- Joins: orders → orderItems → products

**Exemplo de query Drizzle**:

```typescript
const sales = await db
  .select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    customerName: orders.customerName,
    customerEmail: orders.customerEmail,
    customerPhone: orders.customerPhone,
    orderTotal: orders.total,
    status: affiliateCommissions.status,
    commissionAmount: affiliateCommissions.commissionAmount,
    createdAt: orders.createdAt,
  })
  .from(orders)
  .innerJoin(affiliateCommissions, eq(orders.id, affiliateCommissions.orderId))
  .where(eq(affiliateCommissions.affiliateId, affiliateId))
  .orderBy(desc(orders.createdAt));
```

---

### 2. API de Pedidos para Licença Comercial

**Arquivo**: `src/app/api/affiliates/orders/route.ts`

```typescript
GET / api / affiliates / orders;
```

**Deve retornar**:

- Pedidos vinculados ao afiliado
- Dados completos do cliente para contato
- Items do pedido
- Status e valores

**Diferença da anterior**: Esta API é para licença comercial, então não precisa de comissões, mas precisa dos items detalhados.

---

### 3. API de Materiais

**Arquivo**: `src/app/api/affiliates/materials/route.ts`

```typescript
GET / api / affiliates / materials;
```

**Deve retornar**:

- Materiais filtrados por `affiliate_type` do usuário
- Apenas materiais ativos (`isActive = true`)
- Ordenados por `displayOrder`

**Query sugerida**:

```typescript
const materials = await db
  .select()
  .from(affiliateMaterials)
  .where(
    and(
      eq(affiliateMaterials.isActive, true),
      or(
        eq(affiliateMaterials.affiliateType, affiliateType),
        eq(affiliateMaterials.affiliateType, 'both')
      )
    )
  )
  .orderBy(affiliateMaterials.displayOrder);
```

---

### 4. API de Acesso aos Arquivos

**Arquivo**: `src/app/api/affiliates/file-access/route.ts`

```typescript
GET / api / affiliates / file - access;
```

**Deve retornar**:

- Lista de acessos temporários do afiliado
- Incluir flag `expired` calculado: `new Date() > expiresAt`
- Dados do comprador e produto

---

## 🔧 Funcionalidades Pendentes

### 1. Auto-Aprovação para Afiliados Comuns

**Onde**: `src/app/api/affiliates/register/common/route.ts`

**O que falta**:

```typescript
// Após inserir o afiliado no banco:

// 1. Definir status como 'active' e autoApproved como true
status: 'active',
autoApproved: true,

// 2. Enviar email de boas-vindas
await sendAffiliateWelcomeEmail({
  to: email,
  name,
  code,
  dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/dashboard`,
});

// 3. Disparar envio automático de materiais
await sendMaterialsToAffiliate(newAffiliate.id, 'common');

// 4. Atualizar campo materialsSent
await db
  .update(affiliates)
  .set({ materialsSent: true, materialsSentAt: new Date() })
  .where(eq(affiliates.id, newAffiliate.id));
```

---

### 2. Upload e Geração de Contrato PDF

**Onde**: `src/app/api/affiliates/register/commercial-license/route.ts`

**O que falta**:

```typescript
// 1. Upload da assinatura para Cloudflare R2
const signatureUrl = await uploadToR2({
  file: Buffer.from(signatureData.split(',')[1], 'base64'),
  fileName: `signatures/${newAffiliate.id}.png`,
  contentType: 'image/png',
});

// 2. Gerar PDF do contrato com assinatura
const contractPdf = await generateContractPDF({
  affiliateName: name,
  cpfCnpj,
  signatureUrl,
  contractDate: new Date(),
});

// 3. Upload do PDF para R2
const contractUrl = await uploadToR2({
  file: contractPdf,
  fileName: `contracts/${newAffiliate.id}.pdf`,
  contentType: 'application/pdf',
});

// 4. Atualizar banco com URL do contrato
await db
  .update(affiliates)
  .set({ contractDocumentUrl: contractUrl })
  .where(eq(affiliates.id, newAffiliate.id));
```

**Bibliotecas recomendadas**:

- `@aws-sdk/client-s3` - Upload para R2
- `pdfkit` ou `@react-pdf/renderer` - Geração de PDF
- `sharp` - Processamento de imagem da assinatura

---

### 3. Sistema de Emails

**Arquivos a criar**:

- `src/lib/email/templates/affiliate-welcome.tsx`
- `src/lib/email/templates/affiliate-pending-approval.tsx`
- `src/lib/email/templates/affiliate-approved.tsx`
- `src/lib/email/templates/admin-new-affiliate-request.tsx`

**Exemplo de template**:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAffiliateWelcomeEmail({
  to,
  name,
  code,
  dashboardUrl,
}: {
  to: string;
  name: string;
  code: string;
  dashboardUrl: string;
}) {
  await resend.emails.send({
    from: 'A Rafa Criou <afiliados@arafacriou.com>',
    to,
    subject: 'Bem-vindo ao Programa de Afiliados! 🎉',
    html: `
      <h1>Olá ${name}!</h1>
      <p>Sua conta de afiliado foi aprovada!</p>
      <p>Seu código de afiliado: <strong>${code}</strong></p>
      <p><a href="${dashboardUrl}">Acessar Dashboard</a></p>
    `,
  });
}
```

---

## 🎨 Painel Administrativo

### 1. Página de Gestão de Afiliados

**Arquivo**: `src/app/admin/afiliados/gestao/page.tsx`

**Funcionalidades necessárias**:

- ✅ Já existe: `/admin/afiliados/page.tsx` (lista básica)
- ❌ Falta: Filtro por `affiliate_type`
- ❌ Falta: Ações de aprovar/rejeitar licenças comerciais
- ❌ Falta: Visualizar termos aceitos (IP, data, hora)
- ❌ Falta: Visualizar contrato assinado (PDF)
- ❌ Falta: Reenviar materiais manualmente

**UI sugerida**:

```typescript
// Tabs para separar tipos
<Tabs>
  <TabsList>
    <TabsTrigger value="common">Afiliados Comuns</TabsTrigger>
    <TabsTrigger value="commercial">Licença Comercial</TabsTrigger>
    <TabsTrigger value="pending">Aguardando Aprovação</TabsTrigger>
  </TabsList>
</Tabs>

// Table com ações
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Tipo</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Data Cadastro</TableHead>
      <TableHead>Ações</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {affiliates.map(affiliate => (
      <TableRow key={affiliate.id}>
        <TableCell>{affiliate.name}</TableCell>
        <TableCell>{affiliate.email}</TableCell>
        <TableCell>
          <Badge>{affiliate.affiliateType}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={affiliate.status === 'active' ? 'success' : 'secondary'}>
            {affiliate.status}
          </Badge>
        </TableCell>
        <TableCell>{formatDate(affiliate.createdAt)}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuContent>
              {affiliate.affiliateType === 'commercial_license' &&
               affiliate.status === 'inactive' && (
                <>
                  <DropdownMenuItem onClick={() => approveAffiliate(affiliate.id)}>
                    Aprovar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => rejectAffiliate(affiliate.id)}>
                    Rejeitar
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => viewTerms(affiliate.id)}>
                Ver Termos Aceitos
              </DropdownMenuItem>
              {affiliate.contractDocumentUrl && (
                <DropdownMenuItem onClick={() => viewContract(affiliate.contractDocumentUrl)}>
                  Ver Contrato
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => resendMaterials(affiliate.id)}>
                Reenviar Materiais
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### 2. APIs Admin Necessárias

#### a) Aprovar/Rejeitar Licença Comercial

**Arquivo**: `src/app/api/admin/affiliates/[id]/approve/route.ts`

```typescript
POST / api / admin / affiliates / [id] / approve;
PUT / api / admin / affiliates / [id] / reject;

// Aprovar
await db
  .update(affiliates)
  .set({
    status: 'active',
    approvedBy: adminUserId,
    approvedAt: new Date(),
  })
  .where(eq(affiliates.id, affiliateId));

// Enviar email de aprovação
await sendAffiliateApprovedEmail(affiliate);

// Enviar materiais automaticamente
await sendMaterialsToAffiliate(affiliateId, 'commercial_license');
```

#### b) Ver Detalhes de Termos Aceitos

**Arquivo**: `src/app/api/admin/affiliates/[id]/terms/route.ts`

```typescript
GET /api/admin/affiliates/[id]/terms

// Retornar:
{
  termsAccepted: true,
  termsAcceptedAt: "2025-12-18T10:30:00Z",
  termsIp: "192.168.1.1",
  contractSigned: true,
  contractSignedAt: "2025-12-18T10:35:00Z",
  contractDocumentUrl: "https://...",
}
```

#### c) Reenviar Materiais

**Arquivo**: `src/app/api/admin/affiliates/[id]/resend-materials/route.ts`

```typescript
POST / api / admin / affiliates / [id] / resend - materials;

// Buscar materiais do tipo do afiliado
// Enviar por email
// Registrar em affiliate_material_downloads
```

---

### 3. Gestão de Materiais

**Arquivo**: `src/app/admin/afiliados/materiais/page.tsx`

**Funcionalidades**:

- ❌ CRUD completo de materiais
- ❌ Upload de arquivos (ZIP, PDF, imagens)
- ❌ Filtro por tipo (comum, comercial, ambos)
- ❌ Ordenação drag-and-drop (displayOrder)
- ❌ Ativar/desativar materiais

**APIs necessárias**:

```typescript
GET / api / admin / affiliates / materials; // Listar todos
POST / api / admin / affiliates / materials; // Criar novo
PUT / api / admin / affiliates / materials / [id]; // Editar
DELETE / api / admin / affiliates / materials / [id]; // Deletar
POST / api / admin / affiliates / materials / upload; // Upload de arquivo
```

**Estrutura do formulário**:

```typescript
{
  title: string; // "Kit de Banners para Instagram"
  description: string | null; // "10 templates editáveis"
  fileUrl: string; // URL do R2
  fileName: string; // "banners-instagram.zip"
  fileType: string; // "zip"
  fileSize: number; // bytes
  affiliateType: 'common' | 'commercial_license' | 'both';
  isActive: boolean;
  displayOrder: number;
}
```

---

## 🔄 Integrações Necessárias

### 1. Cloudflare R2 (Storage)

**Arquivo**: `src/lib/storage/r2.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2({
  file,
  fileName,
  contentType,
}: {
  file: Buffer;
  fileName: string;
  contentType: string;
}) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${fileName}`;
}

export async function getSignedR2Url(fileName: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileName,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}
```

**Variáveis de ambiente necessárias**:

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=a-rafa-criou
R2_PUBLIC_URL=https://files.arafacriou.com
```

---

### 2. Concessão Automática de Acesso aos Arquivos

**Onde**: Webhook ou job após pagamento confirmado

**Lógica**:

```typescript
// Quando um pedido é pago (order.status = 'paid')
// E tem affiliateId do tipo 'commercial_license'

async function grantFileAccessToCommercialAffiliate(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        with: {
          product: true,
        },
      },
      affiliate: true,
    },
  });

  if (!order?.affiliate || order.affiliate.affiliateType !== 'commercial_license') {
    return;
  }

  // Para cada produto do pedido
  for (const item of order.items) {
    // Buscar arquivo do produto
    const productFile = await db.query.productFiles.findFirst({
      where: eq(productFiles.productId, item.productId),
    });

    if (productFile) {
      // Conceder acesso por 5 dias
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);

      await db.insert(affiliateFileAccess).values({
        affiliateId: order.affiliateId,
        orderId: order.id,
        productId: item.productId,
        fileUrl: productFile.url,
        grantedAt: new Date(),
        expiresAt,
        buyerName: order.customerName,
        buyerEmail: order.customerEmail,
        buyerPhone: order.customerPhone,
        isActive: true,
      });
    }
  }

  // Notificar afiliado por email
  await sendFileAccessGrantedEmail(order.affiliate, order);
}
```

---

## 📊 Dashboard de Estatísticas Admin

### Métricas a Adicionar

**Onde**: `src/app/admin/page.tsx` ou nova página de stats

```typescript
// Estatísticas de afiliados
const affiliateStats = {
  totalAffiliates: 150,
  activeAffiliates: 120,
  pendingApproval: 5,
  commonAffiliates: 100,
  commercialLicenseAffiliates: 20,

  // Desempenho
  totalCommissionsPaid: 15000.0,
  pendingCommissions: 2500.0,
  totalOrdersThroughAffiliates: 450,

  // Top performers
  topAffiliates: [
    { name: 'João Silva', totalRevenue: 5000, orders: 50 },
    { name: 'Maria Santos', totalRevenue: 4500, orders: 45 },
  ],
};
```

---

## 🧪 Testes Necessários

### 1. Fluxo Completo - Afiliado Comum

- [ ] Cadastro com PIX válido
- [ ] Auto-aprovação imediata
- [ ] Recebimento de email de boas-vindas
- [ ] Recebimento de materiais
- [ ] Acesso ao dashboard
- [ ] Visualização de vendas
- [ ] Download de materiais

### 2. Fluxo Completo - Licença Comercial

- [ ] Cadastro com assinatura digital
- [ ] Geração de PDF do contrato
- [ ] Envio para aprovação manual
- [ ] Admin aprova a solicitação
- [ ] Afiliado recebe email de aprovação
- [ ] Acesso ao dashboard
- [ ] Realiza uma venda
- [ ] Recebe acesso temporário ao arquivo (5 dias)
- [ ] Visualiza arquivo (sem download)
- [ ] Imprime arquivo
- [ ] Acesso expira após 5 dias

### 3. Testes de Segurança

- [ ] Tentar acessar arquivo de outro afiliado
- [ ] Tentar fazer download de arquivo protegido
- [ ] Tentar acessar arquivo expirado
- [ ] Verificar se IP está sendo registrado corretamente
- [ ] Validar assinatura digital no PDF

---

## 📦 Pacotes a Instalar

```bash
# Upload para R2 (compatível com S3)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Geração de PDF
npm install pdfkit @types/pdfkit
# ou
npm install @react-pdf/renderer

# Processamento de imagens
npm install sharp

# Emails (se ainda não tiver)
npm install resend
# ou
npm install nodemailer @types/nodemailer

# UUID (se não estiver usando nanoid)
npm install uuid @types/uuid
```

---

## 🗄️ Executar Migration

```bash
# 1. Verificar conexão com banco
npm run db:studio

# 2. Executar migration
npx drizzle-kit push

# ou se preferir executar o SQL manualmente:
# Copiar o conteúdo de drizzle/0029_add_affiliate_system_overhaul.sql
# E executar no banco de dados PostgreSQL
```

---

## 📝 Checklist de Implementação

### Fase 2 - APIs Críticas (2-3 dias)

- [ ] API `/api/affiliates/sales` - Vendas do afiliado comum
- [ ] API `/api/affiliates/orders` - Pedidos da licença comercial
- [ ] API `/api/affiliates/materials` - Materiais por tipo
- [ ] API `/api/affiliates/file-access` - Lista de acessos temporários

### Fase 3 - Auto-Aprovação e Emails (2 dias)

- [ ] Implementar auto-aprovação para afiliados comuns
- [ ] Setup de email (Resend ou Nodemailer)
- [ ] Template: Boas-vindas afiliado comum
- [ ] Template: Confirmação recebimento licença comercial
- [ ] Template: Aprovação licença comercial
- [ ] Template: Notificação admin nova solicitação
- [ ] Template: Acesso aos arquivos concedido

### Fase 4 - Upload e PDFs (3 dias)

- [ ] Configurar Cloudflare R2
- [ ] Implementar upload de assinatura
- [ ] Implementar geração de PDF do contrato
- [ ] Implementar upload de materiais

### Fase 5 - Painel Admin (3-4 dias)

- [ ] Página de gestão de afiliados
- [ ] API de aprovar/rejeitar licença comercial
- [ ] API de visualizar termos aceitos
- [ ] API de reenviar materiais
- [ ] Página de gestão de materiais (CRUD)
- [ ] Upload de materiais no admin

### Fase 6 - Automações (2 dias)

- [ ] Job/webhook para conceder acesso aos arquivos após venda
- [ ] Envio automático de materiais na aprovação
- [ ] Cron job para limpar acessos expirados
- [ ] Notificações por email em cada etapa

### Fase 7 - Testes e Ajustes (2-3 dias)

- [ ] Testar fluxo completo afiliado comum
- [ ] Testar fluxo completo licença comercial
- [ ] Testar proteções de segurança
- [ ] Testar emails
- [ ] Ajustar UI/UX conforme feedback
- [ ] Documentação final

---

## 🚀 Estimativa Total

**Fase 1 (Completa)**: ✅ 8 dias  
**Fase 2 a 7 (Restantes)**: 14-18 dias

**Total do projeto**: 22-26 dias de desenvolvimento

---

## 💡 Melhorias Futuras (Backlog)

- [ ] Analytics detalhado de cliques nos links de afiliados
- [ ] Sistema de níveis de afiliados (bronze, prata, ouro)
- [ ] Pagamento automático de comissões via PIX
- [ ] Geração de relatórios mensais para afiliados
- [ ] Sistema de disputas para comissões
- [ ] Integração com WhatsApp Business API
- [ ] Chat interno entre admin e afiliados
- [ ] Gamificação (badges, conquistas)
- [ ] Programa de indicação entre afiliados
- [ ] API pública para parceiros

---

## 📚 Documentação Adicional Necessária

1. **Manual do Afiliado** - Guia de como usar o sistema
2. **FAQ para Afiliados** - Perguntas frequentes
3. **Política de Comissões** - Regras claras
4. **Termos de Uso Completos** - Legal
5. **Manual de Aprovação** - Para admin
6. **Troubleshooting** - Problemas comuns

---

## ⚠️ Atenção

### Antes de ir para produção:

1. **Executar a migration** no banco de produção
2. **Configurar variáveis de ambiente** do R2
3. **Testar emails** em ambiente de staging
4. **Revisar todos os termos** jurídicos com advogado
5. **Configurar rate limiting** nas APIs de cadastro
6. **Setup de monitoring** (Sentry, LogRocket)
7. **Backup do banco** antes de qualquer mudança

---

**Criado por**: GitHub Copilot  
**Última atualização**: 18/12/2025
